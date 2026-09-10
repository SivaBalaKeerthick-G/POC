"""
Document Service API routes — with transactional PostgreSQL ↔ ChromaDB sync.

Upload guarantee:
  - Doc row created in PG (status=Processing)
  - Chunks extracted, embedded, written to ChromaDB
  - Chunk rows written to PG, doc status → Indexed
  - If ChromaDB write fails  → ChromaDB rollback + PG rollback + file deleted
  - If PG chunk write fails  → ChromaDB rollback + PG rollback + file deleted
  → Either both stores have the data, or neither does.

Delete guarantee:
  - ChromaDB vectors deleted first
  - PG document+chunks deleted (CASCADE)
  - If ChromaDB delete fails → PG NOT deleted, error returned (data stays in sync)
"""
import logging
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.db.postgres import Chunk, Document, get_db
from shared.models.document import DocumentFile, VectorChunk
from services.document_service.core.chunker import SUPPORTED_TYPES, chunk_document
from services.document_service.core.embedder import embed_texts
from services.document_service.core.indexer import add_to_chroma, delete_from_chroma, get_chunks_from_chroma
from shared.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


def _fmt_doc(doc: Document) -> DocumentFile:
    updated = doc.updated_at or doc.created_at
    return DocumentFile(
        id=str(doc.id),
        name=doc.name,
        size=doc.file_size,
        category=doc.category,
        chunksCount=doc.chunks_count,
        status=doc.status,
        lastUpdated=updated.strftime("%b %d, %Y") if isinstance(updated, datetime) else str(updated),
    )


# ── LIST ──────────────────────────────────────────────────────────────────────

@router.get("/documents", response_model=list[DocumentFile], tags=["documents"])
async def list_documents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).order_by(Document.created_at.desc()))
    return [_fmt_doc(d) for d in result.scalars().all()]


# ── UPLOAD (with transactional sync) ─────────────────────────────────────────

@router.post("/documents/upload", response_model=DocumentFile, status_code=201, tags=["documents"])
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Full pipeline: receive → validate → save → chunk → embed → ChromaDB → PostgreSQL.
    Fully transactional: both stores updated atomically or not at all.
    """
    # ── Validate ──────────────────────────────────────────────────────────────
    if file.content_type not in SUPPORTED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{file.content_type}'. "
                "Accepted: PDF, DOCX, TXT, XLSX, XLS."
            ),
        )

    raw = await file.read()
    size_bytes = len(raw)
    if size_bytes / (1024 * 1024) > settings.MAX_UPLOAD_SIZE_MB:
        raise HTTPException(status_code=413, detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB} MB.")

    # ── Save file to disk ─────────────────────────────────────────────────────
    safe_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as f:
        f.write(raw)

    # ── Phase 1: Create PG document row ───────────────────────────────────────
    doc = Document(
        name=file.filename,
        original_filename=file.filename,
        file_size=_fmt_size(size_bytes),
        category=category,
        status="Processing",
        chunks_count=0,
    )
    db.add(doc)
    await db.flush()  # get doc.id before commit

    chroma_ids_written: list[str] = []

    try:
        # ── Phase 2: Extract text and chunk ───────────────────────────────────
        chunks = chunk_document(file_path, file.content_type)
        if not chunks:
            raise ValueError("No text could be extracted from the document.")

        texts = [c["text"] for c in chunks]

        # ── Phase 3: Generate embeddings (Gemini gemini-embedding-2) ──────────
        embeddings = await embed_texts(texts)

        # ── Phase 4: Write to ChromaDB (vector store) ─────────────────────────
        chroma_ids = [str(uuid.uuid4()) for _ in chunks]
        metadatas = [
            {
                "document_id": str(doc.id),
                "chunk_index": i,
                "filename": file.filename,
                "category": category,
            }
            for i in range(len(chunks))
        ]
        add_to_chroma(
            ids=chroma_ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas,
        )
        chroma_ids_written = chroma_ids  # track for rollback

        # ── Phase 5: Write chunk rows to PostgreSQL ───────────────────────────
        db.add_all([
            Chunk(
                document_id=doc.id,
                chunk_index=i,
                text=chunk["text"],
                tokens=chunk["tokens"],
                chroma_id=cid,
            )
            for i, (chunk, cid) in enumerate(zip(chunks, chroma_ids))
        ])

        # ── Phase 6: Mark document as Indexed ─────────────────────────────────
        doc.status = "Indexed"
        doc.chunks_count = len(chunks)
        doc.updated_at = datetime.utcnow()
        # PG commit happens when get_db() context manager exits

        logger.info(
            "Indexed '%s': %d chunks, %d tokens avg",
            file.filename, len(chunks),
            sum(c["tokens"] for c in chunks) // len(chunks),
        )

    except Exception as exc:
        # ── ROLLBACK: remove ChromaDB vectors written in this request ──────────
        if chroma_ids_written:
            try:
                delete_from_chroma(chroma_ids_written)
                logger.info("Rolled back %d ChromaDB vectors for failed upload.", len(chroma_ids_written))
            except Exception as chroma_err:
                logger.error("ChromaDB rollback also failed: %s", chroma_err)

        # ── Remove uploaded file ───────────────────────────────────────────────
        try:
            os.remove(file_path)
        except OSError:
            pass

        # PG rollback happens automatically when get_db() catches the exception
        raise HTTPException(status_code=500, detail=f"Upload failed: {exc}")

    return _fmt_doc(doc)


# ── DELETE (with sync guarantee) ─────────────────────────────────────────────

@router.delete("/documents/{doc_id}", status_code=204, tags=["documents"])
async def delete_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    """
    Delete-order: ChromaDB first → PostgreSQL.
    If ChromaDB deletion fails, the PG record is NOT deleted (stores stay in sync).
    """
    doc_uuid = _parse_uuid(doc_id)

    # Verify document exists
    doc_result = await db.execute(select(Document).where(Document.id == doc_uuid))
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Collect chroma IDs from PG (before deleting)
    chunk_result = await db.execute(
        select(Chunk.chroma_id).where(Chunk.document_id == doc_uuid)
    )
    chroma_ids = [row[0] for row in chunk_result.all() if row[0]]

    # ── Step 1: Delete vectors from ChromaDB ──────────────────────────────────
    if chroma_ids:
        try:
            delete_from_chroma(chroma_ids)
            logger.info("Deleted %d ChromaDB vectors for document %s", len(chroma_ids), doc_id)
        except Exception as chroma_err:
            # ChromaDB failed — do NOT delete PG record to keep stores in sync
            logger.error("ChromaDB delete failed for doc %s: %s", doc_id, chroma_err)
            raise HTTPException(
                status_code=500,
                detail=f"Vector store deletion failed. Document not deleted to maintain sync. Error: {chroma_err}",
            )

    # ── Step 2: Delete from PostgreSQL (CASCADE deletes chunks too) ───────────
    await db.execute(delete(Document).where(Document.id == doc_uuid))
    logger.info("Deleted document %s ('%s') from PostgreSQL.", doc_id, doc.name)


# ── REINDEX (replace all vectors atomically) ──────────────────────────────────

@router.post("/documents/{doc_id}/reindex", response_model=DocumentFile, tags=["documents"])
async def reindex_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    """
    Re-embed and re-index a document.
    Old vectors are deleted from both stores before new ones are created.
    """
    doc_uuid = _parse_uuid(doc_id)
    doc_result = await db.execute(select(Document).where(Document.id == doc_uuid))
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # ── Remove old vectors ────────────────────────────────────────────────────
    old_chunks_result = await db.execute(select(Chunk).where(Chunk.document_id == doc_uuid))
    old_chunks = old_chunks_result.scalars().all()
    old_chroma_ids = [c.chroma_id for c in old_chunks if c.chroma_id]

    if old_chroma_ids:
        try:
            delete_from_chroma(old_chroma_ids)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not clear old vectors: {e}")

    await db.execute(delete(Chunk).where(Chunk.document_id == doc_uuid))

    # ── Find original file ────────────────────────────────────────────────────
    file_path = _find_upload(doc.original_filename)
    if not file_path:
        raise HTTPException(status_code=404, detail="Original file not found on disk. Please re-upload.")

    doc.status = "Processing"
    await db.flush()

    chroma_ids_written: list[str] = []

    try:
        content_type = _guess_content_type(doc.original_filename)
        chunks = chunk_document(file_path, content_type)
        texts = [c["text"] for c in chunks]
        embeddings = await embed_texts(texts)

        chroma_ids = [str(uuid.uuid4()) for _ in chunks]
        add_to_chroma(
            ids=chroma_ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=[
                {"document_id": str(doc.id), "chunk_index": i, "filename": doc.original_filename}
                for i in range(len(chunks))
            ],
        )
        chroma_ids_written = chroma_ids

        db.add_all([
            Chunk(document_id=doc.id, chunk_index=i, text=c["text"], tokens=c["tokens"], chroma_id=cid)
            for i, (c, cid) in enumerate(zip(chunks, chroma_ids))
        ])
        doc.status = "Indexed"
        doc.chunks_count = len(chunks)
        doc.updated_at = datetime.utcnow()

    except Exception as exc:
        if chroma_ids_written:
            try:
                delete_from_chroma(chroma_ids_written)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Reindex failed: {exc}")

    return _fmt_doc(doc)


# ── CHUNKS ────────────────────────────────────────────────────────────────────

@router.get("/documents/{doc_id}/chunks", response_model=list[VectorChunk], tags=["documents"])
async def get_chunks(doc_id: str, db: AsyncSession = Depends(get_db)):
    doc_uuid = _parse_uuid(doc_id)
    result = await db.execute(
        select(Chunk).where(Chunk.document_id == doc_uuid).order_by(Chunk.chunk_index)
    )
    chunks = result.scalars().all()
    scored = get_chunks_from_chroma([c.chroma_id for c in chunks if c.chroma_id])
    score_map = {item["id"]: item["score"] for item in scored}

    return [
        VectorChunk(
            id=str(c.id),
            chunkIndex=c.chunk_index,
            score=score_map.get(c.chroma_id, "N/A"),
            tokens=c.tokens,
            textExcerpt=c.text[:300] + ("..." if len(c.text) > 300 else ""),
        )
        for c in chunks
    ]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_uuid(val: str):
    try:
        return uuid.UUID(val)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format.")


def _fmt_size(bytes_: int) -> str:
    for unit in ["Bytes", "KB", "MB", "GB"]:
        if bytes_ < 1024:
            return f"{bytes_:.1f} {unit}"
        bytes_ /= 1024
    return f"{bytes_:.1f} GB"


def _find_upload(filename: str) -> str | None:
    """Find a previously uploaded file by its original filename suffix."""
    try:
        for f in os.listdir(settings.UPLOAD_DIR):
            if f.endswith(filename):
                return os.path.join(settings.UPLOAD_DIR, f)
    except OSError:
        pass
    return None


def _guess_content_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower()
    return {
        "pdf":  "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "txt":  "text/plain",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "xls":  "application/vnd.ms-excel",
    }.get(ext, "text/plain")

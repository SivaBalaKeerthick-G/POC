"""
LangChain Chroma vector store indexing helpers for the document service.
Uses langchain_chroma.Chroma with the persistent client.
"""
from functools import lru_cache
from langchain_chroma import Chroma
from shared.db.chroma import COLLECTION_NAME, get_chroma_client
from services.document_service.core.embedder import get_embeddings_model


@lru_cache
def get_vector_store() -> Chroma:
    """Returns singleton LangChain Chroma vector store instance."""
    return Chroma(
        client=get_chroma_client(),
        collection_name=COLLECTION_NAME,
        embedding_function=get_embeddings_model(),
    )


def add_to_chroma(
    ids: list[str],
    embeddings: list[list[float]],
    documents: list[str],
    metadatas: list[dict],
) -> None:
    """Add documents with precomputed embeddings to Chroma via LangChain store."""
    store = get_vector_store()
    store._collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )


def delete_from_chroma(ids: list[str]) -> None:
    """Delete documents by ID from Chroma via LangChain store."""
    if not ids:
        return
    store = get_vector_store()
    store.delete(ids=ids)


def get_chunks_from_chroma(ids: list[str]) -> list[dict]:
    """Retrieve chunk documents by ID for the inspector drawer."""
    if not ids:
        return []
    store = get_vector_store()
    result = store.get(ids=ids)
    return [
        {"id": id_, "score": "N/A"}
        for id_ in result.get("ids", [])
    ]

"""Shared Pydantic API models for documents — matches Angular DocumentFile interface."""
from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DocumentStatus(str, Enum):
    indexed = "Indexed"
    processing = "Processing"


# ── API Response Models (camelCase to match Angular) ─────────────────────────

class DocumentFile(BaseModel):
    """Returned to the frontend — mirrors Angular DocumentFile interface."""
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    size: str
    category: str
    chunksCount: int
    status: DocumentStatus
    lastUpdated: str


class VectorChunk(BaseModel):
    """A single vector chunk returned to the chunk inspector drawer."""
    id: str
    chunkIndex: int
    score: str
    tokens: int
    textExcerpt: str


class DashboardMetrics(BaseModel):
    """Dashboard stat cards data."""
    vectorChunks: int
    monthlyQueries: int
    groundingRate: str
    avgLatencyMs: float


# ── Internal DB Models (snake_case) ──────────────────────────────────────────

class DocumentCreate(BaseModel):
    name: str
    original_filename: str
    file_size: str
    category: str


class DocumentUpdate(BaseModel):
    status: DocumentStatus | None = None
    chunks_count: int | None = None


class ChunkCreate(BaseModel):
    document_id: UUID
    chunk_index: int
    text: str
    tokens: int
    chroma_id: str

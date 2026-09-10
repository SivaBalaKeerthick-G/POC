"""
Metrics Service API route: GET /api/metrics

Aggregates live stats from PostgreSQL:
  - vectorChunks:    total chunks across all indexed documents
  - monthlyQueries:  query count in the last 30 days
  - groundingRate:   % of queries judged PASS by the LLM-as-Judge
  - avgLatencyMs:    average RAG latency (ms) in the last 30 days
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.db.postgres import Chunk, Document, QueryLog, get_db
from shared.models.document import DashboardMetrics

router = APIRouter()


@router.get("/metrics", response_model=DashboardMetrics, tags=["metrics"])
async def get_metrics(db: AsyncSession = Depends(get_db)):
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    # Total vector chunks across all indexed documents
    chunks_result = await db.execute(select(func.count(Chunk.id)))
    total_chunks = chunks_result.scalar() or 0

    # Monthly query count
    monthly_result = await db.execute(
        select(func.count(QueryLog.id)).where(QueryLog.created_at >= thirty_days_ago)
    )
    monthly_queries = monthly_result.scalar() or 0

    # Grounding rate = PASS verdicts / total judged (in last 30 days)
    judged_result = await db.execute(
        select(func.count(QueryLog.id)).where(
            QueryLog.judge_verdict.isnot(None),
            QueryLog.created_at >= thirty_days_ago,
        )
    )
    pass_result = await db.execute(
        select(func.count(QueryLog.id)).where(
            QueryLog.judge_verdict == "PASS",
            QueryLog.created_at >= thirty_days_ago,
        )
    )
    total_judged = judged_result.scalar() or 0
    total_pass = pass_result.scalar() or 0
    grounding_rate = (
        f"{(total_pass / total_judged * 100):.1f}%" if total_judged > 0 else "N/A"
    )

    # Average RAG latency
    latency_result = await db.execute(
        select(func.avg(QueryLog.latency_ms)).where(
            QueryLog.latency_ms.isnot(None),
            QueryLog.created_at >= thirty_days_ago,
        )
    )
    avg_latency = latency_result.scalar() or 0.0

    return DashboardMetrics(
        vectorChunks=total_chunks,
        monthlyQueries=monthly_queries,
        groundingRate=grounding_rate,
        avgLatencyMs=round(avg_latency, 1),
    )

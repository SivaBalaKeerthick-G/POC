"""
LangChain Gemini cross-encoder reranker.
Scores candidate chunk passages using an LCEL chain with ChatGoogleGenerativeAI.
"""
import asyncio
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

from shared.config import settings


class PassageScore(BaseModel):
    score: float = Field(description="Relevance score from 0.0 to 1.0")


_parser = JsonOutputParser(pydantic_object=PassageScore)

_prompt = PromptTemplate(
    template=(
        "Score the relevance of the following passage to the query on a scale from 0.0 to 1.0.\n"
        "{format_instructions}\n\n"
        "QUERY: {query}\n\n"
        "PASSAGE:\n{passage}\n"
    ),
    input_variables=["query", "passage"],
    partial_variables={"format_instructions": _parser.get_format_instructions()},
)


def _get_reranker_chain():
    model = ChatGoogleGenerativeAI(
        model=settings.GEMINI_GENERATION_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.0,
        max_output_tokens=64,
    )
    return _prompt | model | _parser


async def _score_chunk(chain, query: str, chunk: dict) -> tuple[dict, float]:
    try:
        result = await chain.ainvoke({
            "query": query,
            "passage": chunk["text"][:800],
        })
        score = float(result.get("score", 0.0))
    except Exception:
        score = chunk.get("rrf_score", 0.0)
    return chunk, score


async def rerank_chunks(query: str, chunks: list[dict]) -> list[dict]:
    """Rerank candidate chunks using LangChain Gemini chain."""
    if not chunks:
        return []

    chain = _get_reranker_chain()
    tasks = [_score_chunk(chain, query, chunk) for chunk in chunks]
    scored = await asyncio.gather(*tasks)

    sorted_chunks = sorted(scored, key=lambda x: x[1], reverse=True)
    for chunk, score in sorted_chunks:
        chunk["rerank_score"] = score

    return [chunk for chunk, _ in sorted_chunks]

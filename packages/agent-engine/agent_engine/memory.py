from __future__ import annotations

import re

from .db import get_pool, to_vector_literal
from .prompts import IMPORTANCE
from .providers import get_embedding_provider, get_llm_provider
from .schemas import Memory, MemoryType

_NUM = re.compile(r"\d+")


async def score_importance(content: str) -> int:
    """LLM rates 1-10. Anything unparseable falls back to 5 rather than raising -
    a bad score degrades ranking; a raise loses the memory."""
    llm = get_llm_provider()
    raw = await llm.complete(
        IMPORTANCE.format(content=content), max_tokens=8, temperature=0.0
    )
    match = _NUM.search(raw or "")
    if not match:
        return 5
    return max(1, min(10, int(match.group())))


async def create_memory(
    agent_id: int,
    content: str,
    memory_type: MemoryType | str = MemoryType.observation,
    *,
    importance_score: int | None = None,
) -> Memory:
    """Embed, score, store. importance_score short-circuits the LLM call (used when
    reflect() already knows a reflection is inherently high-importance)."""
    content = content.strip()
    if not content:
        raise ValueError("memory content is empty")

    memory_type = MemoryType(memory_type)
    embeddings = get_embedding_provider()

    vector = (await embeddings.embed([content]))[0]
    if importance_score is None:
        importance_score = await score_importance(content)

    pool = await get_pool()
    row = await pool.fetchrow(
        """
        INSERT INTO memories (agent_id, content, embedding, importance_score, memory_type)
        VALUES ($1, $2, $3::vector, $4, $5)
        RETURNING id, agent_id, content, importance_score, memory_type, created_at
        """,
        agent_id,
        content,
        to_vector_literal(vector),
        importance_score,
        memory_type.value,
    )
    return Memory(**dict(row))


async def create_memories(
    agent_id: int, contents: list[str], memory_type: MemoryType | str = MemoryType.observation
) -> list[Memory]:
    """Batch path for the interview flow: one embedding request, importance scored
    concurrently."""
    import asyncio

    contents = [c.strip() for c in contents if c and c.strip()]
    if not contents:
        return []

    memory_type = MemoryType(memory_type)
    embeddings = get_embedding_provider()
    vectors, scores = await asyncio.gather(
        embeddings.embed(contents),
        asyncio.gather(*(score_importance(c) for c in contents)),
    )

    pool = await get_pool()
    rows = []
    async with pool.acquire() as conn, conn.transaction():
        for content, vector, score in zip(contents, vectors, scores):
            rows.append(
                await conn.fetchrow(
                    """
                    INSERT INTO memories
                        (agent_id, content, embedding, importance_score, memory_type)
                    VALUES ($1, $2, $3::vector, $4, $5)
                    RETURNING id, agent_id, content, importance_score, memory_type,
                              created_at
                    """,
                    agent_id,
                    content,
                    to_vector_literal(vector),
                    score,
                    memory_type.value,
                )
            )
    return [Memory(**dict(r)) for r in rows]

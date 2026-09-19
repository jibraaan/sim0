from __future__ import annotations

from .config import settings
from .db import get_pool, to_vector_literal
from .providers import get_embedding_provider
from .schemas import Memory, ScoredMemory

# Over-fetch by ANN, then rescore in SQL. ivfflat is approximate, so asking for exactly k
# and then reweighting would drop memories that win on recency or importance.
CANDIDATE_MULTIPLIER = 8
CANDIDATE_FLOOR = 100

_SQL = """
WITH candidates AS (
    SELECT id, agent_id, content, importance_score, memory_type, created_at,
           1 - (embedding <=> $2::vector) AS similarity,
           EXTRACT(EPOCH FROM (now() - created_at)) / 3600.0 AS hours_old
    FROM memories
    WHERE agent_id = $1 AND embedding IS NOT NULL
    ORDER BY embedding <=> $2::vector
    LIMIT $3
)
SELECT id, agent_id, content, importance_score, memory_type, created_at,
       similarity,
       pow($4, hours_old)                AS recency,
       importance_score / 10.0           AS importance,
       $5 * similarity
         + $6 * pow($4, hours_old)
         + $7 * (importance_score / 10.0) AS score
FROM candidates
ORDER BY score DESC
LIMIT $8
"""


async def retrieve_memories(
    agent_id: int, query: str, k: int = 10, *, memory_types: list[str] | None = None
) -> list[ScoredMemory]:
    """Weighted sum of cosine similarity, exponential recency decay, and stored
    importance - the Generative Agents retrieval function.

    recency = decay ** hours_old, so RECENCY_DECAY=0.995 halves a memory's recency
    contribution roughly every 6 days.
    """
    if k <= 0:
        return []

    embeddings = get_embedding_provider()
    query_vector = to_vector_literal((await embeddings.embed([query]))[0])
    candidate_limit = max(CANDIDATE_FLOOR, k * CANDIDATE_MULTIPLIER)

    sql = _SQL
    args = [
        agent_id,
        query_vector,
        candidate_limit,
        settings.recency_decay,
        settings.w_similarity,
        settings.w_recency,
        settings.w_importance,
        k,
    ]
    if memory_types:
        sql = sql.replace(
            "WHERE agent_id = $1 AND embedding IS NOT NULL",
            "WHERE agent_id = $1 AND embedding IS NOT NULL AND memory_type = ANY($9::memory_type[])",
        )
        args.append(memory_types)

    pool = await get_pool()
    rows = await pool.fetch(sql, *args)

    return [
        ScoredMemory(
            memory=Memory(
                id=r["id"],
                agent_id=r["agent_id"],
                content=r["content"],
                importance_score=r["importance_score"],
                memory_type=r["memory_type"],
                created_at=r["created_at"],
            ),
            similarity=float(r["similarity"]),
            recency=float(r["recency"]),
            importance=float(r["importance"]),
            score=float(r["score"]),
        )
        for r in rows
    ]


async def get_memories_by_id(memory_ids: list[int]) -> list[Memory]:
    if not memory_ids:
        return []
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT id, agent_id, content, importance_score, memory_type, created_at
        FROM memories WHERE id = ANY($1::bigint[])
        """,
        memory_ids,
    )
    by_id = {r["id"]: Memory(**dict(r)) for r in rows}
    return [by_id[i] for i in memory_ids if i in by_id]

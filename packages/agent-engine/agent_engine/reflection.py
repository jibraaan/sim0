from __future__ import annotations

from .db import get_pool, to_vector_literal
from .prompts import REFLECTION
from .providers import get_embedding_provider, get_llm_provider
from .schemas import Memory, MemoryType

REFLECTION_WINDOW = 50
REFLECTION_IMPORTANCE = 8  # a synthesized insight is by construction high-signal


async def reflect(
    agent_id: int, *, n_min: int = 3, n_max: int = 5
) -> list[Memory]:
    """Synthesize higher-level insights from the agent's top memories and store each as
    a reflection - which is embedded, so reflections are themselves retrievable and can
    feed later reflections."""
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT content, importance_score, created_at
        FROM memories
        WHERE agent_id = $1
        ORDER BY importance_score DESC, created_at DESC
        LIMIT $2
        """,
        agent_id,
        REFLECTION_WINDOW,
    )
    if len(rows) < n_min:
        return []

    block = "\n".join(
        f"- [{r['created_at']:%Y-%m-%d}, importance {r['importance_score']}] {r['content']}"
        for r in rows
    )

    llm = get_llm_provider()
    raw = await llm.complete(
        REFLECTION.format(memories=block, n_min=n_min, n_max=n_max),
        max_tokens=800,
        temperature=0.7,
    )

    insights = [
        line.strip().lstrip("-*0123456789. ").strip()
        for line in (raw or "").splitlines()
        if len(line.strip()) > 20
    ][:n_max]
    if not insights:
        return []

    # One batched embed call rather than one per insight - each free-tier embedding
    # call is rate-limited, so this is the difference between one wait and n of them.
    embeddings = get_embedding_provider()
    vectors = await embeddings.embed(insights)

    out = []
    async with pool.acquire() as conn, conn.transaction():
        for insight, vector in zip(insights, vectors):
            row = await conn.fetchrow(
                """
                INSERT INTO memories (agent_id, content, embedding, importance_score, memory_type)
                VALUES ($1, $2, $3::vector, $4, $5)
                RETURNING id, agent_id, content, importance_score, memory_type, created_at
                """,
                agent_id,
                insight,
                to_vector_literal(vector),
                REFLECTION_IMPORTANCE,
                MemoryType.reflection.value,
            )
            out.append(Memory(**dict(row)))
    return out

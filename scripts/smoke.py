"""End-to-end loop against a real DB: reflect -> scenario -> run -> batch."""

import asyncio
import json
import sys

from agent_engine import reflect, retrieve_memories, run_batch_simulation, run_simulation
from agent_engine.db import close_pool, get_pool


async def main(agent_id: int):
    print("== reflect ==")
    for m in await reflect(agent_id):
        print(f"  [{m.memory_type.value}] {m.content}")

    pool = await get_pool()
    scenario = await pool.fetchrow(
        """
        INSERT INTO scenarios (name, prompt, created_by)
        VALUES ($1, $2, 'smoke')
        RETURNING id, prompt
        """,
        "Smoke: premium ammonia-free launch",
        "A brand you know from the drugstore is launching an ammonia-free permanent "
        "hair color with no chemical smell, at $18.99 versus the $9.99 box you buy "
        "today. It claims salon-level grey coverage. What do you think, and would you "
        "buy it on your next trip?",
    )

    print("\n== retrieve ==")
    for s in await retrieve_memories(agent_id, scenario["prompt"], k=5):
        print(f"  {s.score:.3f} (sim {s.similarity:.2f} rec {s.recency:.2f}) {s.memory.content[:70]}")

    print("\n== run_simulation ==")
    run = await run_simulation(agent_id, scenario["id"])
    print(f"  memories used: {run.retrieved_memory_ids}")
    print(f"  {run.response}")

    print("\n== run_batch_simulation ==")
    report = await run_batch_simulation(
        scenario["id"],
        [agent_id],
        on_progress=lambda d, t, a, e: print(f"  {d}/{t} agent {a}"),
    )
    print(json.dumps(report.model_dump(), indent=2, default=str))

    await close_pool()


asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 1))

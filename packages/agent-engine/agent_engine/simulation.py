from __future__ import annotations

import asyncio
import json
import logging

from .config import settings
from .db import get_pool
from .prompts import AGGREGATE, PERSONA_SYSTEM, SIMULATION
from .providers import get_llm_provider
from .retrieval import retrieve_memories
from .schemas import BatchReport, Quote, Scenario, SimulationRun, Theme

log = logging.getLogger(__name__)
RETRIEVAL_K = 12


def _format_demographics(name: str, demographics: dict) -> str:
    lines = [f"Name: {name}"]
    for key, value in (demographics or {}).items():
        label = key.replace("_", " ").capitalize()
        if isinstance(value, (list, tuple)):
            value = ", ".join(str(v) for v in value)
        lines.append(f"{label}: {value}")
    return "\n".join(lines)


async def run_simulation(agent_id: int, scenario_id: int) -> SimulationRun:
    pool = await get_pool()
    agent = await pool.fetchrow(
        "SELECT id, name, demographics FROM agents WHERE id = $1", agent_id
    )
    if agent is None:
        raise LookupError(f"agent {agent_id} not found")
    scenario = await pool.fetchrow(
        "SELECT id, name, prompt FROM scenarios WHERE id = $1", scenario_id
    )
    if scenario is None:
        raise LookupError(f"scenario {scenario_id} not found")

    demographics = agent["demographics"]
    if isinstance(demographics, str):
        demographics = json.loads(demographics)

    scored = await retrieve_memories(agent_id, scenario["prompt"], k=RETRIEVAL_K)
    memory_block = "\n".join(f"- {s.memory.content}" for s in scored) or "- (no memories)"

    llm = get_llm_provider()
    response = await llm.complete(
        SIMULATION.format(
            demographics=_format_demographics(agent["name"], demographics),
            memories=memory_block,
            scenario=scenario["prompt"],
        ),
        system=PERSONA_SYSTEM,
        max_tokens=600,
        temperature=1.0,
    )

    memory_ids = [s.memory.id for s in scored]
    row = await pool.fetchrow(
        """
        INSERT INTO simulation_runs (scenario_id, agent_id, response, retrieved_memory_ids)
        VALUES ($1, $2, $3, $4::bigint[])
        ON CONFLICT (scenario_id, agent_id) DO UPDATE
            SET response = EXCLUDED.response,
                retrieved_memory_ids = EXCLUDED.retrieved_memory_ids,
                created_at = now()
        RETURNING id, scenario_id, agent_id, response, retrieved_memory_ids, created_at
        """,
        scenario_id,
        agent_id,
        response,
        memory_ids,
    )
    return SimulationRun(**dict(row))


async def run_batch_simulation(
    scenario_id: int,
    agent_ids: list[int],
    *,
    concurrency: int | None = None,
    on_progress=None,
) -> BatchReport:
    """Fan out run_simulation under a semaphore, then a single aggregation call.

    on_progress(done, total, agent_id, error) is called after each agent so the UI can
    stream progress. Individual failures are recorded, not raised - one bad agent must
    not sink a 500-agent run."""
    limit = concurrency or settings.sim_concurrency
    semaphore = asyncio.Semaphore(limit)
    total = len(agent_ids)
    done = 0

    async def one(agent_id: int):
        nonlocal done
        async with semaphore:
            try:
                return await run_simulation(agent_id, scenario_id)
            except Exception as exc:  # noqa: BLE001
                log.warning("agent %s failed: %s", agent_id, exc)
                return exc
            finally:
                done += 1
                if on_progress:
                    on_progress(done, total, agent_id, None)

    results = await asyncio.gather(*(one(a) for a in agent_ids))
    runs = [r for r in results if isinstance(r, SimulationRun)]
    failed = total - len(runs)

    report = await aggregate_runs(scenario_id, runs)
    report.agents_failed = failed
    return report


async def aggregate_runs(scenario_id: int, runs: list[SimulationRun]) -> BatchReport:
    pool = await get_pool()
    scenario = await pool.fetchrow(
        "SELECT id, name, prompt FROM scenarios WHERE id = $1", scenario_id
    )

    empty = BatchReport(
        scenario_id=scenario_id,
        agents_run=0,
        agents_failed=0,
        sentiment_distribution={"positive": 0, "mixed": 0, "negative": 0},
        themes=[],
        notable_quotes=[],
    )
    if not runs:
        return empty

    names = {
        r["id"]: r["name"]
        for r in await pool.fetch(
            "SELECT id, name FROM agents WHERE id = ANY($1::bigint[])",
            [r.agent_id for r in runs],
        )
    }

    block = "\n\n".join(
        f"[agent_id {r.agent_id} | {names.get(r.agent_id, 'Unknown')}]\n{r.response}"
        for r in runs
    )

    llm = get_llm_provider()
    raw = await llm.complete(
        AGGREGATE.format(n=len(runs), scenario=scenario["prompt"], responses=block),
        max_tokens=2000,
        temperature=0.2,
    )

    try:
        data = json.loads(raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```"))
    except json.JSONDecodeError:
        log.error("aggregation returned non-JSON: %s", raw[:500])
        empty.agents_run = len(runs)
        return empty

    return BatchReport(
        scenario_id=scenario_id,
        agents_run=len(runs),
        agents_failed=0,
        sentiment_distribution={
            k: int(v) for k, v in (data.get("sentiment_distribution") or {}).items()
        },
        themes=[Theme(**t) for t in (data.get("themes") or [])],
        notable_quotes=[
            Quote(
                agent_id=q["agent_id"],
                agent_name=names.get(q["agent_id"], "Unknown"),
                text=q["text"],
            )
            for q in (data.get("notable_quotes") or [])
            if "agent_id" in q and "text" in q
        ],
    )

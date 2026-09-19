from __future__ import annotations

import asyncio
import json
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agent_engine import generate_cohort, reflect, run_batch_simulation
from agent_engine.agents import create_agent_from_interview
from agent_engine.config import settings
from agent_engine.db import close_pool, get_pool
from agent_engine.retrieval import get_memories_by_id, retrieve_memories
from agent_engine.schemas import SimulationRun
from agent_engine.simulation import aggregate_runs

from auth import router as auth_router

app = FastAPI(title="Agent Simulation API")
app.add_middleware(
    CORSMiddleware,
    # CORS_ORIGIN lets the deployed web origin through in prod; local dev keeps the
    # hardcoded fallback so nothing extra needs setting up.
    allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:3000")],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)


@app.on_event("shutdown")
async def _shutdown():
    await close_pool()


@app.get("/config")
async def get_config():
    """Non-secret provider/model info for display (e.g. the dashboard sidebar)."""
    llm_model = settings.anthropic_model if settings.llm_provider == "anthropic" else settings.groq_model
    embedding_model = (
        settings.voyage_embedding_model
        if settings.embedding_provider == "voyage"
        else settings.openai_embedding_model
        if settings.embedding_provider == "openai"
        else "fake"
    )
    return {
        "llm_provider": settings.llm_provider,
        "llm_model": llm_model,
        "embedding_provider": settings.embedding_provider,
        "embedding_model": embedding_model,
        "concurrency": settings.sim_concurrency,
    }


class InterviewAnswer(BaseModel):
    question: str
    answer: str


class InterviewSubmission(BaseModel):
    name: str
    demographics: dict = Field(default_factory=dict)
    answers: list[InterviewAnswer]
    source_interview_id: str | None = None
    run_reflection: bool = True


@app.post("/agents/from-interview")
async def agent_from_interview(body: InterviewSubmission):
    agent, memories = await create_agent_from_interview(
        body.name,
        body.demographics,
        [a.model_dump() for a in body.answers],
        body.source_interview_id,
    )
    reflections = await reflect(agent.id) if body.run_reflection else []
    return {
        "agent": agent.model_dump(),
        "observation_count": len(memories),
        "reflection_count": len(reflections),
    }


class CohortQuestion(BaseModel):
    question: str
    demographic_key: str | None = None
    options: list[str] | None = None


class CohortIn(BaseModel):
    brief: str
    count: int
    questions: list[CohortQuestion]


@app.post("/agents/cohort/stream")
async def cohort_stream(body: CohortIn):
    """SSE progress for the bulk cohort generator - one event per persona landed."""
    count = max(1, min(body.count, 25))
    questions = [q.model_dump() for q in body.questions]
    queue: asyncio.Queue = asyncio.Queue()

    def on_progress(done, total, name, error):
        queue.put_nowait(
            {"type": "progress", "done": done, "total": total, "name": name, "error": error}
        )

    async def producer():
        try:
            agents = await generate_cohort(body.brief, count, questions, on_progress=on_progress)
            await queue.put({"type": "done", "agent_ids": [a.id for a in agents]})
        except Exception as exc:  # noqa: BLE001
            await queue.put({"type": "error", "message": str(exc)})
        finally:
            await queue.put(None)

    async def events():
        task = asyncio.create_task(producer())
        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                yield f"data: {json.dumps(item, default=str)}\n\n"
        finally:
            task.cancel()

    return StreamingResponse(events(), media_type="text/event-stream")


@app.get("/agents")
async def list_agents(limit: int = 100, offset: int = 0, q: str | None = None):
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT a.id, a.name, a.demographics, a.source_interview_id, a.created_at,
               count(m.id) FILTER (WHERE m.memory_type = 'observation') AS observations,
               count(m.id) FILTER (WHERE m.memory_type = 'reflection')  AS reflections
        FROM agents a
        LEFT JOIN memories m ON m.agent_id = a.id
        WHERE ($3::text IS NULL OR a.name ILIKE '%' || $3 || '%')
        GROUP BY a.id
        ORDER BY a.created_at DESC
        LIMIT $1 OFFSET $2
        """,
        limit,
        offset,
        q,
    )
    return [
        {**dict(r), "demographics": json.loads(r["demographics"]) if isinstance(r["demographics"], str) else r["demographics"]}
        for r in rows
    ]


@app.get("/agents/{agent_id}")
async def get_agent(agent_id: int):
    pool = await get_pool()
    row = await pool.fetchrow(
        """
        SELECT a.id, a.name, a.demographics, a.source_interview_id, a.created_at,
               count(m.id) FILTER (WHERE m.memory_type = 'observation') AS observations,
               count(m.id) FILTER (WHERE m.memory_type = 'reflection')  AS reflections,
               coalesce(avg(m.importance_score), 0)::float AS mean_importance
        FROM agents a
        LEFT JOIN memories m ON m.agent_id = a.id
        WHERE a.id = $1
        GROUP BY a.id
        """,
        agent_id,
    )
    if row is None:
        raise HTTPException(404, "agent not found")
    data = dict(row)
    if isinstance(data["demographics"], str):
        data["demographics"] = json.loads(data["demographics"])
    return data


@app.get("/agents/{agent_id}/memories")
async def agent_memories(agent_id: int, memory_type: str | None = None, limit: int = 200):
    pool = await get_pool()
    return [
        dict(r)
        for r in await pool.fetch(
            """
            SELECT id, agent_id, content, importance_score, memory_type, created_at
            FROM memories
            WHERE agent_id = $1 AND ($2::text IS NULL OR memory_type::text = $2)
            ORDER BY created_at DESC LIMIT $3
            """,
            agent_id,
            memory_type,
            limit,
        )
    ]


@app.post("/agents/{agent_id}/reflect")
async def trigger_reflect(agent_id: int):
    return [m.model_dump() for m in await reflect(agent_id)]


class ScenarioIn(BaseModel):
    name: str
    prompt: str
    created_by: str | None = None


@app.post("/scenarios")
async def create_scenario(body: ScenarioIn):
    pool = await get_pool()
    row = await pool.fetchrow(
        """
        INSERT INTO scenarios (name, prompt, created_by) VALUES ($1, $2, $3)
        RETURNING id, name, prompt, created_by, created_at
        """,
        body.name,
        body.prompt,
        body.created_by,
    )
    return dict(row)


@app.get("/scenarios")
async def list_scenarios():
    pool = await get_pool()
    return [
        dict(r)
        for r in await pool.fetch(
            """
            SELECT s.id, s.name, s.prompt, s.created_by, s.created_at,
                   count(DISTINCT r.agent_id) AS agents_run,
                   max(r.created_at) AS last_run_at
            FROM scenarios s
            LEFT JOIN simulation_runs r ON r.scenario_id = s.id
            GROUP BY s.id
            ORDER BY s.created_at DESC
            """
        )
    ]


@app.get("/scenarios/{scenario_id}")
async def get_scenario(scenario_id: int):
    pool = await get_pool()
    row = await pool.fetchrow(
        "SELECT id, name, prompt, created_by, created_at FROM scenarios WHERE id = $1",
        scenario_id,
    )
    if row is None:
        raise HTTPException(404, "scenario not found")
    return dict(row)


@app.get("/scenarios/{scenario_id}/report")
async def get_scenario_report(scenario_id: int):
    """Aggregate report for whatever simulation_runs already exist for this scenario.
    Recomputed on demand (one extra LLM call) rather than persisted, since the
    aggregate is a view over simulation_runs, not its own entity."""
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT id, scenario_id, agent_id, response, retrieved_memory_ids, created_at
        FROM simulation_runs WHERE scenario_id = $1
        """,
        scenario_id,
    )
    runs = [SimulationRun(**dict(r)) for r in rows]
    report = await aggregate_runs(scenario_id, runs)
    return report.model_dump()


class BatchIn(BaseModel):
    agent_ids: list[int] | None = None  # None or [] means all agents


async def _resolve_agent_ids(agent_ids: list[int] | None) -> list[int]:
    if agent_ids:
        return agent_ids
    pool = await get_pool()
    return [r["id"] for r in await pool.fetch("SELECT id FROM agents ORDER BY id")]


@app.post("/scenarios/{scenario_id}/run")
async def run_batch(scenario_id: int, body: BatchIn):
    ids = await _resolve_agent_ids(body.agent_ids)
    if not ids:
        raise HTTPException(400, "no agents to run")
    report = await run_batch_simulation(scenario_id, ids)
    return report.model_dump()


@app.post("/scenarios/{scenario_id}/run/stream")
async def run_batch_stream(scenario_id: int, body: BatchIn):
    """SSE progress for the dashboard's live run view."""
    ids = await _resolve_agent_ids(body.agent_ids)
    queue: asyncio.Queue = asyncio.Queue()

    def on_progress(done, total, agent_id, error):
        queue.put_nowait({"type": "progress", "done": done, "total": total, "agent_id": agent_id})

    async def producer():
        try:
            report = await run_batch_simulation(scenario_id, ids, on_progress=on_progress)
            await queue.put({"type": "report", "report": report.model_dump()})
        except Exception as exc:  # noqa: BLE001
            await queue.put({"type": "error", "message": str(exc)})
        finally:
            await queue.put(None)

    async def events():
        task = asyncio.create_task(producer())
        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                yield f"data: {json.dumps(item, default=str)}\n\n"
        finally:
            task.cancel()

    return StreamingResponse(events(), media_type="text/event-stream")


@app.get("/scenarios/{scenario_id}/runs")
async def scenario_runs(scenario_id: int):
    pool = await get_pool()
    return [
        dict(r)
        for r in await pool.fetch(
            """
            SELECT r.id, r.agent_id, a.name AS agent_name, r.response,
                   r.retrieved_memory_ids, r.created_at
            FROM simulation_runs r JOIN agents a ON a.id = r.agent_id
            WHERE r.scenario_id = $1 ORDER BY r.created_at DESC
            """,
            scenario_id,
        )
    ]


@app.get("/runs/{run_id}")
async def run_detail(run_id: int):
    """Drill-down: the response plus the memories that produced it, rescored against the
    scenario prompt so the UI can show why each was retrieved."""
    pool = await get_pool()
    run = await pool.fetchrow(
        """
        SELECT r.id, r.scenario_id, r.agent_id, a.name AS agent_name, a.demographics,
               s.prompt AS scenario_prompt, r.response, r.retrieved_memory_ids, r.created_at
        FROM simulation_runs r
        JOIN agents a ON a.id = r.agent_id
        JOIN scenarios s ON s.id = r.scenario_id
        WHERE r.id = $1
        """,
        run_id,
    )
    if run is None:
        raise HTTPException(404, "run not found")

    scored = await retrieve_memories(run["agent_id"], run["scenario_prompt"], k=50)
    used = set(run["retrieved_memory_ids"])
    by_id = {s.memory.id: s for s in scored}
    memories = [
        {**by_id[i].model_dump(), "used": True} for i in run["retrieved_memory_ids"] if i in by_id
    ]
    missing = [m.model_dump() for m in await get_memories_by_id([i for i in used if i not in by_id])]

    return {**dict(run), "memories": memories, "memories_unscored": missing}

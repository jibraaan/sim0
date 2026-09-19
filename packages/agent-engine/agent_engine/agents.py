from __future__ import annotations

import json

from .db import get_pool
from .memory import create_memories
from .schemas import Agent, Memory


async def create_agent(
    name: str, demographics: dict, source_interview_id: str | None = None
) -> Agent:
    pool = await get_pool()
    row = await pool.fetchrow(
        """
        INSERT INTO agents (name, demographics, source_interview_id)
        VALUES ($1, $2::jsonb, $3)
        RETURNING id, name, demographics, source_interview_id, created_at
        """,
        name,
        json.dumps(demographics or {}),
        source_interview_id,
    )
    data = dict(row)
    if isinstance(data["demographics"], str):
        data["demographics"] = json.loads(data["demographics"])
    return Agent(**data)


async def create_agent_from_interview(
    name: str,
    demographics: dict,
    answers: list[dict],
    source_interview_id: str | None = None,
) -> tuple[Agent, list[Memory]]:
    """answers: [{question, answer}]. Each answer becomes one or more observation
    memories - split on sentence boundaries so a rambling answer yields several
    independently retrievable facts."""
    agent = await create_agent(name, demographics, source_interview_id)
    contents = []
    for item in answers:
        question = (item.get("question") or "").strip()
        answer = (item.get("answer") or "").strip()
        if not answer:
            continue
        for fragment in _split_answer(answer):
            contents.append(f"When asked \"{question}\", {name} said: {fragment}")
    memories = await create_memories(agent.id, contents)
    return agent, memories


def _split_answer(answer: str, min_len: int = 40) -> list[str]:
    import re

    parts = [p.strip() for p in re.split(r"(?<=[.!?])\s+", answer) if p.strip()]
    merged: list[str] = []
    for part in parts:
        if merged and len(merged[-1]) < min_len:
            merged[-1] = merged[-1] + " " + part
        else:
            merged.append(part)
    return merged or [answer]

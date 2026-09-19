from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class MemoryType(str, Enum):
    observation = "observation"
    reflection = "reflection"
    plan = "plan"


class Agent(BaseModel):
    id: int
    name: str
    demographics: dict = Field(default_factory=dict)
    source_interview_id: str | None = None
    created_at: datetime


class Memory(BaseModel):
    id: int
    agent_id: int
    content: str
    importance_score: int
    memory_type: MemoryType
    created_at: datetime


class ScoredMemory(BaseModel):
    """A Memory plus the retrieval components that surfaced it. Kept separate so the
    dashboard can explain *why* a memory was used."""

    memory: Memory
    similarity: float
    recency: float
    importance: float
    score: float


class Scenario(BaseModel):
    id: int
    name: str
    prompt: str
    created_by: str | None = None
    created_at: datetime


class SimulationRun(BaseModel):
    id: int
    scenario_id: int
    agent_id: int
    response: str
    retrieved_memory_ids: list[int] = Field(default_factory=list)
    created_at: datetime


class Sentiment(str, Enum):
    positive = "positive"
    mixed = "mixed"
    negative = "negative"


class Theme(BaseModel):
    label: str
    summary: str
    agent_count: int


class Quote(BaseModel):
    agent_id: int
    agent_name: str
    text: str


class BatchReport(BaseModel):
    scenario_id: int
    agents_run: int
    agents_failed: int
    sentiment_distribution: dict[str, int]
    themes: list[Theme]
    notable_quotes: list[Quote]

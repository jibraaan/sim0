CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE memory_type AS ENUM ('observation', 'reflection', 'plan');

CREATE TABLE agents (
    id                  BIGSERIAL PRIMARY KEY,
    name                TEXT        NOT NULL,
    demographics        JSONB       NOT NULL DEFAULT '{}'::jsonb,
    source_interview_id TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- vector(1024) matches Voyage's native voyage-3 dimension. Switching EMBEDDING_PROVIDER
-- to openai (1536) or a different Voyage model requires updating this column to match.
CREATE TABLE memories (
    id               BIGSERIAL PRIMARY KEY,
    agent_id         BIGINT      NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    content          TEXT        NOT NULL,
    embedding        vector(1024),
    importance_score INT         NOT NULL CHECK (importance_score BETWEEN 1 AND 10),
    memory_type      memory_type NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX memories_agent_created_idx ON memories (agent_id, created_at DESC);
CREATE INDEX memories_agent_importance_idx ON memories (agent_id, importance_score DESC);

-- Build after you have a meaningful row count; lists ~= sqrt(rows).
CREATE INDEX memories_embedding_idx ON memories
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE scenarios (
    id         BIGSERIAL PRIMARY KEY,
    name       TEXT        NOT NULL,
    prompt     TEXT        NOT NULL,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE simulation_runs (
    id                  BIGSERIAL PRIMARY KEY,
    scenario_id         BIGINT      NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    agent_id            BIGINT      NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    response            TEXT        NOT NULL,
    retrieved_memory_ids BIGINT[]   NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX simulation_runs_scenario_idx ON simulation_runs (scenario_id, created_at DESC);
CREATE UNIQUE INDEX simulation_runs_scenario_agent_idx ON simulation_runs (scenario_id, agent_id);

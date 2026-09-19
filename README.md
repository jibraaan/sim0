# Generative Agent Simulation Platform

Turn interview data into LLM-backed agents, then simulate their reactions to business
scenarios at scale.

    apps/api                FastAPI service (thin HTTP layer)
    apps/web                Next.js App Router + Tailwind
    packages/agent-engine   Core agent logic (importable Python package)
    migrations              Plain SQL migrations

## Dependency choices (confirm before I add anything else)

| Concern | Chosen | Why |
|---|---|---|
| DB access | `asyncpg` raw SQL | No ORM needed; pgvector params stay explicit |
| Migrations | numbered `.sql` files + `psql` | Alembic not pulled in without your OK |
| Vectors | `pgvector` extension, `vector(1536)` | as specified |
| LLM | `anthropic` | as specified |
| Embeddings | provider interface; `openai` and `voyageai` adapters | swappable |
| Tests | `pytest` + `pytest-asyncio` | |

Not added: SQLAlchemy, Alembic, Celery, Redis, LangChain, shadcn/ui. Ask me if you want any.

## Quickstart

    createdb agentsim
    psql agentsim -f migrations/001_init.sql
    cp .env.example .env      # fill in keys

    cd packages/agent-engine && pip install -e '.[dev]'
    cd ../../apps/api && pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

    cd apps/web && npm install && npm run dev

## End-to-end smoke test (do this before building UI)

    python scripts/seed_test_agent.py     # creates one hardcoded agent + memories
    python scripts/smoke.py               # reflect -> scenario -> single run -> batch of 1

Both scripts print every LLM/embedding call so you can see the loop working.

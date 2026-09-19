import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _f(key: str, default: float) -> float:
    return float(os.getenv(key, default))


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "postgresql://localhost:5432/agentsim")

    llm_provider: str = os.getenv("LLM_PROVIDER", "anthropic")

    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    anthropic_model: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")

    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    embedding_provider: str = os.getenv("EMBEDDING_PROVIDER", "openai")
    embedding_dim: int = int(os.getenv("EMBEDDING_DIM", 1536))
    openai_embedding_model: str = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
    voyage_embedding_model: str = os.getenv("VOYAGE_EMBEDDING_MODEL", "voyage-3")
    # Voyage's free tier without a payment method on file: 3 requests/minute.
    voyage_rate_limit_rpm: int = int(os.getenv("VOYAGE_RATE_LIMIT_RPM", 3))

    w_similarity: float = _f("RETRIEVAL_W_SIMILARITY", 1.0)
    w_recency: float = _f("RETRIEVAL_W_RECENCY", 1.0)
    w_importance: float = _f("RETRIEVAL_W_IMPORTANCE", 1.0)
    recency_decay: float = _f("RECENCY_DECAY", 0.995)

    sim_concurrency: int = int(os.getenv("SIM_CONCURRENCY", 12))


settings = Settings()

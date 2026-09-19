from __future__ import annotations

from functools import lru_cache

from ..config import settings
from .base import EmbeddingProvider, LLMProvider

_embedding_override: EmbeddingProvider | None = None
_llm_override: LLMProvider | None = None


def set_providers(
    embeddings: EmbeddingProvider | None = None, llm: LLMProvider | None = None
) -> None:
    """Test/DI hook. Call with None to reset."""
    global _embedding_override, _llm_override
    _embedding_override = embeddings
    _llm_override = llm


@lru_cache(maxsize=1)
def _default_embeddings() -> EmbeddingProvider:
    name = settings.embedding_provider.lower()
    if name == "openai":
        from .openai_provider import OpenAIEmbeddings

        return OpenAIEmbeddings(dim=settings.embedding_dim)
    if name == "voyage":
        from .voyage_provider import VoyageEmbeddings

        return VoyageEmbeddings(dim=settings.embedding_dim)
    if name == "fake":
        from .fake_provider import FakeEmbeddings

        return FakeEmbeddings(dim=settings.embedding_dim)
    raise ValueError(f"unknown EMBEDDING_PROVIDER: {name}")


@lru_cache(maxsize=1)
def _default_llm() -> LLMProvider:
    name = settings.llm_provider.lower()
    if name == "anthropic":
        from .anthropic_provider import ClaudeLLM

        return ClaudeLLM()
    if name == "groq":
        from .groq_provider import GroqLLM

        return GroqLLM()
    raise ValueError(f"unknown LLM_PROVIDER: {name}")


def get_embedding_provider() -> EmbeddingProvider:
    return _embedding_override or _default_embeddings()


def get_llm_provider() -> LLMProvider:
    return _llm_override or _default_llm()

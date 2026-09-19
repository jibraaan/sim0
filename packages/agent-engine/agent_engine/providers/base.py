from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class EmbeddingProvider(Protocol):
    """Swap target: Voyage, OpenAI, a local model, or the deterministic fake in tests."""

    dim: int

    async def embed(self, texts: list[str]) -> list[list[float]]:
        ...


@runtime_checkable
class LLMProvider(Protocol):
    async def complete(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 1.0,
    ) -> str:
        ...

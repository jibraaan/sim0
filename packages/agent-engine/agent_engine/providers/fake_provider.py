from __future__ import annotations

import hashlib
import math


class FakeEmbeddings:
    """Deterministic hash embedding. Not semantic, but stable - lets tests assert
    ordering without network access."""

    def __init__(self, dim: int = 1536) -> None:
        self.dim = dim

    async def embed(self, texts: list[str]) -> list[list[float]]:
        out = []
        for text in texts:
            digest = hashlib.sha256(text.encode()).digest()
            raw = [
                (digest[i % len(digest)] / 255.0) - 0.5 for i in range(self.dim)
            ]
            norm = math.sqrt(sum(x * x for x in raw)) or 1.0
            out.append([x / norm for x in raw])
        return out


class FakeLLM:
    """Scripted responses, popped in order. Falls back to a default."""

    def __init__(self, responses: list[str] | None = None, default: str = "5") -> None:
        self.responses = list(responses or [])
        self.default = default
        self.calls: list[str] = []

    async def complete(self, prompt: str, **kwargs) -> str:
        self.calls.append(prompt)
        return self.responses.pop(0) if self.responses else self.default

from __future__ import annotations

import os

from ..config import settings


class OpenAIEmbeddings:
    def __init__(self, model: str | None = None, dim: int = 1536) -> None:
        from openai import AsyncOpenAI

        self._client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
        self.model = model or settings.openai_embedding_model
        self.dim = dim

    async def embed(self, texts: list[str]) -> list[list[float]]:
        resp = await self._client.embeddings.create(
            model=self.model, input=texts, dimensions=self.dim
        )
        return [d.embedding for d in resp.data]

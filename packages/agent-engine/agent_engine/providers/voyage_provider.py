from __future__ import annotations

import os

from ..config import settings
from .rate_limit import RateLimiter


class VoyageEmbeddings:
    """Voyage returns 1024-d by default; pad/truncate is NOT done here on purpose.
    If you switch to Voyage, change the column to vector(1024) in a migration.

    Self-throttled to settings.voyage_rate_limit_rpm (default 3/min, matching
    Voyage's free tier without a payment method on file) so batch operations queue
    up instead of raising RateLimitError."""

    def __init__(self, model: str | None = None, dim: int = 1024) -> None:
        import voyageai

        self._client = voyageai.AsyncClient(api_key=os.environ["VOYAGE_API_KEY"])
        self.model = model or settings.voyage_embedding_model
        self.dim = dim
        self._rate_limiter = RateLimiter(settings.voyage_rate_limit_rpm, period_seconds=62)

    async def embed(self, texts: list[str]) -> list[list[float]]:
        # One call embeds the whole batch, so this only throttles call *count*,
        # not per-text — callers should batch texts together where possible.
        await self._rate_limiter.acquire()
        resp = await self._client.embed(texts, model=self.model, input_type="document")
        return resp.embeddings

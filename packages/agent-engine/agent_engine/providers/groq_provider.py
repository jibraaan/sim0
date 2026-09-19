from __future__ import annotations

import asyncio
import re

from ..config import settings

_RETRY_AFTER = re.compile(r"try again in (\d+(?:\.\d+)?)s")
MAX_RETRIES = 5


class GroqLLM:
    """Free-tier alternative to Claude. OpenAI-compatible chat completions API.

    The free tier's tokens-per-minute cap is easy to hit under any concurrent load
    (e.g. cohort generation), so 429s are retried with the wait time Groq reports
    rather than surfaced as failures."""

    def __init__(self, model: str | None = None) -> None:
        from groq import AsyncGroq, RateLimitError

        self._client = AsyncGroq(api_key=settings.groq_api_key)
        self.model = model or settings.groq_model
        self._RateLimitError = RateLimitError

    async def complete(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 1.0,
    ) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        for attempt in range(MAX_RETRIES + 1):
            try:
                resp = await self._client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
                return (resp.choices[0].message.content or "").strip()
            except self._RateLimitError as exc:
                if attempt == MAX_RETRIES:
                    raise
                match = _RETRY_AFTER.search(str(exc))
                wait = float(match.group(1)) + 0.5 if match else 2 ** attempt
                await asyncio.sleep(wait)
        raise RuntimeError("unreachable")  # loop always returns or raises

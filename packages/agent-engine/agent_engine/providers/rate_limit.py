from __future__ import annotations

import asyncio
import time
from collections import deque


class RateLimiter:
    """Sliding-window rate limiter for free-tier APIs with a hard requests/period cap.

    Self-throttles by sleeping before a call would exceed the window, rather than
    firing and hoping the retry logic catches a 429."""

    def __init__(self, max_calls: int, period_seconds: float) -> None:
        self.max_calls = max_calls
        self.period = period_seconds
        self._calls: deque[float] = deque()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            self._evict(now)
            if len(self._calls) >= self.max_calls:
                wait = self.period - (now - self._calls[0])
                if wait > 0:
                    await asyncio.sleep(wait)
                self._evict(time.monotonic())
            self._calls.append(time.monotonic())

    def _evict(self, now: float) -> None:
        while self._calls and now - self._calls[0] >= self.period:
            self._calls.popleft()

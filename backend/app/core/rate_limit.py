"""In-process sliding-window rate limiter for expensive per-learner calls.

Keyed by learner id, so one learner can't exhaust the Gemini quota for
everyone. State lives in this process only: with several API workers each
enforces its own window (an upper bound of workers x limit). Use a shared
store (e.g. Redis) if the backend is scaled out.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from app.core.exceptions import RateLimitedError


class SlidingWindowLimiter:
    def __init__(self, limit: int, window_seconds: float, clock=time.monotonic) -> None:
        self.limit = limit
        self.window = window_seconds
        self.clock = clock
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str) -> None:
        now = self.clock()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] >= self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                retry_in = max(1, int(self.window - (now - hits[0])))
                raise RateLimitedError(f"Too many questions in a short time. Try again in {retry_in} seconds.")
            hits.append(now)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

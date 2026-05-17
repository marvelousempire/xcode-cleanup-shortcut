"""Small in-memory ring buffers for realtime performance metrics."""

from __future__ import annotations

import threading
import time
from collections import deque
from typing import Any


class RingStore:
    def __init__(self, limit: int = 180):
        self.limit = limit
        self._lock = threading.Lock()
        self._series: dict[str, deque[dict[str, Any]]] = {}
        self._latest: dict[str, Any] = {}

    def push(self, name: str, value: dict[str, Any]) -> dict[str, Any]:
        sample = {"ts": time.time(), **value}
        with self._lock:
            self._series.setdefault(name, deque(maxlen=self.limit)).append(sample)
            self._latest[name] = sample
        return sample

    def latest(self, name: str, default: Any = None) -> Any:
        with self._lock:
            return self._latest.get(name, default)

    def series(self, name: str) -> list[dict[str, Any]]:
        with self._lock:
            return list(self._series.get(name, ()))

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return {
                "latest": dict(self._latest),
                "series": {key: list(values) for key, values in self._series.items()},
            }


STORE = RingStore()

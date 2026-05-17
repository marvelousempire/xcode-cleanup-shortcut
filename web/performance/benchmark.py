"""DustBench: small local, non-destructive workstation health benchmark."""

from __future__ import annotations

import http.client
import json
import math
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

_LAST_RESULT: dict | None = None


def status() -> dict:
    return {"last_result": _LAST_RESULT, "available": True}


def run() -> dict:
    global _LAST_RESULT
    started = time.time()
    scores = {
        "cpu": _cpu_score(),
        "filesystem": _filesystem_score(),
        "json": _json_score(),
        "subprocess": _subprocess_score(),
        "loopback": _loopback_score(),
        "docker": _docker_score(),
    }
    numeric = [value for value in scores.values() if isinstance(value, (int, float)) and value > 0]
    overall = round(sum(numeric) / len(numeric), 1) if numeric else 0.0
    _LAST_RESULT = {
        "ts": time.time(),
        "duration_ms": round((time.time() - started) * 1000),
        "overall": overall,
        "scores": scores,
        "notes": [
            "DustBench is DustPan-owned and local-only; it is not a GeekBench-compatible score.",
            "Filesystem writes use a temporary DustPan scratch directory and are deleted immediately.",
        ],
    }
    return _LAST_RESULT


def _cpu_score() -> float:
    start = time.perf_counter()
    acc = 0.0
    for i in range(1, 120_000):
        acc += math.sqrt(i) * math.sin(i)
    elapsed = max(time.perf_counter() - start, 0.001)
    return round(1000 / elapsed, 1)


def _filesystem_score() -> float:
    data = b"dustbench" * 131_072
    with tempfile.TemporaryDirectory(prefix="dustpan-bench-") as tmp:
        path = Path(tmp) / "scratch.bin"
        start = time.perf_counter()
        path.write_bytes(data)
        _ = path.read_bytes()
        elapsed = max(time.perf_counter() - start, 0.001)
    mb = len(data) / 1024 / 1024 * 2
    return round(mb / elapsed, 1)


def _json_score() -> float:
    payload = [{"i": i, "label": f"row-{i}", "ok": i % 3 == 0} for i in range(5000)]
    start = time.perf_counter()
    body = json.dumps(payload)
    _ = json.loads(body)
    elapsed = max(time.perf_counter() - start, 0.001)
    return round(len(payload) / elapsed, 1)


def _subprocess_score() -> float:
    start = time.perf_counter()
    for _ in range(8):
        subprocess.run(["python3", "-c", "print('ok')"], capture_output=True, text=True, timeout=3, check=False)
    elapsed = max(time.perf_counter() - start, 0.001)
    return round(8 / elapsed, 1)


def _loopback_score() -> float:
    start = time.perf_counter()
    ok = 0
    for _ in range(12):
        try:
            conn = http.client.HTTPConnection("127.0.0.1", 8765, timeout=0.2)
            conn.request("GET", "/api/status")
            resp = conn.getresponse()
            ok += 1 if resp.status < 500 else 0
            conn.close()
        except OSError:
            pass
    elapsed = max(time.perf_counter() - start, 0.001)
    return round(ok / elapsed, 1) if ok else 0.0


def _docker_score() -> float | None:
    if not shutil.which("docker"):
        return None
    start = time.perf_counter()
    proc = subprocess.run(["docker", "version", "--format", "{{.Server.Version}}"], capture_output=True, text=True, timeout=3, check=False)
    if proc.returncode != 0:
        return None
    return round(100 / max(time.perf_counter() - start, 0.001), 1)

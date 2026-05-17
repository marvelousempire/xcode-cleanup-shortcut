"""Process probes shared by Server Performance APIs."""

from __future__ import annotations

import os

from .platform import run_capture


def top_processes(limit: int = 12) -> list[dict]:
    rc, out, _err = run_capture(["ps", "-axo", "pid,pcpu,pmem,rss,comm"], timeout=3)
    if rc != 0:
        return []
    rows = []
    for line in out.splitlines()[1:]:
        parts = line.split(None, 4)
        if len(parts) < 5:
            continue
        try:
            pid = int(parts[0])
            cpu = float(parts[1])
            mem = float(parts[2])
            rss_mb = round(int(parts[3]) / 1024, 1)
        except ValueError:
            continue
        rows.append({
            "pid": pid,
            "cpu_pct": cpu,
            "mem_pct": mem,
            "rss_mb": rss_mb,
            "name": os.path.basename(parts[4]) or parts[4],
        })
    rows.sort(key=lambda row: (row["cpu_pct"], row["rss_mb"]), reverse=True)
    return rows[:limit]


def matching_process_lines(pattern: str, limit: int = 30) -> list[str]:
    rc, out, _err = run_capture(["pgrep", "-lf", pattern], timeout=3)
    if rc != 0:
        return []
    return [line for line in out.splitlines() if line.strip()][:limit]

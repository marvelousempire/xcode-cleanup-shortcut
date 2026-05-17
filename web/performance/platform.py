"""Cross-platform metric probes for macOS and Linux."""

from __future__ import annotations

import os
import platform as py_platform
import re
import shutil
import subprocess
from pathlib import Path


SYSTEM = py_platform.system().lower()


def run_capture(cmd: list[str], timeout: float = 3.0) -> tuple[int, str, str]:
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=False)
        return proc.returncode, proc.stdout, proc.stderr
    except Exception as exc:  # pragma: no cover - defensive for missing platform tools
        return 127, "", str(exc)


def disk(path: str = "/") -> dict:
    usage = shutil.disk_usage(path)
    total = usage.total / 1024**3
    free = usage.free / 1024**3
    used = usage.used / 1024**3
    return {
        "free_gb": round(free, 2),
        "used_gb": round(used, 2),
        "total_gb": round(total, 2),
        "used_pct": round((used / total * 100), 1) if total else 0.0,
    }


def load() -> dict:
    try:
        load_1, load_5, load_15 = os.getloadavg()
    except OSError:
        load_1 = load_5 = load_15 = 0.0
    cpu_count = os.cpu_count() or 1
    return {
        "load_1": round(load_1, 2),
        "load_5": round(load_5, 2),
        "load_15": round(load_15, 2),
        "cpu_count": cpu_count,
        "load_pct": round(min(load_1 / cpu_count * 100, 999), 1),
    }


def memory() -> dict:
    if SYSTEM == "linux":
        return _linux_memory()
    return _darwin_memory()


def _linux_memory() -> dict:
    values: dict[str, int] = {}
    try:
        for line in Path("/proc/meminfo").read_text().splitlines():
            key, val = line.split(":", 1)
            values[key] = int(val.strip().split()[0])
    except Exception:
        values = {}
    total_mb = values.get("MemTotal", 0) // 1024
    available_mb = values.get("MemAvailable", values.get("MemFree", 0)) // 1024
    used_mb = max(total_mb - available_mb, 0)
    return {
        "total_mb": total_mb,
        "free_mb": available_mb,
        "used_mb": used_mb,
        "used_pct": round((used_mb / total_mb * 100), 1) if total_mb else 0.0,
    }


def _darwin_memory() -> dict:
    total_mb = 0
    free_mb = 0
    rc, out, _err = run_capture(["sysctl", "-n", "hw.memsize"], timeout=2)
    if rc == 0:
        try:
            total_mb = int(out.strip()) // 1024 // 1024
        except ValueError:
            total_mb = 0

    rc, out, _err = run_capture(["vm_stat"], timeout=2)
    if rc == 0:
        page_size = 4096
        pages: dict[str, int] = {}
        for line in out.splitlines():
            if "page size of" in line:
                match = re.search(r"page size of (\d+) bytes", line)
                if match:
                    page_size = int(match.group(1))
                continue
            if ":" not in line:
                continue
            key, val = line.split(":", 1)
            try:
                pages[key.strip()] = int(re.sub(r"[^0-9]", "", val))
            except ValueError:
                continue
        free_pages = pages.get("Pages free", 0) + pages.get("Pages inactive", 0) + pages.get("Pages speculative", 0)
        free_mb = int(free_pages * page_size / 1024 / 1024)

    used_mb = max(total_mb - free_mb, 0) if total_mb else 0
    return {
        "total_mb": total_mb,
        "free_mb": free_mb,
        "used_mb": used_mb,
        "used_pct": round((used_mb / total_mb * 100), 1) if total_mb else 0.0,
    }

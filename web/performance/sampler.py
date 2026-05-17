"""Realtime sampler and snapshot composer for Server Performance."""

from __future__ import annotations

import socket
import time

from . import analytics, network, platform, processes, services
from .storage import STORE


def local_ip() -> str | None:
    sock = None
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except Exception:
        return None
    finally:
        if sock:
            sock.close()


def cheap_sample() -> dict:
    sample = {
        "disk": platform.disk(),
        "load": platform.load(),
        "memory": platform.memory(),
    }
    STORE.push("disk", sample["disk"])
    STORE.push("load", sample["load"])
    STORE.push("memory", sample["memory"])
    return sample


def get_snapshot(include_slow: bool = True, preferred_port: int = 8765) -> dict:
    system = cheap_sample()
    proc_rows = processes.top_processes() if include_slow else STORE.latest("processes", [])
    net = network.snapshot() if include_slow else STORE.latest("network", {"available": False, "listeners": [], "connections": []})
    svc = services.known_services(preferred_port=preferred_port) if include_slow else STORE.latest("services", [])
    activity = _activity_snapshot(system, proc_rows, svc) if include_slow else STORE.latest("activity", {"heavy_paths": [], "automation_processes": [], "recommendations": []})

    STORE.push("processes", {"rows": proc_rows})
    STORE.push("network", net)
    STORE.push("services", {"rows": svc})
    STORE.push("activity", activity)

    snapshot = {
        "ts": time.time(),
        "host": socket.gethostname(),
        "platform": platform.SYSTEM or "unknown",
        "lan_ip": local_ip(),
        "system": system,
        "processes": proc_rows,
        "network": net,
        "services": svc,
        "activity": activity,
        "series": {
            "disk": STORE.series("disk"),
            "load": STORE.series("load"),
            "memory": STORE.series("memory"),
        },
        "bottlenecks": [],
        "controls": [
            {"id": "open-emergency-rescue", "label": "Open Emergency Rescue", "kind": "navigation", "target_tab": "emergency", "approval_required": False},
            {"id": "open-docker-cleaning", "label": "Open Docker cleaning actions", "kind": "navigation", "target_tab": "docker", "approval_required": False},
        ],
    }
    snapshot["bottlenecks"] = analytics.bottlenecks(snapshot)
    snapshot["activity"]["recommendations"] = analytics.recommendations(snapshot)
    return snapshot


def iter_live_events(preferred_port: int = 8765):
    last_slow = 0.0
    while True:
        system = cheap_sample()
        yield {"event": "performance", "data": {"kind": "system", "system": system, "series": {"disk": STORE.series("disk"), "load": STORE.series("load"), "memory": STORE.series("memory")}, "ts": time.time()}}

        now = time.time()
        if now - last_slow >= 10:
            yield {"event": "performance", "data": {"kind": "snapshot", "snapshot": get_snapshot(include_slow=True, preferred_port=preferred_port), "ts": now}}
            last_slow = now
        time.sleep(2)


def _activity_snapshot(system: dict, proc_rows: list[dict], svc: list[dict]) -> dict:
    heavy_paths = [
        {"label": "Root disk used", "path": "/", "exists": True, "permission_denied": False, "size_gb": system["disk"].get("used_gb", 0)},
        {"label": "Docker VM disk", "path": "~/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw", "exists": False, "permission_denied": False, "size_gb": 0},
    ]
    automation = [f"{row['pid']} {row['name']} cpu={row['cpu_pct']} mem={row['rss_mb']}MB" for row in proc_rows[:10]]
    return {"heavy_paths": heavy_paths, "automation_processes": automation, "recommendations": [], "service_count": len(svc)}

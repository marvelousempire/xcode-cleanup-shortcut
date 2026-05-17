"""Known service reachability for DustPan's local-first monitor."""

from __future__ import annotations

import socket

from .processes import matching_process_lines


def port_open(host: str, port: int, timeout: float = 0.35) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def known_services(preferred_port: int = 8765) -> list[dict]:
    services = [
        {"id": "dustpan", "label": "DustPan UI", "host": "127.0.0.1", "port": preferred_port},
        {"id": "nephew-loop", "label": "Nephew loop server", "host": "127.0.0.1", "port": 7338},
        {"id": "nephew-loop-legacy", "label": "Nephew loop legacy port", "host": "127.0.0.1", "port": 7337},
        {"id": "n8n", "label": "n8n", "host": "127.0.0.1", "port": 5678},
        {"id": "ollama", "label": "Ollama", "host": "127.0.0.1", "port": 11434},
        {"id": "gitlab", "label": "Self-hosted GitLab", "host": "clinic.yousirjuan.ai", "port": 443},
    ]
    out = []
    for svc in services:
        reachable = port_open(svc["host"], svc["port"])
        out.append({
            **svc,
            "reachable": reachable,
            "status": "online" if reachable else "offline",
            "scope": "local" if svc["host"].startswith("127.") else "remote",
        })

    process_lines = matching_process_lines("Docker|n8n|nephew|ollama|node|python", limit=20)
    out.append({
        "id": "active-automation-processes",
        "label": "Automation processes",
        "host": "localhost",
        "port": 0,
        "reachable": bool(process_lines),
        "status": f"{len(process_lines)} matching processes" if process_lines else "none seen",
        "scope": "local",
        "details": process_lines,
    })
    return out

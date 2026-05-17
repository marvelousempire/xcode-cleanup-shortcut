"""Rule-based bottleneck analysis for realtime Server Performance."""

from __future__ import annotations


def bottlenecks(snapshot: dict) -> list[dict]:
    out: list[dict] = []
    disk = snapshot.get("system", {}).get("disk", {})
    load = snapshot.get("system", {}).get("load", {})
    memory = snapshot.get("system", {}).get("memory", {})
    services = snapshot.get("services", [])
    activity = snapshot.get("activity", {})

    free_gb = disk.get("free_gb", 999)
    if free_gb < 10:
        out.append(_item("critical", "Disk pressure", "Free space is low enough to break Docker, package installs, Xcode builds, and agent runs.", "emergency"))
    elif free_gb < 25:
        out.append(_item("warning", "Low free space", "Free space is low enough to slow builds and installs.", "overview"))

    if memory.get("used_pct", 0) >= 90:
        out.append(_item("critical", "Memory pressure", "Memory use is above 90%; expect swapping and slow agent/tool runs.", "server-performance"))
    elif memory.get("used_pct", 0) >= 75:
        out.append(_item("warning", "Memory pressure building", "Memory use is above 75%; watch for runaway browser, node, or model processes.", "server-performance"))

    if load.get("load_pct", 0) >= 90:
        out.append(_item("warning", "CPU saturation", "CPU load is near or above core capacity.", "server-performance"))

    docker_path = next((p for p in activity.get("heavy_paths", []) if p.get("label") == "Docker VM disk"), None)
    if docker_path and docker_path.get("size_gb", 0) >= 20:
        out.append(_item("warning", "Docker storage pressure", "Docker VM disk is a major space holder. Start with read-only Docker system df.", "docker"))

    offline = [svc for svc in services if svc.get("id") in {"dustpan", "ollama", "n8n"} and not svc.get("reachable")]
    if offline:
        labels = ", ".join(svc["label"] for svc in offline[:3])
        out.append(_item("info", "Service offline", f"Expected local services are offline: {labels}.", "server-performance"))

    if not out:
        out.append(_item("info", "No major bottleneck", "Disk, memory, CPU, and monitored services are inside normal local thresholds.", "server-performance"))
    return out


def recommendations(snapshot: dict) -> list[dict]:
    return [
        {
            "severity": item["severity"],
            "title": item["title"],
            "action": item["detail"],
            "target_tab": item["target_tab"],
        }
        for item in bottlenecks(snapshot)
        if item["severity"] != "info" or item["title"] != "No major bottleneck"
    ]


def _item(severity: str, title: str, detail: str, target_tab: str) -> dict:
    return {"severity": severity, "title": title, "detail": detail, "target_tab": target_tab}

"""Network visibility without packet inspection or firewall mutation."""

from __future__ import annotations

import shutil

from .platform import SYSTEM, run_capture


def snapshot() -> dict:
    if shutil.which("lsof"):
        return _lsof_snapshot()
    if SYSTEM == "linux" and shutil.which("ss"):
        return _ss_snapshot()
    return {"available": False, "listeners": [], "connections": [], "message": "lsof/ss unavailable"}


def _parse_lsof(lines: list[str], limit: int = 80) -> list[dict]:
    out = []
    for line in lines[:limit]:
        parts = line.split()
        if len(parts) < 9:
            continue
        out.append({
            "command": parts[0],
            "pid": int(parts[1]) if parts[1].isdigit() else 0,
            "user": parts[2],
            "protocol": parts[7],
            "name": " ".join(parts[8:]),
        })
    return out


def _lsof_snapshot() -> dict:
    rc_listen, listen_out, listen_err = run_capture(["lsof", "-nP", "-iTCP", "-sTCP:LISTEN"], timeout=4)
    rc_conn, conn_out, conn_err = run_capture(["lsof", "-nP", "-iTCP", "-sTCP:ESTABLISHED"], timeout=4)
    return {
        "available": True,
        "listeners": _parse_lsof(listen_out.splitlines()[1:])[:50] if rc_listen == 0 else [],
        "connections": _parse_lsof(conn_out.splitlines()[1:])[:50] if rc_conn == 0 else [],
        "errors": [err for err in [listen_err if rc_listen else "", conn_err if rc_conn else ""] if err],
    }


def _ss_rows(args: list[str], limit: int = 80) -> list[dict]:
    rc, out, _err = run_capture(["ss", *args], timeout=4)
    if rc != 0:
        return []
    rows = []
    for line in out.splitlines()[1:limit + 1]:
        parts = line.split()
        if len(parts) < 5:
            continue
        rows.append({
            "command": "ss",
            "pid": 0,
            "user": "",
            "protocol": parts[0],
            "name": " ".join(parts[3:]),
        })
    return rows


def _ss_snapshot() -> dict:
    return {
        "available": True,
        "listeners": _ss_rows(["-ltnp"])[:50],
        "connections": _ss_rows(["-tnp", "state", "established"])[:50],
        "errors": [],
    }

"""Process probes shared by Server Performance APIs."""

from __future__ import annotations

import os
import signal

from .platform import run_capture


def top_processes(limit: int = 12) -> list[dict]:
    rc, out, _err = run_capture(["ps", "-axo", "pid,pcpu,pmem,rss,user,etime,comm"], timeout=3)
    if rc != 0:
        return []
    rows = []
    for line in out.splitlines()[1:]:
        parts = line.split(None, 6)
        if len(parts) < 7:
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
            "user": parts[4],
            "elapsed": parts[5],
            "name": os.path.basename(parts[6]) or parts[6],
            "command": parts[6],
            "controllable": _is_user_owned(parts[4]) and pid not in {0, 1, os.getpid()},
        })
    rows.sort(key=lambda row: (row["cpu_pct"], row["rss_mb"]), reverse=True)
    return rows[:limit]


def control_process(pid: int, action: str, confirm: bool = False) -> dict:
    if action not in {"graceful", "force"}:
        return {"ok": False, "error": "invalid_action", "message": "action must be graceful or force"}
    if not confirm:
        return {"ok": False, "error": "confirmation_required", "message": "Explicit confirmation is required."}
    if pid <= 1 or pid == os.getpid():
        return {"ok": False, "error": "protected_process", "message": "DustPan will not stop system pid 0/1 or its own server process."}

    proc = process_detail(pid)
    if not proc:
        return {"ok": False, "error": "not_found", "message": f"PID {pid} is no longer running."}
    if not proc.get("controllable"):
        sig = "-TERM" if action == "graceful" else "-KILL"
        return {
            "ok": False,
            "error": "admin_required",
            "message": "This process is not owned by the current user. Review before running manually.",
            "copy_command": f"sudo kill {sig} {pid}",
            "process": proc,
        }

    if action == "graceful":
        app_quit = _try_gui_app_quit(pid)
        if app_quit.get("sent"):
            return {
                "ok": True,
                "action": action,
                "signal": "APP_QUIT",
                "message": f"Asked {app_quit.get('app_name') or proc['name']} to quit like a macOS app.",
                "process": proc,
            }

    sig = signal.SIGTERM if action == "graceful" else signal.SIGKILL
    try:
        os.kill(pid, sig)
    except ProcessLookupError:
        return {"ok": False, "error": "not_found", "message": f"PID {pid} is no longer running.", "process": proc}
    except PermissionError:
        return {
            "ok": False,
            "error": "admin_required",
            "message": "macOS denied permission. Review before running manually.",
            "copy_command": f"sudo kill {'-TERM' if action == 'graceful' else '-KILL'} {pid}",
            "process": proc,
        }
    return {
        "ok": True,
        "action": action,
        "signal": "TERM" if action == "graceful" else "KILL",
        "message": f"Sent {'TERM' if action == 'graceful' else 'KILL'} to PID {pid}.",
        "process": proc,
    }


def process_detail(pid: int) -> dict | None:
    rc, out, _err = run_capture(["ps", "-p", str(pid), "-o", "pid=,user=,pcpu=,pmem=,rss=,etime=,comm="], timeout=2)
    if rc != 0 or not out.strip():
        return None
    parts = out.strip().split(None, 6)
    if len(parts) < 7:
        return None
    try:
        parsed_pid = int(parts[0])
        cpu = float(parts[2])
        mem = float(parts[3])
        rss_mb = round(int(parts[4]) / 1024, 1)
    except ValueError:
        return None
    return {
        "pid": parsed_pid,
        "user": parts[1],
        "cpu_pct": cpu,
        "mem_pct": mem,
        "rss_mb": rss_mb,
        "elapsed": parts[5],
        "name": os.path.basename(parts[6]) or parts[6],
        "command": parts[6],
        "controllable": _is_user_owned(parts[1]) and parsed_pid not in {0, 1, os.getpid()},
    }


def matching_process_lines(pattern: str, limit: int = 30) -> list[str]:
    rc, out, _err = run_capture(["pgrep", "-lf", pattern], timeout=3)
    if rc != 0:
        return []
    return [line for line in out.splitlines() if line.strip()][:limit]


def _try_gui_app_quit(pid: int) -> dict:
    if not hasattr(os, "uname") or os.uname().sysname != "Darwin":
        return {"sent": False}
    script = (
        'tell application "System Events"\n'
        f'  set targetApps to application processes whose unix id is {pid}\n'
        '  if (count of targetApps) is 0 then return ""\n'
        '  set appName to name of item 1 of targetApps\n'
        'end tell\n'
        'if appName is not "" then tell application appName to quit\n'
        'return appName\n'
    )
    rc, out, _err = run_capture(["osascript", "-e", script], timeout=4)
    app_name = out.strip()
    return {"sent": rc == 0 and bool(app_name), "app_name": app_name}


def _is_user_owned(user: str) -> bool:
    return user == os.environ.get("USER") or user == os.environ.get("LOGNAME")

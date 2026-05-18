from __future__ import annotations

import mimetypes
import os
import time
from pathlib import Path


SCAN_ROOTS = [
    ("Downloads", "~/Downloads"),
    ("Desktop", "~/Desktop"),
    ("Documents", "~/Documents"),
    ("Developer", "~/Developer"),
]

EXTENSION_APPS = {
    ".app": ("Finder / installer", "macOS"),
    ".dmg": ("Browser or installer", "DiskImageMounter"),
    ".pkg": ("Browser or installer", "Installer"),
    ".zip": ("Browser or archive tool", "Archive Utility"),
    ".pdf": ("Browser, Mail, or scanner", "Preview"),
    ".png": ("Screenshot or design tool", "Preview"),
    ".jpg": ("Camera, browser, or design tool", "Preview"),
    ".jpeg": ("Camera, browser, or design tool", "Preview"),
    ".webp": ("Browser or design tool", "Preview / browser"),
    ".mov": ("Screen recording or camera", "QuickTime Player"),
    ".mp4": ("Browser, camera, or export tool", "QuickTime Player"),
    ".md": ("Editor or AI agent", "Cursor / text editor"),
    ".txt": ("Editor, logs, or export", "TextEdit / editor"),
    ".json": ("Developer tool or API export", "Cursor / code editor"),
    ".csv": ("Spreadsheet or export", "Numbers / spreadsheet"),
    ".ts": ("TypeScript editor", "Cursor / code editor"),
    ".tsx": ("React editor", "Cursor / code editor"),
    ".js": ("JavaScript tool", "Cursor / Node.js"),
    ".py": ("Python editor", "Cursor / Python"),
    ".sh": ("Shell script", "Terminal / zsh"),
}


def latest(limit: int = 24) -> dict:
    rows = []
    errors = []
    started = time.time()

    for label, raw in SCAN_ROOTS:
        root = Path(raw).expanduser()
        if not root.exists():
            continue
        try:
            candidates = list(_walk_bounded(root, max_dirs=80, max_files=380))
        except PermissionError:
            errors.append({"root": str(root), "error": "permission_denied"})
            continue
        except OSError as exc:
            errors.append({"root": str(root), "error": str(exc)})
            continue

        for path in candidates:
            try:
                st = path.stat()
            except OSError:
                continue
            if not path.is_file():
                continue
            source_app, runner_app, confidence = _infer_apps(path, label)
            age_seconds = max(0, time.time() - st.st_mtime)
            size_bytes = int(st.st_size)
            size_mb = size_bytes / 1024 / 1024
            rows.append({
                "name": path.name,
                "path": str(path),
                "folder": label,
                "extension": path.suffix.lower() or "(none)",
                "mime": mimetypes.guess_type(path.name)[0],
                "size_bytes": size_bytes,
                "size_mb": round(size_mb, 4),
                "modified_ts": st.st_mtime,
                "created_ts": getattr(st, "st_birthtime", None),
                "age_seconds": round(age_seconds),
                "source_app": source_app,
                "runner_app": runner_app,
                "confidence": confidence,
                "activity_score": _activity_score(age_seconds, size_mb, confidence),
            })

    rows.sort(key=lambda row: row["modified_ts"], reverse=True)
    rows = rows[:limit]
    total_size_bytes = sum(row["size_bytes"] for row in rows)
    return {
        "ts": time.time(),
        "roots": [{"label": label, "path": str(Path(raw).expanduser())} for label, raw in SCAN_ROOTS],
        "items": rows,
        "total_size_bytes": total_size_bytes,
        "total_size_mb": round(total_size_bytes / 1024 / 1024, 4),
        "errors": errors,
        "scan_ms": round((time.time() - started) * 1000),
    }


def _walk_bounded(root: Path, max_dirs: int, max_files: int):
    seen_dirs = 0
    seen_files = 0
    for current, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if not d.startswith(".") and d not in {"node_modules", ".git", "Library"}][:12]
        seen_dirs += 1
        if seen_dirs > max_dirs:
            dirs[:] = []
        for name in files:
            if name.startswith("."):
                continue
            yield Path(current) / name
            seen_files += 1
            if seen_files >= max_files:
                return


def _infer_apps(path: Path, folder: str) -> tuple[str, str, float]:
    ext = path.suffix.lower()
    source, runner = EXTENSION_APPS.get(ext, ("Unknown app", "Finder / default app"))
    confidence = 0.58 if ext in EXTENSION_APPS else 0.32
    lower_path = str(path).lower()

    if folder == "Downloads":
        source = "Browser download"
        confidence = max(confidence, 0.72)
    elif folder == "Desktop" and ext in {".png", ".jpg", ".jpeg", ".mov"}:
        source = "Screenshot or screen recording"
        confidence = max(confidence, 0.7)
    elif "cursor" in lower_path or ext in {".ts", ".tsx", ".js", ".json", ".md", ".py", ".sh"}:
        source = "Developer tool / Cursor"
        confidence = max(confidence, 0.68)
    elif "xcode" in lower_path:
        source = "Xcode"
        runner = "Xcode"
        confidence = max(confidence, 0.74)

    return source, runner, round(min(confidence, 0.95), 2)


def _activity_score(age_seconds: float, size_mb: float, confidence: float) -> float:
    recency = max(0, 100 - min(age_seconds / 86400, 7) * 14)
    size_pressure = min(size_mb / 2048 * 100, 100)
    return round((recency * 0.56) + (size_pressure * 0.24) + (confidence * 100 * 0.2), 1)

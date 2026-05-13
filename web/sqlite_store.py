"""
Dustpan SQLite persistence — default local store (no Docker needed).

Provides the same interface as db.py but uses Python's built-in sqlite3
module. Zero pip installs, zero configuration. Activated automatically
when DATABASE_URL is not set (i.e. every `make ui` run).

Data is stored at ~/Library/Application Support/dustpan/history.db
(macOS convention for user-app data).

Docker/Postgres mode (db.py) takes precedence when DATABASE_URL is set.
"""

import os
import sqlite3
import sys
import threading
import time
from pathlib import Path
from typing import Optional

# ── DB file location ──────────────────────────────────────────────────────────

_DB_DIR  = Path.home() / "Library" / "Application Support" / "dustpan"
_DB_FILE = _DB_DIR / "history.db"

# Thread-local connections — sqlite3 connections must not cross thread boundaries.
_local = threading.local()

# ── DDL ───────────────────────────────────────────────────────────────────────

_MIGRATIONS = [
    """
    CREATE TABLE IF NOT EXISTS runs (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        ts          TEXT    NOT NULL DEFAULT (datetime('now')),
        mode        TEXT    NOT NULL,
        category    TEXT,
        tier        TEXT,
        freed_gb    REAL,
        duration_ms INTEGER,
        disk_before_gb REAL,
        disk_after_gb  REAL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS category_snapshots (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        ts          TEXT    NOT NULL DEFAULT (datetime('now')),
        category    TEXT    NOT NULL,
        safe_gb     REAL    NOT NULL DEFAULT 0,
        optin_gb    REAL    NOT NULL DEFAULT 0,
        caution_gb  REAL    NOT NULL DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS habits (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        category            TEXT    NOT NULL UNIQUE,
        computed_at         TEXT    NOT NULL DEFAULT (datetime('now')),
        growth_gb_per_week  REAL,
        days_to_threshold   INTEGER,
        threshold_gb        REAL    NOT NULL DEFAULT 20.0,
        recommendation      TEXT
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_snapshots_cat_ts
    ON category_snapshots (category, ts DESC)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_runs_ts
    ON runs (ts DESC)
    """,
]

# ── Connection ────────────────────────────────────────────────────────────────

def _conn() -> sqlite3.Connection:
    if not getattr(_local, "conn", None):
        _DB_DIR.mkdir(parents=True, exist_ok=True)
        c = sqlite3.connect(str(_DB_FILE), check_same_thread=False)
        c.row_factory = sqlite3.Row
        c.execute("PRAGMA journal_mode=WAL")
        c.execute("PRAGMA synchronous=NORMAL")
        _local.conn = c
    return _local.conn

def is_available() -> bool:
    """SQLite is always available (stdlib). Always returns True."""
    return True

# ── Migrations ────────────────────────────────────────────────────────────────

def migrate() -> None:
    """Run DDL migrations. Safe to call on every startup."""
    try:
        c = _conn()
        for ddl in _MIGRATIONS:
            c.execute(ddl)
        c.commit()
        print("[sqlite] migrations OK", file=sys.stderr)
    except Exception as e:
        print(f"[sqlite] migration error: {e}", file=sys.stderr)

# ── Query helpers ─────────────────────────────────────────────────────────────

def execute(sql: str, params: tuple = ()) -> None:
    c = _conn()
    c.execute(sql, params)
    c.commit()

def fetchall(sql: str, params: tuple = ()) -> list:
    c = _conn()
    rows = c.execute(sql, params).fetchall()
    return [dict(r) for r in rows]

def fetchone(sql: str, params: tuple = ()) -> Optional[dict]:
    c = _conn()
    row = c.execute(sql, params).fetchone()
    return dict(row) if row else None

# ── Domain helpers (same signatures as db.py) ─────────────────────────────────

def record_snapshot(category: str, scan_result: dict) -> None:
    """Write a category_snapshots row after every scan."""
    safe    = float(scan_result.get("totals", {}).get("safe", 0) or 0)
    optin   = float(scan_result.get("totals", {}).get("probably_safe", 0) or 0)
    caution = float(scan_result.get("totals", {}).get("caution", 0) or 0)
    execute(
        "INSERT INTO category_snapshots (category, safe_gb, optin_gb, caution_gb)"
        " VALUES (?, ?, ?, ?)",
        (category, safe, optin, caution),
    )

def record_run(mode: str, category: Optional[str], tier: Optional[str],
               freed_gb: float, duration_ms: int,
               disk_before_gb: float, disk_after_gb: float) -> None:
    execute(
        "INSERT INTO runs"
        " (mode, category, tier, freed_gb, duration_ms, disk_before_gb, disk_after_gb)"
        " VALUES (?, ?, ?, ?, ?, ?, ?)",
        (mode, category, tier, freed_gb, duration_ms, disk_before_gb, disk_after_gb),
    )

# ── Habit computation ─────────────────────────────────────────────────────────

_DEFAULT_THRESHOLDS = {
    "xcode": 20.0, "llms": 10.0, "docker": 15.0,
    "apps": 5.0, "browsers": 5.0, "downloads": 10.0,
    "temp": 2.0, "archives": 5.0, "system": 5.0,
    "creative": 10.0, "space-eaters": 5.0, "icloud": 10.0,
}

def compute_habits() -> list:
    """
    Compute growth slope for every category using last 28 days of snapshots.
    Uses simple linear regression (GB/day → GB/week).
    Skips categories with fewer than 2 data points.
    """
    rows = fetchall(
        "SELECT category, ts, safe_gb + optin_gb + caution_gb AS total"
        " FROM category_snapshots"
        " WHERE ts > datetime('now', '-28 days')"
        " ORDER BY category, ts"
    )

    from collections import defaultdict
    by_cat: dict = defaultdict(list)
    for r in rows:
        by_cat[r["category"]].append(r)

    habits = []
    for cat, points in by_cat.items():
        if len(points) < 2:
            continue
        # Parse timestamps (SQLite stores as text)
        import datetime
        def _parse(s: str) -> float:
            for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
                try:
                    return datetime.datetime.strptime(s, fmt).timestamp()
                except ValueError:
                    pass
            return 0.0

        t0 = _parse(points[0]["ts"])
        xs = [(_parse(p["ts"]) - t0) / 86400.0 for p in points]
        ys = [float(p["total"]) for p in points]
        n = len(xs)
        xbar, ybar = sum(xs) / n, sum(ys) / n
        denom = sum((x - xbar) ** 2 for x in xs)
        slope_per_day = (
            sum((x - xbar) * (y - ybar) for x, y in zip(xs, ys)) / denom
            if denom > 0 else 0
        )
        slope_per_week = slope_per_day * 7
        current = ys[-1]
        threshold = _DEFAULT_THRESHOLDS.get(cat, 15.0)
        days_left = (
            int((threshold - current) / slope_per_day)
            if slope_per_day > 0 else 9999
        )
        habits.append({
            "category":           cat,
            "growth_gb_per_week": round(slope_per_week, 3),
            "days_to_threshold":  days_left,
            "current_gb":         round(current, 2),
            "threshold_gb":       threshold,
            "recommendation":     None,
        })
    return habits

# Stub-outs for db.py API surface that doesn't apply to SQLite mode.
# (API key vault needs Docker's encrypted Postgres; localStorage handles it otherwise.)
def list_key_providers() -> list:   return []
def get_api_key(p: str) -> None:    return None
def save_api_key(p: str, k: str):   pass
def delete_api_key(p: str):         pass
def get_ollama_settings() -> dict:
    return {
        "url":   os.environ.get("OLLAMA_URL",   "http://localhost:11434"),
        "model": os.environ.get("OLLAMA_MODEL", "llama3.2"),
    }
def save_ollama_settings(url: str, model: str): pass

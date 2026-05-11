#!/usr/bin/env python3
"""Print a sparkline of freed disk space across recent xcode-cleanup runs.

Reads ~/Library/Logs/xcode-cleanup-history.csv (one row per run, written by
xcode-cleanup.applescript) and renders a Unicode block sparkline.
"""
import csv
import sys
from pathlib import Path

CSV = Path.home() / "Library/Logs/xcode-cleanup-history.csv"

if not CSV.exists() or CSV.stat().st_size == 0:
    print("No history yet. Run cleanup at least once (e.g. `make run` or `xcc`).")
    sys.exit(0)

rows = []
with CSV.open() as f:
    for row in csv.reader(f):
        if len(row) >= 5:
            try:
                ts, mode, freed, before, after = row[0], row[1], float(row[2]), float(row[3]), float(row[4])
                rows.append({"ts": ts, "mode": mode, "freed": freed, "before": before, "after": after})
            except (ValueError, IndexError):
                continue

real_runs = [r for r in rows if r["mode"] == "real"]
all_modes = {r["mode"] for r in rows}

if not real_runs:
    print(f"No real cleanup runs yet (found {len(rows)} entries in modes: {', '.join(sorted(all_modes))}).")
    print("Run `make run` or `xcc` (without --dry-run) to populate history.")
    sys.exit(0)

vals = [r["freed"] for r in real_runs][-30:]
mn, mx = min(vals), max(vals)
rng = mx - mn or 1
blocks = "▁▂▃▄▅▆▇█"
spark = "".join(blocks[int((v - mn) / rng * (len(blocks) - 1))] for v in vals)

total_freed = sum(r["freed"] for r in real_runs)
avg_freed = total_freed / len(real_runs)

print(f"Xcode Cleanup history — last {len(vals)} real runs")
print(f"  freed:  {spark}")
print(f"          min {mn:.1f} GB · max {mx:.1f} GB · avg {avg_freed:.1f} GB")
print(f"  total reclaimed: {total_freed:.1f} GB across {len(real_runs)} runs")
print(f"  log entries: {len(rows)} total ({len(real_runs)} real, {len(rows) - len(real_runs)} dry-run/demo)")

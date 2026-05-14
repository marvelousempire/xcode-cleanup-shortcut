# Plan 0021 — Emergency Rescue panel

**Status:** shipped (v0.21.4 panel + SADPA auto-navigate, v0.21.5 real-time freed counters)

## Context

When `df -h /` shows 0 bytes free, the regular DustPan UI can't run cleanly — Vite needs disk for caches, npm tarballs need scratch space. The user is stuck: the disk-cleanup tool can't help with the disk-cleanup problem.

Need a panel that loads with **zero category-scan overhead**, presents the well-known safe recovery commands as numbered cards, and streams output to an in-app terminal so the user doesn't have to leave DustPan to fix the emergency.

## Approach

**New tab `🚨 Emergency Rescue`** always present in the sidebar:

- Six numbered command cards (each with explanation, exact shell, plain-English cost):
  1. Clear Xcode DerivedData
  2. Clear iOS DeviceSupport
  3. Clear macOS mediaanalysisd cache
  4. Clear Xcode DocumentationIndex
  5. `docker system prune -a`
  6. `df -h /` (read-only diagnostic)
- A "▶▶ Run All Emergency Commands" button that chains the cleanup commands with progress markers.
- Two foreign-ownership diagnostic cards (added in plan 0024).
- Header with live disk metrics: free / freed-this-session / commands-done. Animated bar with green recovery overlay.

**SADPA auto-navigation** (in `DashboardContext.tsx`):
- `free_gb < 1` → automatically switch to the Emergency tab on startup
- `free_gb < 10` → kick off a background full-scan so QuickWins / Survey have real data

**Backend** — new `emergency` category in `cleaners.py` with 7 actions (6 cleanup + 1 informational). Each action is a regular `cleaners.py` action so it routes through the existing `/api/run` SSE path without new infrastructure.

**Real-time calculation fix (v0.21.5):**
- Add `runActionDirect(catId, actionId, label, onDone?)` to context — same path as `runAction` but skips the confirm dialog and exposes `freed_gb` via callback.
- EmergencyPanel cards wire `onDone` to update per-card state from the actual SSE `done` event (kernel-reported delta), not a fake 1500ms timer.
- Header "Freed this session" uses `current_free_gb − baseline_at_mount` so the truth source is the OS.

## Critical files

| File | Action |
|---|---|
| `web/cleaners.py` | Add `emergency` category with 7 actions (~140 lines) |
| `apps/web/src/components/EmergencyPanel.tsx` | NEW (~370 lines) |
| `apps/web/src/state/DashboardContext.tsx` | Add `runActionDirect()` + SADPA auto-navigate refs |
| `apps/web/src/App.tsx` | Route `activeTab === "emergency"` |
| `apps/web/src/components/SidebarLeft.tsx` | "🚨 Emergency Rescue" footer entry |
| `apps/web/src/components/DiskAlarmBar.tsx` | CTA → emergency tab at critical level |
| `dustpan.applescript` | kVersion 0.21.3 → 0.21.4 → 0.21.5 |

## Verification

1. `make ui` → Emergency Rescue tab loads with 6 numbered cards even on a fresh clone.
2. With `free_gb < 1` on startup, DashboardContext auto-switches to the emergency tab.
3. Clicking "▶ Run this" on a card streams `rm -rf` output into the in-app terminal AND updates the per-card freed-GB counter from the SSE `done` event.
4. Run All button chains all 5 cleanup commands with progress markers.
5. Two foreign-ownership informational cards (plan 0024) render between cleanup commands and `df -h` check.

# Plan 0024 — Foreign-ownership discovery (unlock space locked by previous users)

**Status:** shipped (v0.24.0)

## Context

macOS gives every file an owner. On Macs that were used by multiple users, inherited, or migrated from another account, **huge amounts of disk space (often 5–50 GB) sit locked behind UIDs that aren't the current user's login**. Standard cleaners can't see this because they scan as the current user.

Real cases:
- `/opt/homebrew` owned by 'olivia' from a previous owner — `brew` fails for the current user; 12 GB invisible.
- `/Users/contractorname/` left over from a re-assignment — 30 GB hidden in plain sight.
- `/Users/Guest` with stale guest data.

The unlock is one shell command (`sudo chown -R $(whoami) <path>`) but it has to be discovered, the right path identified, and the operation user-authorized via macOS's own sudo prompt — DustPan can't run sudo itself (and shouldn't — ownership transfer is permanent).

## Approach

**Add `discover_foreign_ownership()` thread to `_stream_survey()`** (plan 0022). Runs in parallel with the existing 3 discoverers.

**Detection logic:**

1. Walk fixed candidate roots:
   - `/opt/homebrew` — Homebrew on Apple Silicon
   - `/opt/local` — MacPorts
   - `/usr/local/Homebrew` — Intel-era Homebrew
   - `/usr/local/Cellar` — Intel-era Cellar
   - `/Users/*` — enumerate immediate children, skip current user / `Shared` / `.localized` / root-owned / dotfiles

2. For each candidate, `stat` the owner UID:
   - If UID resolves to a name via `pwd.getpwuid()` → use it
   - If UID doesn't resolve (deleted account) → return as `uid-NNN` with `owner_exists: false`
   - Skip if owner == current user or owner is root (UID 0)

3. `du -sh` each finding (15–20s timeout)

4. Emit as `SurveyTarget` with new `confidence: "takeover"` tier and these extra fields:
   - `owner` (username or `uid-NNN`)
   - `owner_uid`
   - `owner_exists` (bool)
   - `takeover_command` (the exact `sudo chown -R $(whoami) <path>` command)

**Surfaces:**

**Survey panel** — dedicated `🔒 Locked by previous users — X.X GB recoverable` section rendered **above** the regular ranked table. Filter takeover-confidence targets out of the regular table (they have their own section).

**TakeoverCard** component — each card expandable to show:
- Owner badge (`owner: olivia` or `owner: abrownsanta (gone)` for deleted accounts)
- The exact command in a monospace block with `[📋 Copy]` button
- For old user homes: both options shown (delete with `sudo rm -rf` OR chown to take ownership)
- Recoverable size + cost-to-rebuild tiles
- Explicit note: "DustPan can't run sudo — macOS requires you to type your password in Terminal directly"

**Emergency Rescue** — two new informational commands (don't delete, just diagnose):
- `emergency-find-foreign-owned` — full sweep with per-finding sudo commands streamed to terminal
- `emergency-takeover-homebrew` — focused on the canonical `/opt/homebrew` case

**AI agent** — new tool `find_foreign_ownership` (Tier A, read-only). Returns structured findings the agent can summarize in conversational form.

## The DustPan-never-runs-sudo boundary

**Critical design decision:** the app never runs `sudo`. Reasons:

1. **Ownership transfer is permanent** — once you `chown -R`, the original user can't reach those files anymore. `rm -rf` on a home dir is irreversible. macOS's sudo password prompt is the correct consent gate.
2. **Security model**: routing sudo through a third-party app would weaken it. DustPan should never ask for your Mac password; that prompt should always be the OS asking.

DustPan does:
- ✅ Discover foreign-owned paths
- ✅ Measure sizes
- ✅ Map UIDs to usernames + flag orphan UIDs
- ✅ Generate the exact recovery command
- ✅ Provide a Copy button
- ✅ Explain what the command does
- ❌ Never runs the command itself

## Critical files

| File | Action |
|---|---|
| `web/server.py` | `discover_foreign_ownership()` thread inside `_stream_survey` (~130 lines) |
| `web/agent_tools.py` | New `find_foreign_ownership` tool (~80 lines) — Tier A read-only |
| `web/cleaners.py` | Two new informational actions in `emergency` category (~100 lines) |
| `apps/web/src/components/SurveyPanel.tsx` | `confidence: "takeover"` tier + owner fields + TakeoverCard (~150 added lines) |
| `apps/web/src/components/EmergencyPanel.tsx` | Two new read-only command cards |
| `dustpan.applescript` | kVersion 0.23.0 → 0.24.0 |

## Verification

1. On a Mac with `/opt/homebrew` owned by a non-current user, run Space Survey. The "🔒 Locked by previous users" section appears with that path, the owner badge, and the chown command.
2. On a Mac with `/Users/<oldname>/` present, the same survey shows it with both delete and chown options. Owner shows `(gone)` if the user is deleted.
3. Click "🔧 Emergency Rescue → 🍺 Get the Homebrew takeover command" → streams the diagnostic + the exact sudo command to the terminal. No sudo is run.
4. Ask SADPA in chat: "Is any disk space locked by other users?" → calls `find_foreign_ownership`, summarizes in conversational form with the same commands.
5. The Copy buttons write the command to clipboard (verified via `pbpaste`).

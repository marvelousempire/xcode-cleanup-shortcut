# Real-Time Handoff Sheet

> The single source of truth for "what's the state of this repo right now?"
> Edit this in place. Don't append a new section per handoff — overwrite stale lines.

**Last updated:** 2026-05-08
**Updated by:** v0.2 PR

---

## TL;DR

v0.2 is in PR right now. Adds dry-run + demo + force flags, a Makefile with 10 targets, recording instructions for the README GIF, and a CHANGELOG. Shortcut UX is unchanged for non-flag users. One outstanding follow-up: capture the progress-bar GIF for the README (instructions in `assets/RECORDING.md`, target `make record-demo`).

## Current status

- ✅ v0.1 shipped to `main` (initial release)
- 🟡 v0.2 PR open: dry-run, demo, force, Makefile, CHANGELOG
- ⬜ Progress-bar GIF not yet captured (placeholder reference in README)
- ⬜ No CI yet (`make check` could be wired into GitHub Actions for v0.3)

## In flight right now

PR #1 (`v0.2-dry-run-makefile` branch). Diff is purely additive plus README expansion — no risk to existing v0.1 install.

## Recent decisions

| Date | Decision | Why |
|---|---|---|
| 2026-05-08 | Build as a Shortcut + Run AppleScript, not a Mac app | Lower friction, no signing, native progress + notifications, schedulable. |
| 2026-05-08 | 50 GB threshold, hardcoded | Reasonable absolute floor for an active dev machine. Easy to edit. |
| 2026-05-08 | Skip `Archives/` and active simulator devices | Preserves crash symbolication and installed simulator state. |
| 2026-05-08 | `xcrun simctl delete unavailable`, not `erase all` | Removes only simulators whose runtime is uninstalled. |
| 2026-05-08 | `/tmp` orphan patterns are explicit globs | Avoids nuking active scratch (e.g. Claude session state under `/private/tmp/claude-*`). |
| 2026-05-08 | v0.2 flags via env vars (system attribute), not Shortcut variables | Keeps the Shortcut path one-paste; flags are for power users invoking via Makefile. |
| 2026-05-08 | Dry-run uses `du -sk` per phase, not df-delta | Df-delta would be 0 in dry-run; per-phase measurement gives the answer the user wants. |

## Blockers

None.

## Open questions (mirrored from PRD)

1. **Threshold: absolute GB or percentage?** — currently 50 GB hardcoded.
2. **Ship a prebuilt `.shortcut` bundle?** — saves install friction but bundles are tied to creator's iCloud signature. v0.2 mitigates with `make install-shortcut`.

## Next steps (in priority order)

1. **Merge v0.2 PR** once green / once owner reviews.
2. **Capture progress-bar GIF** via `make record-demo` and commit to `assets/`. Open a follow-up PR.
3. **(v0.3)** Per-phase opt-out env vars.
4. **(v0.3)** GitHub Actions workflow that runs `make check` on every PR.
5. **(v0.3)** History log appended to `~/Library/Logs/xcode-cleanup.log`.
6. **(future)** SwiftBar plugin sibling repo if usage merits a live menu-bar indicator.

## Key files

| File | What it is |
|---|---|
| `xcode-cleanup.applescript` | The canonical script. The whole product is this one file. |
| `Makefile` | CLI targets for users who'd rather run from terminal than Shortcuts. |
| `README.md` | User-facing install + usage. |
| `PRD.md` | Why this exists, what's in / out of scope, success metrics. |
| `CHANGELOG.md` | Version history. |
| `HANDOFF.md` | This file. Overwrite, don't append. |
| `assets/RECORDING.md` | How to capture the README progress-bar GIF. |
| `LICENSE` | MIT. |

## Contact / context

- Maintainer: [@marvelousempire](https://github.com/marvelousempire)
- Origin: extracted from a Red-E Play dev workflow where DerivedData regularly hit 19 GB and `/private/tmp` accumulated multi-GB sandbox orphans from `xcodebuild`-driven scratch sessions.

# Real-Time Handoff Sheet

> The single source of truth for "what's the state of this repo right now?"
> Edit this in place. Don't append a new section per handoff — overwrite stale lines.

**Last updated:** 2026-05-08
**Updated by:** initial scaffold

---

## TL;DR

v0.1 of the Xcode Cleanup Shortcut is shipped to `main` and works end-to-end. The canonical AppleScript is `xcode-cleanup.applescript`. No open work, no blockers. PRD has a v0.2 wishlist if anyone wants to pick something up.

## Current status

- ✅ Repo scaffolded
- ✅ AppleScript v0.1 committed and tested manually on the maintainer's machine
- ✅ README, PRD, HANDOFF, LICENSE in place
- ⬜ No CI yet (probably not needed — script is too short to test meaningfully)
- ⬜ No `.shortcut` bundle export (open question in PRD)

## In flight right now

Nothing. Repo is at rest.

## Recent decisions

| Date | Decision | Why |
|---|---|---|
| 2026-05-08 | Build as a Shortcut + Run AppleScript, not a Mac app | Lower friction, no signing, native progress + notifications, schedulable. |
| 2026-05-08 | 50 GB threshold, hardcoded | Reasonable absolute floor for an active dev machine. Easy to edit. |
| 2026-05-08 | Skip `Archives/` and active simulator devices | Preserves crash symbolication and installed simulator app state. |
| 2026-05-08 | Use `xcrun simctl delete unavailable`, not `erase all` | Removes only simulators whose runtime is uninstalled; leaves active sims intact. |
| 2026-05-08 | `/tmp` orphan patterns are explicit globs, not `/tmp/*` | Avoids nuking active scratch (e.g. Claude session state under `/private/tmp/claude-*`). |

## Blockers

None.

## Open questions (mirrored from PRD)

1. **Threshold: absolute GB or percentage?** — currently 50 GB hardcoded. Untested on small drives.
2. **Ship a prebuilt `.shortcut` bundle?** — saves install friction but bundles are tied to creator's iCloud signature.
3. **Dry-run mode?** — would land in v0.2 if anyone wants it.

## Next steps (in priority order)

1. **Use it for a few weeks.** Confirm the thresholds and `/tmp` patterns are right before adding features.
2. **(v0.2)** Dry-run env var. Easy win.
3. **(v0.2)** Per-phase opt-out variables (`SKIP_SIMS=1`, etc.).
4. **(v0.2)** Append a one-line entry to `~/Library/Logs/xcode-cleanup.log` per run.
5. **(future)** SwiftBar plugin sibling repo if this gets enough use to want a live menu-bar indicator.

## Key files

| File | What it is |
|---|---|
| `xcode-cleanup.applescript` | The canonical script. The whole product is this one file. |
| `README.md` | User-facing install + usage. |
| `PRD.md` | Why this exists, what's in / out of scope, success metrics. |
| `HANDOFF.md` | This file. Overwrite, don't append. |
| `LICENSE` | MIT. |

## Contact / context

- Maintainer: [@marvelousempire](https://github.com/marvelousempire)
- Origin: extracted from a Red-E Play dev workflow where DerivedData regularly hit 19 GB and `/private/tmp` accumulated multi-GB sandbox orphans from `xcodebuild`-driven scratch sessions.

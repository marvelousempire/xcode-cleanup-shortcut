# HANDOFF — Cleanup Hub

> The bridge document. Read this first whenever you (a fresh Claude Code session, a teammate, or future-you) sit down at this repo. Everything else either feeds into this file or is referenced from it.

**Last updated:** 2026-05-12 (v0.10.0)
**Repo:** [`marvelousempire/xcode-cleanup-shortcut`](https://github.com/marvelousempire/xcode-cleanup-shortcut)
**Latest release:** [`v0.10.0`](https://github.com/marvelousempire/xcode-cleanup-shortcut/releases) on `main`
**Maintainer:** [@marvelousempire](https://github.com/marvelousempire)

---

## TL;DR

Free, MIT, **localhost-only Mac cleanup dashboard** that finds disk-hogging caches across Xcode, LLM tools (Claude / Cursor / ChatGPT), everyday apps (browsers, chat, Spotify, Homebrew), and macOS system junk. **~70 paths · 21+ actions · 6 categories · 5 install surfaces.** Every action shows the *cost of doing this* before you click. Reaches the user via a web UI (`make ui`), an Apple Shortcut, a CLI (`xcc`), an hourly launchd agent, a SwiftBar menu-bar plugin, or `Run Script Over SSH` for remote Macs — all backed by one AppleScript + one cleaners.py.

The most recent strategic move is now active: **`marvelousempire/ai-skills-library`** is the authoritative source for design + marketing + project skills and operating rules. A fresh session can lean on those instead of re-deriving everything.

---

## The 60-second bootstrap for a fresh session

1. **Read `README.md`** — current pitch, install matrix, "what would be cleaned" overview.
2. **Read this file** (`HANDOFF.md`) for state + read-order.
3. **Read [`docs/Redesign-Brief.md`](docs/Redesign-Brief.md)** — the brief for the next phase of work. Includes which skills to chain, which design references to consult, what to preserve vs. reconsider, and a suggested 60-minute starting workflow.
4. **Skim [`docs/Feature Ledger.md`](docs/Feature%20Ledger.md)** — per-feature status grid (✅ shipped, 🔜 next, ❌ deferred). Tells you what already works without you having to run it.
5. **Skim the top 5 entries of [`docs/Issue-Log.md`](docs/Issue-Log.md)** — recent near-misses, gotchas, and lessons. Saves re-hitting walls.
6. **Read [`.agents/product-marketing-context.md`](.agents/product-marketing-context.md)** — 230-line positioning doc. Every copywriting / page-cro / launch-strategy / customer-research skill reads this first.

Run the app once:

```sh
cd ~/Developer/xcode-cleanup-shortcut && git pull && make ui
```

Browser opens to `http://127.0.0.1:8765` (or the next free port). Five seconds in you'll see what it does.

---

## Current pipeline state (per `dev-discipline` rule)

| Stage | Status |
|---|---|
| Committed | ✅ all work in `main` |
| Pushed | ✅ no orphan branches |
| PR'd | ✅ feature-branch workflow active since v0.9.0 |
| Merged | ✅ no open PRs |
| **Deployed (live)** | ✅ v0.10.0 tagged + GH-released by `release-on-version-bump` workflow |

No work is invisible. No bare branches. No untagged versions.

---

## The skill toolkit available globally

As of 2026-05-12, **58 skills** are available in every Claude Code session via `~/.claude/skills/`. The authoritative source is `marvelousempire/ai-skills-library` cloned at `~/Developer/ai-skills-library`. Refresh anytime with:

```sh
bash ~/.claude/sync-skills-library.sh
```

| Family | Count | Source | Likely use here |
|---|---|---|---|
| **Marketing** | 41 | `~/.agents/skills/*` (vendored from upstream into library) | `copywriting` for README, `page-cro` for dashboard conversion, `aso-audit` if we ever ship a .app, `launch-strategy` for Show HN, `customer-research` for verbatim VoC |
| **Visual design** | 2 | library | `ui-ux-pro-max` (comprehensive design guide: palettes, fonts, UX patterns), `emil-design-eng` (Emil Kowalski's polish + animation philosophy) |
| **Project / red-e-play** | 2 | library | `verify-ship` (pipeline-state audit), `generate-weather-plates` (not relevant here) |
| **External tool bridges** | 11 | library | `blender-mcp`, `claude-mem`, `kokoro-fastapi`, `ltx-2`, `open-generative-ai`, `ruflo`, `scrapegraph-ai`, `voice-chat-ai`, `voicebox`, `voxtral-tts-c`, `claude-code-local` |
| **Mobile iOS** | 2 | library | `cornhole-arena-…`, `immersive-cinematic-sports-broadcast-arena-sop` — not directly relevant unless you spin off the macOS app idea |

For copy / UX work, the chain is typically:
**`product-marketing-context`** → **`customer-research`** (validate VoC) → **`copywriting`** (rewrite hero) → **`page-cro`** (full-page structure) → **`launch-strategy`** (release plan).

For design work specifically:
**`ui-ux-pro-max`** (system-level decisions: palette, typography, spacing) → **`emil-design-eng`** (component-level polish: transitions, micro-interactions, opinionated details).

External design references the next session should treat as authoritative:
- **Motion ([motion.dev](https://motion.dev), formerly Framer Motion)** — animation library. GitHub: [`motiondivision/motion`](https://github.com/motiondivision/motion). Use the vanilla-JS API via CDN (preserves zero-deps) or `motion/react` if migrating to React. Spring physics + layout animations + `AnimatePresence` + gestures are the primitives.
- **[21st.dev/community/components/s/hero](https://21st.dev/community/components/s/hero)** — 284 hero patterns. Mine for design inspiration; pick 2–3 that fit the positioning in `.agents/product-marketing-context.md`.

---

## Operating rules (compiled into this repo's `.cursor/rules/` and `.claude/rules/`)

Source: [`marvelousempire/ai-skills-library/rules/`](https://github.com/marvelousempire/ai-skills-library/tree/main/rules/library)

- **`dev-discipline`** — session opener + closer rituals: explicit `git add`, no orphan branches, name the pipeline stage, `pnpm build` for marketing (N/A here), don't merge from inside a worktree, branch-first.
- **`changelog-and-versioning`** — every user-visible change → new section in `docs/CHANGELOG.md` with `## [0.x.y] — YYYY-MM-DD HH:MM:SS Eastern · *tagline*`. Bump matches the code change. Same commit as the code.
- **`go-live-path`** — never defer the go-live story. State migrate / deploy / smoke-test in the same response that ships the change. No exceptions for "forced" or urgent ships.

These were retrofitted in v0.9.0. From v0.9.0 onward, every change has followed them.

---

## What's in the repo

| Path | Purpose |
|---|---|
| **`dustpan.applescript`** | The original product — the AppleScript that the Apple Shortcut runs. Native progress bar + macOS notifications. ~250 lines. |
| **`scripts/remote-cleanup.sh`** | Pure-shell version for SSH / headless / CI. No UI. Same cleanup logic. |
| **`scripts/report.py`** | Reads `~/Library/Logs/dustpan-history.csv` → renders Unicode-block sparkline. Powers `make report` and `xcc --report`. |
| **`bin/xcc`** | CLI wrapper. `make install-cli` symlinks to `~/.local/bin/xcc`. |
| **`launchd/com.marvelousempire.dustpan.plist`** | Hourly background-cleanup LaunchAgent. `make install-launchd`. |
| **`swiftbar/dustpan.30m.sh`** | SwiftBar menu-bar plugin. Click to clean. |
| **`web/server.py`** | Localhost-only Python HTTP server. Stdlib only — no pip. Routes `/api/category/<id>/{scan,actions}`, `/api/run`, `/api/clean-path`, `/api/clean-all-safe`, `/api/clean-everything`, `/api/status`, `/api/changelog`, `/api/report`. SSE streams for cleanup output. Dynamic port discovery (falls back from 8765). Parallel `du` via ThreadPoolExecutor. |
| **`web/cleaners.py`** | **Single source of truth** for what gets cleaned. ~70 path definitions across 6 categories, each with a cost annotation. Add a new cleanup phase here and the UI / CLI / launchd all pick it up. |
| **`web/index.html`** | The dashboard. Tabbed UI, frosted-glass cards, SSE streaming output, version badge that reads from CHANGELOG, click-to-open changelog modal. Vanilla JS, system fonts, dark-mode auto via `prefers-color-scheme`. |
| **`docs/CHANGELOG.md`** | 20+ entries in canonical format. Backfilled v0.1 → present. |
| **`docs/Feature Ledger.md`** | 43-row feature status grid. |
| **`docs/Issue-Log.md`** | 10 backfilled near-misses with symptom/diagnosis/fix/prevention. |
| **`docs/SHORTCUTS.md`** | Paste-ready Apple-Shortcuts blocks (Run Shell Script + Run Script Over SSH + Run AppleScript). |
| **`docs/Launch-Plan.md`** | Full Show-HN / Reddit / Mastodon launch playbook (generated via `launch-strategy` skill). |
| **`docs/Redesign-Brief.md`** | **The action document for the next phase** — what to redesign, with which skills, what to preserve. |
| **`.agents/product-marketing-context.md`** | 230-line positioning doc (generated via `product-marketing-context` skill). Read by every other marketing skill. |
| **`PRD.md`** | F-requirements (F1–F29) with ✅/⬜ status. |
| **`README.md`** | The user-facing landing. Rewritten via `copywriting` skill in v0.4.2. |
| **`.github/workflows/check.yml`** | macOS-latest CI — runs `make check` on every push/PR. |
| **`.github/workflows/release.yml`** | Auto-tag + auto-release when commit message starts with `vX.Y.Z:`. Pulls notes from the matching `## [X.Y.Z]` block in `docs/CHANGELOG.md`. |

---

## Outstanding work

| # | Item | Where it's tracked |
|---|---|---|
| 1 | **Progress-bar GIF for README** — interactive screen-recording task. Run `make record-demo` on a clean desktop, sanitize the screen, capture, convert, commit. | [Issue #2](https://github.com/marvelousempire/xcode-cleanup-shortcut/issues/2) |
| 2 | **JS lint in CI** — add `node --check` (or eslint) to the `check.yml` workflow so duplicate-const errors like v0.8.2 can never reach `main`. | Issue-Log entry 2026-05-12 11:17 ET |
| 3 | **Linux path set** in `cleaners.py` — structure supports per-OS, just needs paths added. | Feature Ledger row 47 |
| 4 | **Per-category history charts** — extend `report.py` to break down freed-GB by category, not just total. | Wishlist (Feature Ledger §Next) |
| 5 | **Browser cache-buster on version bump** — append `?v={kVersion}` to HTML asset URLs so cached versions invalidate on every release. Prevents the "I don't see the new UI" support thread we hit on v0.8.1 → v0.8.2. | Issue-Log entry 2026-05-12 11:17 ET |
| 6 | **Sub-task or full redesign**: see [`docs/Redesign-Brief.md`](docs/Redesign-Brief.md). | — |

---

## Most recent decisions

| Date | Decision | Why |
|---|---|---|
| 2026-05-12 | `marvelousempire/ai-skills-library` is authoritative for skills + rules | One source of truth across machines and sessions. Library is git-cloned at `~/Developer/ai-skills-library`; `~/.claude/sync-skills-library.sh` symlinks into `~/.claude/skills/`. |
| 2026-05-12 | CHANGELOG moved to `docs/CHANGELOG.md`, canonical header format | Per `changelog-and-versioning` rule. Header format: `## [0.x.y] — YYYY-MM-DD HH:MM:SS Eastern · *tagline*`. |
| 2026-05-12 | PR-first workflow from v0.9.0 onward | Per `dev-discipline`. Direct-to-main was fine for rapid prototype; not from now on. |
| 2026-05-12 | Three safety tiers (safe / probably_safe / caution) baked into the data model | Codifies "factory-fresh without losing your stuff." Caution paths never auto-delete. |
| 2026-05-12 | Every action surfaces a *cost-of-doing-this* annotation | The orange banner in the UI tells the user what they lose. Lets users make informed trades. |
| 2026-05-12 | `cleaners.py` is the single source of truth | Categories, paths, actions, costs — all in one Python module. Server is pure routing. |

---

## How to ship from here

1. **Branch first**: `git checkout -B feature/<short-name> origin/main`
2. **Edit. Test. Commit by explicit path.** (Never `git add -A`.)
3. **CHANGELOG entry in the same commit.** New section in `docs/CHANGELOG.md` with the canonical header (Eastern timestamp + tagline).
4. **If a feature changes status**: update `docs/Feature Ledger.md`. If anything took longer than expected: add an `Issue-Log.md` entry.
5. **Bump `property kVersion`** in `dustpan.applescript` if the version changed. (UI badge reads from CHANGELOG live, so don't forget the CHANGELOG.)
6. **Push the branch, open a PR.** Use `vX.Y.Z: <tagline>` as the PR title — this is what triggers auto-release on merge.
7. **Wait for CI** (~10 seconds).
8. **`cd` to main checkout, then `gh pr merge <N> --squash --delete-branch`.** Never merge from inside the branch directory (per `dev-discipline`).
9. **State the go-live path** in your final message — for this repo it's always `cd ~/Developer/xcode-cleanup-shortcut && git pull && make ui`.

---

## How to redesign from here

See [`docs/Redesign-Brief.md`](docs/Redesign-Brief.md). It assumes you've read this file first.

# Plans

Every substantive change to Dustpan starts with a plan that lives in this
folder, checked into git. The plan is the source of truth for *why* a change
happened. Git history tells the *what*.

## Convention

- **Filenames:** `NNNN-snake-case-title.md` where `NNNN` is a zero-padded integer
  starting at `0001`. Numbers are append-only — never re-used, never re-numbered.
- **One plan per file.** Never edit an old plan to "update" it — supersede it
  with a new plan that links back to the old one.
- **Required sections, in order:**
  - **Context** — why this change is being made, what prompted it, the
    intended outcome. The "why".
  - **Approach** — the one approach we're picking (not all the alternatives).
    Concrete shape: filenames, columns, endpoints, signatures.
  - **Critical files** — paths that will be created or modified.
  - **Verification** — how we'll know the change worked, end-to-end.
- **Status line at the top** when a plan ships:
  `Status: shipped (commit <sha>, v<version>)` — or
  `Status: partially shipped — <sub-sections> shipped, <what> deferred to plan NNNN`.

## Why this folder exists

Plans get lost in chat. Plans get lost in `~/.claude/plans/` (a local-only
directory that's session-scoped and unsearchable from anywhere else). By
writing them into the repo we get:

- **Searchable history.** Six months from now, "*why did we add the running-
  cleans widget?*" has an answer in `plans/0007-…` instead of "I think Claude
  suggested it during the v0.15 work."
- **Continuity across sessions.** A new Claude Code session can read `plans/`
  and pick up where the last left off. No reverse-engineering from git
  history alone.
- **A defensible record** when something looks odd in the code six months
  later — the plan that proposed it sits right here.

## Index

| # | Title | Status | Version |
|---|---|---|---|
| [0001](0001-cleanup-hub-v1-redesign.md) | Cleanup Hub v1 redesign — design system + dashboard restructure + motion polish + README rewrite | shipped | v0.11.x – v0.13.x |
| [0002](0002-dustpan-readme-under-the-hood.md) | Dustpan README — add "🛠️ Under the hood" tech-stack section | shipped | v0.19.3 |
| [0003](0003-database-tier-guide-for-future-apps.md) | Database tier guide for future apps — SQLite / Docker Postgres / Homebrew Postgres decision tree + Makefile templates | shipped — superseded by 0004 | v0.19.5 |
| [0004](0004-canonical-docker-stack-template.md) | Canonical Docker stack template (cloned from claude-chat-reader) — binary rule: state = Docker, no state = no Docker | shipped | v0.19.6 |
| [0005](0005-terminal-theme-support.md) | Terminal theme support — white bg on light mode, dark bg on dark mode, with WCAG-correct text contrast for all status and ANSI colors | shipped | v0.19.7 |
| [0006](0006-docker-ai-habits-engine.md) | Docker stack + AI engine + habit learning — pgvector DB, encrypted key vault, OpenAI/Anthropic/Groq/Gemini/Perplexity/Ollama, growth-slope habit engine, AI summaries | shipped | v0.20.0 |
| [0007](0007-space-eaters-scanner-expansion.md) | Space Eaters — fix stale browser paths, add Telegram/WhatsApp/Signal, iOS backups, dev caches, iCloud Drive eviction | shipped | v0.20.1 |
| [0008](0008-permission-detection-zeros-fix.md) | Fix zeros: FDA permission detection, Archives/System/iCloud path fixes, clean-button UX | shipped | v0.20.3 |

| [0009](0009-disk-doctor-active-diagnosis.md) | Disk Doctor — QuickWins, RescueBanner, /api/doctor, Xcode DocumentationIndex, active diagnosis without AI | shipped | v0.20.6 |
| [0010](0010-ai-diagnosis-agent.md) | One-shot SADPA agent — rule-based fallback + optional LLM, SSE streams thinking/context/analysis/done | shipped | v0.20.7 |
| [0021](0021-emergency-rescue-panel.md) | Emergency Rescue panel — disk-at-zero rescue with 6 numbered cards + SADPA auto-navigate + real-time freed counters | shipped | v0.21.4 / v0.21.5 |
| [0022](0022-space-survey.md) | Space Survey — live-streaming filesystem crawl (worktrees, build artifacts, large node_modules) with per-worktree merge status and "Probably not worth touching" section | shipped | v0.22.0 / v0.22.1 |
| [0023](0023-conversational-sadpa-agent.md) | Conversational SADPA with tool-calling (Anthropic + OpenAI), sandboxed filesystem peek, approval gates, and AI cleaner proposals with paste-ready snippets | shipped | v0.23.0 (Ship 1) / v0.25.0 (Ship 2) |
| [0024](0024-foreign-ownership-discovery.md) | Foreign-ownership discovery — find disk space locked behind previous users' UIDs (`/opt/homebrew` owned by 'olivia', `/Users/<oldname>/`, Guest leftovers) with copy-paste takeover commands | shipped | v0.24.0 |
| [0027](0027-disk-growth-watch-3m-9m-20m-deltas.md) | Disk Growth Watch — sliding 3m/9m/20m deltas (`/api/growth`, Overview) | shipped | pending tag |
| [0028](0028-full-viewport-responsive-dashboard-shell.md) | Full-viewport responsive dashboard shell — no max-width gutter, fluid sidebars, dvh-safe root | drafted | pending tag |
| [0029](0029-xcode-build-rescue.md) | Xcode Build Rescue — disk/process diagnostics + guarded cleanup for DerivedData, DeviceSupport, SwiftPM, and Xcode caches | drafted | v0.27.6 |
| [0030](0030-dev-build-rescue-payload.md) | Dev Build Rescue Payload — adds Claude VM bundle cleanup + LLM heavy-hitter diagnosis to the Xcode build rescue path | implemented in working tree | v0.27.7 |
| [0031](0031-ai-agent-rules-handbook.md) | AI_AGENT_RULES Handbook — root AI binder plus Ask DustPan prompt/tool loading | implemented in working tree | v0.27.8 |

## When to add a plan

Every PR that touches **substantive logic** (new feature, restructure, schema
change, new dependency, deploy-shape change) gets a plan first. Cosmetic
tweaks (typo fixes, README polish, one-line bug fixes) do not.

Rule of thumb: if explaining *why* you made the change would take more than
two sentences in a commit message, write a plan first.

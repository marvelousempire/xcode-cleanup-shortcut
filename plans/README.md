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

## When to add a plan

Every PR that touches **substantive logic** (new feature, restructure, schema
change, new dependency, deploy-shape change) gets a plan first. Cosmetic
tweaks (typo fixes, README polish, one-line bug fixes) do not.

Rule of thumb: if explaining *why* you made the change would take more than
two sentences in a commit message, write a plan first.

# DustPan AI Agent Rules

DustPan's app-level AI binder lives here. Ask DustPan and repo agents should load
this folder before acting, then fall back to `AGENTS.md`, `CLAUDE.md`,
`.cursor/rules/`, `docs/CHANGELOG.md`, and `docs/Issue-Log.md` for deeper
source material.

## Loading Order

1. `manifest.json` — machine-readable section map and parent schema contract.
2. `AGENT_ASSIGNMENTS.md` — who the in-app agents are and what they own.
3. `OPERATING_RULES.md` — DustPan-specific operating rules.
4. `SKILLS.md` — reusable DustPan AI skills and when to use them.
5. `CHANGELOG_CONTEXT.md` — compact current-version context.
6. `HISTORY.md` — durable lessons that affect future AI behavior.

## Source Of Truth

This binder summarizes local law for prompt use; it does not replace the source
documents. When a detail matters, read the linked source file named in
`manifest.json`.

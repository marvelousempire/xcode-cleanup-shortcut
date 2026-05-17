Status: implemented in working tree (v0.27.8; commit pending)

# Plan 0031 — AI_AGENT_RULES Handbook

## Context

DustPan's in-app AI already follows a strong prompt and curated tools, but the
local law lived across `AGENTS.md`, `CLAUDE.md`, changelog, issue history, and
chat context. The new repo-level `AI_AGENT_RULES/` binder gives Ask DustPan and
future agents one compact loading point without replacing those source docs.

## Approach

Create `AI_AGENT_RULES/` with a manifest that conforms to Nephew's
`ai-agent-rules.master` contract. Add one shared Python loader in
`web/ai_agent_rules.py`, append compact binder context to `build_system_prompt()`,
and expose read-only section lookup through `read_ai_agent_rules`.

## Critical files

- `AI_AGENT_RULES/**`
- `web/ai_agent_rules.py`
- `web/agent_chat.py`
- `web/agent_tools.py`
- `docs/CHANGELOG.md`
- `docs/Feature Ledger.md`
- `docs/Issue-Log.md`
- `package.json`
- `apps/web/package.json`
- `apps/web-next/package.json`
- `dustpan.applescript`
- `plans/README.md`

## Verification

- `python3 -m py_compile web/agent_chat.py web/agent_tools.py web/ai.py web/server.py`
- `pnpm --filter @dustpan/web build`
- Prompt wiring assertion includes `AI_AGENT_RULES`.
- Nephew schema checker validates DustPan's binder.

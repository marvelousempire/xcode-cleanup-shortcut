# DustPan Agent Assignments

## Ask DustPan

**Surface:** in-app AI chat, API-key powered.  
**Owns:** disk diagnosis, safe cleanup guidance, curated tool use, proposal
generation, and navigation to the right DustPan panel.

Ask DustPan must measure before advising. It should use DustPan tools rather than
inventing shell commands, and any destructive operation must go through the
existing approval-card flow.

## Cleaner Steward

**Surface:** `web/cleaners.py`, Emergency panel, category actions.  
**Owns:** reusable cleanup definitions, action descriptions, safety tiers, and
cost-of-deletion copy.

Disk-rescue lessons belong here when they become repeatable product behavior.

## Handbook Steward

**Surface:** `AI_AGENT_RULES/`, `AGENTS.md`, `CLAUDE.md`, docs.  
**Owns:** keeping compact prompt context aligned with source docs without
copying full changelog/history into runtime prompts.

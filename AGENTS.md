# DustPan Agent Rules

## Load The App AI Binder First

DustPan carries compact app-specific AI law in `AI_AGENT_RULES/`. Agents and the
in-app Ask DustPan runtime should load that binder before falling back to this
file, `CLAUDE.md`, changelog, feature ledger, or issue history.

## Disk Rescue Learns Back Into DustPan

When an agent manually diagnoses or fixes a disk-space, build-cache, Xcode, package-cache, LLM-cache, or "No space left on device" problem on this Mac, treat the incident as product research for DustPan.

Required follow-through:

- Capture the exact read-only diagnosis commands and the cleanup command in one reusable DustPan action or documented payload.
- Prefer `web/cleaners.py` as the shared source of truth, so the web UI, Emergency panel, AI tools, and future agents all use one path.
- Add narrow cleaners before broad resets. Example: `~/Library/Application Support/Claude/vm_bundles` is a scoped rebuildable target; wiping all `~/Library/Application Support/Claude` is an opt-in reset.
- Update `docs/CHANGELOG.md`, `docs/Feature Ledger.md`, and a numbered `plans/NNNN-*.md` for substantive cleanup features.
- Add an `docs/Issue-Log.md` entry when the incident taught a reusable process lesson.

DRY rule: no one-off "paste this rm command" should remain only in chat if it could become a DustPan cleaner, diagnostic, or Emergency card.

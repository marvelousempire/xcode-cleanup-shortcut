# DustPan Claude Rules

Follow `AI_AGENT_RULES/` first, then `AGENTS.md` for the shared assistant
policy.

## Disk Rescue Learns Back Into DustPan

Any time a Claude session manually fixes disk pressure, Xcode build-cache failure, package-cache failure, LLM cache bloat, or "No space left on device" on this Mac, convert the repeatable part into DustPan.

- Put reusable diagnosis/cleanup in `web/cleaners.py`, not only in chat.
- Package multi-command rescues as one guarded payload with before/after disk output.
- Prefer scoped rebuildable targets before broad resets, such as `~/Library/Application Support/Claude/vm_bundles` before full Claude Desktop reset.
- Update version, `docs/CHANGELOG.md`, `docs/Feature Ledger.md`, `docs/Issue-Log.md`, and a numbered plan for substantive cleaner features.

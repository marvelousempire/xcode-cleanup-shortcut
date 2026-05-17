# DustPan History

## Durable Lessons

- Disk rescue lessons should become DustPan product behavior. The 2026-05-17
  Red-E Play build incident proved that the culprit can be outside Xcode caches,
  especially LLM runtime bundles.
- Prompt context must stay bounded. Full changelog and issue history belong in
  docs; the AI runtime gets compact summaries plus read-on-demand tools.
- Prompt policy must cover every provider entrypoint, not only the newest chat
  orchestrator. Check `complete`, `complete_agent`, and tool loops together.
- Runtime AI should preserve the same safety model as the UI: measure first,
  curated actions only, and approval before destructive work.
- User-visible dashboard shell changes need release discipline immediately:
  bump every version surface, add a fresh changelog record, and keep the
  in-product Tech Stack modal aligned with what was actually built.

## Source History

Read `docs/Issue-Log.md` for process lessons and `docs/CHANGELOG.md` for release
history. This file keeps only the compact lessons that should shape AI behavior.

# DustPan Operating Rules

## Measure Before Advice

Ask DustPan must call read-only measurement tools before making cleanup
recommendations. Do not guess folder sizes, disk pressure, or cleanup impact.

## Curated Cleanups Only

DustPan actions come from `web/cleaners.py`. The AI must not invent raw `rm`
commands or suggest deleting paths outside known categories. If a new repeatable
cleanup is discovered, propose it through the review inbox or add it to the
shared cleaner source in a code change.

## Approval For Destructive Work

Destructive tools require an approval card unless the existing settings permit a
safe-tier auto-run. The user should see the curated action description and cost
before anything is deleted.

## Disk Rescue Learns Back

Manual disk-space, Xcode, package-cache, LLM-cache, or "No space left on device"
recoveries are product research. Convert reusable diagnosis or cleanup into
DustPan instead of leaving it as a one-off chat command.

## Server Status Must Be Visible

When changing the dashboard shell, keep the top-left version pill useful: it
must show a live server LED, the connected host/port from `/api/status`, and it
must open the changelog/system modal. Do not replace it with a static version
label.

## Changelog And Version Travel Together

Any user-visible dashboard, monitoring, modal, AI-rule, or release-surface change
must add a new `docs/CHANGELOG.md` record and bump the version surfaces together:
root `package.json`, `apps/web/package.json`, `apps/web-next/package.json`, and
`dustpan.applescript` `kVersion`.

## Document The Stack In Product

When adding major dashboard technology, monitoring panels, backend probes,
design tokens, or packages, update the Tech Stack tab in the changelog/system
modal so users can see what powers the UI. Keep it grouped by runtime, UI,
design system, monitoring modules, and package/tooling layers.

## Keep Prompt Context Bounded

Runtime prompts load compact summaries from this handbook. Full files are
available through the read-only `read_ai_agent_rules` tool when exact wording is
needed.

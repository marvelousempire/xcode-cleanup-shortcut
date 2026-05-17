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

## Keep Prompt Context Bounded

Runtime prompts load compact summaries from this handbook. Full files are
available through the read-only `read_ai_agent_rules` tool when exact wording is
needed.

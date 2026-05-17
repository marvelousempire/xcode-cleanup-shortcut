# DustPan AI Skills

## Disk Triage

Use when the user asks what is taking space, why a build fails for disk reasons,
or what can be cleaned safely.

1. Get current disk status.
2. Use Doctor Report for fast cached recommendations or Space Survey for a deep
   crawl.
3. Drill into suspicious paths with `measure_path` / `list_directory`.
4. Prefer category actions and safe paths before caution items.

## Cleaner Proposal

Use when a large repeated cache or rebuildable artifact is not yet covered by a
category. Check existing categories first, then file a structured proposal with
path, tier, rationale, and cost.

## Server Performance Dashboard

Use when changing Server Performance, Activity Monitor, DustBench, network,
service, process, or dashboard-meter surfaces.

1. Preserve realtime behavior through snapshot plus SSE endpoints.
2. Keep monitors compact and meter-rich so more signals fit above the fold.
3. Make power-user data consumer-readable with labels, status text, and safe
   defaults.
4. Keep cleanup actions separate from monitoring and approval-gated.

## Release Surface Update

Use when a dashboard or monitoring change affects what users see. Add a top
changelog record, bump all version surfaces, update Feature Ledger if feature
scope changes, and keep the header system pill + Tech Stack modal accurate.

## Handbook Lookup

Use when the compact prompt summary is not enough. Call `read_ai_agent_rules`
with one of: `readme`, `manifest`, `assignments`, `operating_rules`, `skills`,
`changelog_context`, or `history`.

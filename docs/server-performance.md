# Server Performance

DustPan's Server Performance page is a read-mostly local operations console for
Mac and Linux workstations.

## Realtime Model

- `GET /api/performance/snapshot` returns the current full snapshot.
- `GET /api/performance/live` streams SSE frames every few seconds.
- Cheap probes update first: disk, CPU load, and memory.
- Slower probes update separately: process table, network rows, services, and
  bottleneck recommendations.

The page renders immediately and each gadget owns its loading/stale state. Slow
network or process probes should not blank the whole page.

## Cross-platform Probes

macOS uses stdlib calls plus `vm_stat`, `sysctl`, `ps`, and `lsof` when
available.

Linux uses stdlib calls plus `/proc/meminfo`, `ps`, and `ss` when available.

Missing platform tools degrade to empty rows with a message instead of a broken
page.

## Bottleneck Analytics

DustPan labels common local bottlenecks:

- disk pressure
- memory pressure
- CPU saturation
- Docker storage pressure
- offline local services

Recommendations deep-link into existing Cleaning tabs. Destructive actions stay
behind DustPan's normal approval gates.

## DustBench

DustBench is DustPan's local workstation health benchmark. It measures CPU
burst, filesystem scratch read/write, JSON parse/serialize, subprocess spawn,
local HTTP loopback, and optional Docker responsiveness.

It is not GeekBench-compatible and does not claim public benchmark parity.
Filesystem writes happen inside a temporary DustPan scratch directory and are
deleted immediately.

## Out Of Scope

- packet inspection
- firewall mutation
- kernel extensions
- silent network blocking
- arbitrary LAN scanning
- service kill/restart controls without a separate approval-gated plan

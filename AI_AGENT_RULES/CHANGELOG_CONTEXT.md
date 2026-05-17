# DustPan Changelog Context

## Current Version

DustPan is moving from `0.27.7` to `0.27.8`.

## Recent Releases

- `0.27.7` — Dev Build Rescue Payload. DustPan learned that Claude Desktop
  `vm_bundles` can be the real 10+ GB blocker during iOS device builds, and
  encoded scoped cleanup plus broader build-space diagnosis.
- `0.27.6` — Xcode Build Rescue. Added guarded Xcode/SwiftPM cleanup for
  disk-full build failures.
- `0.27.5` — Library atlas. Added a map of common `~/Library` heavy zones with
  one-click navigation to relevant DustPan panels.

## This Release

`0.27.8` adds the root `AI_AGENT_RULES/` handbook and wires Ask DustPan to load
compact handbook context before every AI chat, with read-on-demand access to
full handbook sections.

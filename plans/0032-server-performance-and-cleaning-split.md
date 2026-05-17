Status: active

# Plan 0032 — Server Performance and Cleaning Split

## Context

DustPan should become a two-page Mac operations console, not a single cleanup
screen with every concern added to it.

The existing full page remains **Cleaning**: disk rescue, cache cleanup, Docker
cleanup, emergency actions, cleanup cost text, and approval-gated deletion.

The new full page is **Server Performance**: live operational awareness and
guarded management for this Mac first, designed to expand to LAN and VPS health
checks. Avery specifically asked for monitoring like Little Snitch, stats like
iStat Menus, and more: network visibility, server activity, management, and
controls built on the same DustPan stack and UI.

This plan is also a direct response to the Nephew/n8n setup failure pattern:
critical disk pressure, Docker image extraction I/O errors, package-manager
install stalls, port collisions, and unclear runtime/service state.

## Approach

Keep the same DustPan architecture:

```text
Python stdlib server + React/Vite UI + SSE/live output + approval-gated actions
```

Add a second top-level page named **Server Performance**. It should use
read-only observation first, then guarded controls only for known local services
or safe cleanup paths.

The first deliverable is local Mac focused:

- CPU, memory, disk, and top process stats;
- network listeners and outbound connections with process names where possible;
- known service health for DustPan, Nephew, n8n, Docker, Ollama, and launchd;
- active package manager/install/process visibility;
- approval-gated links into existing Cleaning actions when cleanup is the fix.

The page should be structured so later versions can add allowlisted LAN/VPS
targets without scanning arbitrary machines.

## Critical files

- `plans/0032-server-performance-and-cleaning-split.md`
- `plans/README.md`
- `web/server.py`
- `web/cleaners.py`
- `apps/web/src/App.tsx`
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/types.ts`
- `apps/web/src/components/SidebarLeft.tsx`
- `apps/web/src/components/ServerPerformancePanel.tsx`
- `apps/web/src/components/EmergencyPanel.tsx`

## Verification

Run:

```bash
cd /Users/nivram/Developer/dustpan && make check
```

Expected: AppleScript, CLI, Python imports, and referenced files pass.

Run:

```bash
cd /Users/nivram/Developer/dustpan && make doctor
```

Expected: DustPan reports branch/status, versions, dashboard state, and disk
state without error.

Run:

```bash
cd /Users/nivram/Developer/dustpan && pnpm --dir apps/web build
```

Expected: React/Vite build passes.

Manual smoke:

```bash
cd /Users/nivram/Developer/dustpan && make ui-local
```

Expected: sidebar has both Cleaning and Server Performance, Server Performance
loads cards/tables without hanging, and Cleaning still works.

## Out of scope

- Deep packet inspection.
- Silent network blocking or firewall mutation.
- Kernel extensions or a full Little Snitch replacement.
- Remote management of arbitrary LAN machines.
- Moving Nephew orchestration proof into DustPan.
- Destructive cleanup or service controls without approval.

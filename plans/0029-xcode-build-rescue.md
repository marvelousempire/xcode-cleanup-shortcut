Status: shipped (commit ee26693, v0.27.6)

# Plan 0029 — Xcode Build Rescue

## Context

While building a Red-E Play hotfix directly to a physical iPhone, Xcode failed
first on a locked `DerivedData` build database and then on `No space left on
device` while resolving Swift packages. The recovery path was repeatable:
measure disk, check active Xcode processes, inspect Xcode cache sizes, clear
safe build caches, then retry the build. DustPan should encode that workflow so
developer Macs can recover from the same failure without hand-running commands.

## Approach

Add a focused Xcode Build Rescue path using DustPan's existing category/action
model instead of inventing a second cleanup engine.

- Add read-only Xcode build diagnostics to `web/cleaners.py`:
  - `df -h /`
  - `pgrep -lf 'xcodebuild|swift-frontend|clang|ld'`
  - `du -sh ~/Library/Developer/Xcode/*`
  - `du -sh` for SwiftPM caches
- Add guarded cleanup actions that refuse to delete while build processes are
  active:
  - `xcode-build-rescue-safe`
  - `emergency-xcode-build-rescue`
- Include the incident-proven paths:
  - `~/Library/Developer/Xcode/DerivedData`
  - `~/Library/Developer/Xcode/iOS DeviceSupport`
  - `~/Library/Caches/org.swift.swiftpm`
  - `~/Library/org.swift.swiftpm`
  - `~/Library/Caches/com.apple.dt.Xcode`
- Update the Emergency panel command list so the rescue flow is visible when
  disk is near zero.
- Bump DustPan to `0.27.6` and document the change.

## Critical Files

- `web/cleaners.py`
- `apps/web/src/components/EmergencyPanel.tsx`
- `docs/CHANGELOG.md`
- `README.md`
- `package.json`
- `apps/web/package.json`
- `apps/web-next/package.json`
- `dustpan.applescript`
- `plans/README.md`
- `plans/0029-xcode-build-rescue.md`

## Verification

- `python3 -m py_compile web/cleaners.py web/server.py`
- `pnpm --filter @dustpan/web build`
- `python3 - <<'PY'` import `web.cleaners` and assert the new Xcode/emergency
  actions exist.
- Confirm `git diff --check` passes before commit.

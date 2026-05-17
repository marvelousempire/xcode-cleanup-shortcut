Status: implemented in working tree (v0.27.7; commit pending)

# Plan 0030 — Dev Build Rescue Payload

## Context

During a Red-E Play iPhone device build, the initial failure looked like an Xcode-only disk problem. The usual Xcode caches were already empty; the real local reclaim was `~/Library/Application Support/Claude/vm_bundles`, which held more than 10 GB. A follow-up build also proved that using an external/network volume for `DerivedData` can produce Xcode `disk I/O error` failures. DustPan should encode that full recovery path so the next agent or developer does not hand-run a one-off sequence.

## Approach

Extend the existing Xcode Build Rescue path instead of adding a parallel cleaner engine.

- Broaden `diagnose-build-space` in `web/cleaners.py` into `Diagnose dev build space`, including Xcode/SwiftPM cache sizes, Claude/Cursor app-support heavy hitters, and mounted volumes.
- Broaden `xcode-build-rescue-safe` into `Dev build rescue payload: free local build space`, guarded by the existing active-build check.
- Add `~/Library/Application Support/Claude/vm_bundles` to the Claude LLM category as a scoped cleaner, not a full Claude reset.
- Repoint Emergency card ③ to the same Dev Build Rescue payload and include `vm_bundles` in `/api/emergency/estimate`.
- Add project/global rules so future disk-space triage learns back into DustPan.
- Bump DustPan to `0.27.7` and document the release.

## Critical files

- `web/cleaners.py`
- `apps/web/src/components/EmergencyPanel.tsx`
- `docs/CHANGELOG.md`
- `docs/Feature Ledger.md`
- `docs/Issue-Log.md`
- `package.json`
- `apps/web/package.json`
- `apps/web-next/package.json`
- `dustpan.applescript`
- `plans/README.md`
- `plans/0030-dev-build-rescue-payload.md`
- `.cursor/rules/dustpan-learns-from-disk-rescue.mdc`
- `AGENTS.md`
- `CLAUDE.md`
- `~/.cursor/rules/nephew-global.mdc`

## Verification

- `python3 -m py_compile web/cleaners.py web/server.py`
- `python3 - <<'PY'` import `web.cleaners` and assert `clear-claude-vm-bundles`, `xcode-build-rescue-safe`, and `emergency-swiftpm-xcode-caches` include the VM bundle path.
- `pnpm --filter @dustpan/web build`
- `git diff --check`

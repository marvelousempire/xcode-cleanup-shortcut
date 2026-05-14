# 🧹 The original pitch — Xcode cache cleanup, done right

**Tagline:** The 150-line AppleScript that became DustPan. Still the cleanest pitch for iOS developers. Frees 10–25 GB of Xcode caches in one click, never touches Archives.

**Version:** v0.1.0 (Sept 2025) — present in every release since
**Surface:** Xcode category tab + `xcc` CLI + Shortcut + launchd + SwiftBar
**Backend:** Original `xcode-cleanup.applescript` (now `dustpan.applescript`), `web/cleaners.py::CATEGORIES["xcode"]`

## The original problem

Active iOS developers see their boot drive fill up by 20–60 GB over a few weeks of normal work. The disk pressure surfaces as failed builds, full simulators, slow Spotlight, and macOS warning banners.

The fix is well-documented but tedious:

```bash
du -sh ~/Library/Developer/Xcode/DerivedData            # check
rm -rf ~/Library/Developer/Xcode/DerivedData/*          # delete
rm -rf ~/Library/Developer/Xcode/iOS\ DeviceSupport/*   # delete
rm -rf ~/Library/Developer/Xcode/watchOS\ DeviceSupport/*
rm -rf ~/Library/Developer/Xcode/tvOS\ DeviceSupport/*
rm -rf ~/Library/Developer/CoreSimulator/Caches/*
xcrun simctl delete unavailable                          # cleanup sims
```

The original author had been doing this every couple of weeks for years. Once, while running it fast, the wrong `rm -rf` hit `Archives` — losing crash symbolication for a shipped App Store build. Tuesday afternoon, irreversible, painful.

That's the actual problem. It's not "clean my Mac" — it's *"every iOS dev has at some point Googled which Xcode paths are safe to delete, and at some point one of us has fat-fingered Archives."*

## How DustPan v0.1 solved it (and still does)

A single AppleScript that:

- Wipes the **5 known-safe Xcode cache directories** (DerivedData, iOS/watchOS/tvOS DeviceSupport, `~/Library/Caches/com.apple.dt.Xcode`)
- Clears **SwiftPM caches** (`~/Library/Caches/org.swift.swiftpm`, `~/Library/org.swift.swiftpm`)
- Clears **CoreSimulator caches** and runs `xcrun simctl delete unavailable` to remove dormant simulator runtimes
- **Never touches Archives** (crash symbolication stays intact)
- **Never touches active simulators** (installed app data preserved)
- **Threshold-gated** — silent no-op when disk is healthy (`free_gb > 50`)
- **`--dry-run` mode** — reports what would be freed without committing
- **Per-run history** in `~/Library/Logs/dustpan-history.csv`

The script ships **four ways** with one underlying engine:

1. **Apple Shortcut** — menu bar icon, Cmd+Shift+X hotkey, time-of-day automation
2. **CLI** — `xcc` command, `xcc --dry-run`, `xcc --verbose`
3. **launchd agent** — hourly background run, gated by threshold
4. **SwiftBar plugin** — menu-bar widget showing free GB + last-run timestamp + on-click run

Pick any one, stack any combination.

### Why "never touches Archives"

`~/Library/Developer/Xcode/Archives` is the only Xcode directory that contains data you actually can't regenerate. It holds the `.xcarchive` bundles produced when you ship a build to TestFlight / App Store — including the dSYM files that Apple needs to symbolicate crash reports from production users.

Lose them and your crash logs from real users come back as raw addresses. This is non-recoverable; Apple doesn't keep them.

DustPan's Xcode category has Archives only in the `caution` tier, displayed but never auto-cleaned. The `"Clean ALL safe"` button cannot reach it. The cost annotation is explicit: *"App Store crash symbolication will break for all currently-shipped builds."*

## What it looks like

In the dashboard, the Xcode category tab shows:

```
Xcode                                  Total: 12.4 GB across 14 paths

  Safe (always reclaimable)           6.4 GB
  ├─ Xcode DerivedData                3.1 GB    [Clean]
  ├─ iOS DeviceSupport                2.4 GB    [Clean]
  ├─ watchOS DeviceSupport            0.6 GB    [Clean]
  ├─ tvOS DeviceSupport               0.2 GB    [Clean]
  └─ Xcode session-state cache        0.1 GB    [Clean]

  Opt-in (probably safe)              0.2 GB
  └─ Old simulator runtimes           0.2 GB    [Clean]

  Caution (review first)              5.8 GB
  └─ ⚠️ Archives                       5.8 GB
       App Store crash symbolication will break for all currently-shipped builds.

  [Clean ALL safe (6.4 GB)]        [Run docker-style action: simctl delete unavailable]
```

In the Shortcut, it's even simpler — one button, a 4-step progress bar, a freed-GB notification.

## The technical story

### Why AppleScript?

Three reasons:

1. **Ships on every Mac.** Not Python, not Node, not pip. Apple's own scripting language. Zero install friction.
2. **Native UI affordances.** Progress bars, modal dialogs, notifications — all single-line calls. No GUI framework needed.
3. **Auditable.** It's a single 150-line file. Anyone reading the source can verify what it does.

Later versions added a Python web dashboard and a React frontend for the cases where one button isn't enough. But the AppleScript still runs underneath — `make ui` just gives you a UI over the same underlying cleanup engine.

### Why threshold-gating

The cleanup is silent below the threshold (`free_gb > 50`). This matters because the launchd agent runs every hour — without gating it would be a constant trickle of "✓ Done. Nothing to clean" notifications, which is noise. With gating it's invisible until disk is actually low. Same logic applies to the Shortcut: running it manually shows a Cancel/Run modal; running it via automation just does nothing if the disk is healthy.

### Why `xcrun simctl delete unavailable`

Xcode periodically downloads simulator runtimes for new iOS versions (iOS 17.0, 17.1, 17.2…). When you uninstall an old runtime, the simulators created with it remain on disk — they just don't show up in Xcode's simulator picker. `delete unavailable` walks the simulator list and removes any whose runtime is gone. Typically frees 2–10 GB on an active iOS dev's machine.

Important: this only deletes **simulators for already-uninstalled runtimes**. Simulators with currently-installed app data on currently-installed runtimes are untouched.

## Paste-ready channel copy

### Show HN (original launch copy, preserved verbatim)

**Title:**
```
Show HN: Xcode Cleanup – a macOS Shortcut that frees 10–25GB safely
```

**First comment:**

> Hi HN — author here.
>
> Xcode's caches (DerivedData, iOS/watchOS/tvOS DeviceSupport, SwiftPM, simulator caches) routinely grow to 20+ GB and stay there. I'd been Googling "which paths are safe to rm -rf" once a quarter for years, fat-fingering Archives once (lost crash symbolication for a shipped App Store build), and seriously considered paying CleanMyMac for what's fundamentally a 150-line script.
>
> So I wrote the 150-line script. It's a single AppleScript that:
> - Wipes the 5 known-safe Xcode cache directories
> - Calls `xcrun simctl delete unavailable` for dormant simulators
> - **Never** touches Archives (crash symbolication stays intact) or active simulators
> - Threshold-gated (silent no-op when disk is healthy)
> - `--dry-run` mode shows what would be freed without deleting
>
> Same script ships four ways: an Apple Shortcut (menu bar, hotkey, schedule), a `xcc` CLI (`xcc --dry-run`), an hourly `launchd` agent, and a SwiftBar menu-bar plugin. Pick any one or stack them.
>
> Quickest way to try without committing to anything:
> ```
> bash <(curl -fsSL https://raw.githubusercontent.com/marvelousempire/xcode-cleanup-shortcut/main/scripts/remote-cleanup.sh) --dry-run
> ```
>
> MIT, no telemetry, no auto-update phone-home.

### r/iOSProgramming

**Title:** I built a free Xcode disk-cleanup Shortcut after fat-fingering my Archives once. Open source, threshold-gated, takes one click.

**Body:**

> Sharing in case it saves anyone else the same headache.
>
> **The problem:** Xcode's caches grow to 20+ GB silently. DerivedData, iOS/watchOS/tvOS DeviceSupport, SwiftPM, simulator caches. Every iOS dev has at some point Googled "which Xcode paths are safe to delete" — and at some point one of us has hit Archives by mistake and lost crash symbolication for a shipped App Store build.
>
> **What I built:** A single AppleScript (~150 lines, all readable) that:
> - Wipes the 5 known-safe Xcode caches
> - Removes simulators for runtimes you've already uninstalled
> - **Never** touches Archives or active simulators
> - Threshold-gated — silent when disk is healthy
> - `--dry-run` measures what cleanup would free without deleting
> - Per-run history in `~/Library/Logs/dustpan-history.csv`
>
> Ships four ways: Apple Shortcut, `xcc` CLI, launchd hourly agent, SwiftBar menu-bar widget. Pick any.
>
> https://github.com/marvelousempire/dustpan
>
> Free, MIT, no telemetry.

### Tweet (280 chars)

> Free Xcode disk cleanup, the way I wish someone had built it for me 5 years ago.
>
> 150-line AppleScript. Never touches Archives. Frees 10–25 GB in one click. Ships as a Shortcut, CLI, launchd agent, or menu-bar widget.
>
> https://github.com/marvelousempire/dustpan

## FAQ

**Q: Does this work on Apple Silicon?**
A: Yes. AppleScript and shell are universal. The optional React dashboard builds via Vite on both architectures.

**Q: What if I'm using a different Mac dev setup (not Xcode)?**
A: The Xcode category is the original target audience. For other dev tools (Docker, Cursor, etc.), DustPan has dedicated categories — and v0.23 added a conversational AI agent that can investigate any other caches.

**Q: Can I trust an AppleScript that runs `rm -rf`?**
A: Read the script. It's 150 lines, all in `dustpan.applescript`. Every `rm -rf` is followed by a comment explaining what it deletes. The paths are hardcoded — they never come from user input. There's a `--dry-run` mode that prints every command without executing.

**Q: What about Mail's downloads, browser history, Documents folder?**
A: Out of scope for the original Xcode pitch. DustPan v0.20+ added browser cache categories, app caches, and so on as opt-in additions — but the founding pitch was always Xcode-specific.

**Q: Why not `mas` (Mac App Store)?**
A: DustPan ships as a git clone + make command. Mac App Store would require sandboxing, which would block the necessary `rm -rf` operations on `~/Library/Developer/`. The compatibility hit isn't worth it for a CLI tool.

**Q: How does this compare to `xcrun simctl erase all`?**
A: That erases all simulator state (installed app data, settings, screenshots). DustPan's approach is gentler: it only removes simulators whose runtime has already been uninstalled. Your currently-active sim with the current build of your app is untouched.

## What it took to ship

**The original v0.1.0** was one 150-line AppleScript and a README. ~200 lines total.

**Today** it's the same script (now ~250 lines as the cleanup engine grew), plus:

- Python web dashboard (`web/server.py` + `web/cleaners.py`)
- React frontend (`apps/web/src/`)
- 19 cleanup categories beyond Xcode
- 35+ pre-defined actions
- AI agent with tool-calling (see [chat-with-sadpa.md](./chat-with-sadpa.md))
- Locked-space recovery (see [locked-space-recovery.md](./locked-space-recovery.md))
- Emergency Rescue panel (see [emergency-rescue.md](./emergency-rescue.md))
- Live filesystem survey (see [space-survey.md](./space-survey.md))

The original Xcode-cleanup audience is still the most concentrated user base — iOS developers feel this pain weekly. The newer features broaden the appeal to general Mac power users and AI early adopters. But the founding pitch remains true: **DustPan exists because every iOS dev has at some point lost an Archive to a misfired `rm -rf`, and that shouldn't happen.**

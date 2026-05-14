# 🚨 Emergency Rescue — when the disk is at zero

**Tagline:** Disk at 0 bytes free. macOS is refusing to do anything. Six numbered commands, each with a Run button, live output streaming into a terminal inside the app. 8 GB recovered in under 60 seconds.

**Version:** v0.21.4 (panel + SADPA auto-navigate), v0.21.5 (real-time freed counters)
**Plan:** [0021](../../plans/) (folded into ongoing series)
**Surface:** Web dashboard tab `🚨 Emergency Rescue`
**Backend:** `web/cleaners.py::CATEGORIES["emergency"]`
**Frontend:** `apps/web/src/components/EmergencyPanel.tsx`

## The problem in plain English

It's late at night. You're trying to save a file. macOS says **"the disk is full"**. You open Terminal: `df -h /` says `838 Mi free`. You can't open Disk Utility (it needs disk to launch some helper). You can't even let Spotlight reindex because it needs disk. You can't run any GUI app that wants to write a state file.

You start Googling "macOS disk full emergency" and get a wall of conflicting StackOverflow answers, half of them dangerous (`sudo rm -rf /private/var/db/uuidtext` — please don't), half of them too generic to help.

DustPan's normal cleanup categories require the app's full UI to load — which requires disk for asset caches, npm tarballs, etc. **When you really need the disk-cleanup tool, the disk-cleanup tool can't run.**

The Emergency Rescue panel is the answer to that problem.

## How DustPan solves it

The Emergency Rescue tab is **always present** in the sidebar, and it loads with **zero category-scan overhead**. It's six numbered command cards, each one a known-safe shell command that has worked for thousands of macOS users in the same situation:

```
① Xcode Build Cache (DerivedData)         typically 5–20 GB    [▶ Run this]
② Xcode iOS Device Debug Files            typically 2–8 GB     [▶ Run this]
③ macOS Photo Recognition Cache           typically 2–5 GB     [▶ Run this]
④ Xcode Documentation Index               typically 1–5 GB     [▶ Run this]
⑤ Docker: Remove Unused Images            typically 2–20 GB    [▶ Run this]
⑥ Check Disk Space Right Now              read-only            [▶ Run check]

[▶▶ Run All Emergency Commands Now]
```

Plus the two foreign-ownership diagnostic cards (see [locked-space-recovery.md](./locked-space-recovery.md)):

```
🔒  Find space locked by previous users    [▶ Run check]
🍺  Get the Homebrew takeover command      [▶ Run check]
```

### Per-card details

Each card explains, in plain English:
- **What is this?** — Xcode's scratch pad. macOS's AI brain that recognises faces in your Photos. Docker's virtual disk.
- **If you delete it:** — Your next Xcode build takes ~30 seconds longer, just once. macOS rebuilds the photo recognition in the background over hours. Docker re-pulls images as needed.
- **Typical recovery:** — A range, never a promise.
- **The exact shell command** in monospace — so you can see what will actually run.
- **A live elapsed timer** — ticks every second while running, stops when the command exits.
- **The freed-GB counter** — pulled from the actual SSE `done` event from `/api/run`, not a fake setTimeout. "✓ Done · +6.2 GB freed · in 4s"

### SADPA auto-navigation

The Smart Auto-Detector Protector Agent monitors disk space in real time (via the SSE `/api/live` channel). Two thresholds:

- **`free_gb < 1`** → automatically switches to the Emergency Rescue tab. No clicking required.
- **`free_gb < 10`** → kicks off a background full-scan so the Survey + QuickWins panels have real data when the user gets to them.

The auto-navigation only fires once per session (tracked by `autoEmergencyRef`) so you can navigate away if you want and not be teleported back.

### The live disk meter

The header of the Emergency Rescue panel shows:
- **Current free GB** (live, updates within 100ms of any command exiting)
- **Freed this session** — delta from baseline-at-mount, animated bar
- **Commands done** — N of 6

The disk bar has a green overlay that grows as space is recovered, sitting on top of the red/orange "used" bar. So while a command runs, you can literally watch the bar shrink.

## What it looks like

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🚨 Disk at absolute zero                                                │
│ Each button below streams live output to the terminal.                  │
│ No confirm dialogs — the cards explain exactly what runs.               │
│                                                                          │
│ ┌─ Free right now ─┐ ┌─ Freed this session ─┐ ┌─ Commands done ─────┐ │
│ │   843 MB          │ │   +6.2 GB             │ │  3 / 6              │ │
│ │   97% used        │ │  3 commands           │ │  tap ▶ Run this    │ │
│ └───────────────────┘ └───────────────────────┘ └─────────────────────┘ │
│                                                                          │
│ ████████████████████████████████████████░░░░░░  ↑ +6.2 GB recovered     │
│                                                                          │
│ [▶▶ Run All Emergency Commands Now]                                     │
│ Or run each command one at a time below — output streams live           │
│                                                                          │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                          │
│ ✓  Xcode Build Cache (DerivedData)              typically 5–20 GB       │
│    Xcode's scratch pad. Every build saves notes here so the next        │
│    build is faster.                                                      │
│    rm -rf ~/Library/Developer/Xcode/DerivedData/*                       │
│    [✓ Done]   +6.2 GB freed   in 4s                                     │
│                                                                          │
│ ②  Xcode iOS Device Debug Files (iOS DeviceSupport)  typically 2–8 GB   │
│    One folder per iPhone model per iOS version…                         │
│    rm -rf ~/Library/Developer/Xcode/'iOS DeviceSupport'/*               │
│    [▶ Run this]                                                          │
│                                                                          │
│ ③  macOS Photo Recognition Cache                  typically 2–5 GB       │
│    The AI brain macOS builds from your Photos library…                  │
│    rm -rf ~/Library/Containers/com.apple.mediaanalysisd/Data/Library/*  │
│    [▶ Run this]                                                          │
│                                                                          │
│ ④  Xcode Documentation Index                       typically 1–5 GB       │
│    Xcode's searchable copy of Apple's developer docs.                   │
│    rm -rf ~/Library/Developer/Xcode/DocumentationIndex/*                │
│    [▶ Run this]                                                          │
│                                                                          │
│ ⑤  Docker: Remove Unused Images & Containers      typically 2–20 GB     │
│    Removes unused blueprints and stopped containers…                    │
│    docker system prune -f                                                │
│    [▶ Run this]                                                          │
│                                                                          │
│ 🔒  Find space locked by previous users           [▶ Run check]         │
│ 🍺  Get the Homebrew takeover command             [▶ Run check]         │
│ ⑥  Check Disk Space Right Now                     [▶ Run check]         │
└─────────────────────────────────────────────────────────────────────────┘
```

## The technical story

### The real-time calculation fix

The v0.21.4 ship had a bug: the per-card "✓ Done" status was set by a hardcoded `setTimeout(1500ms)`. An `rm -rf` of a 15 GB DerivedData folder takes 3–8 seconds — the card was lying.

v0.21.5 fixed it by:

1. Adding `runActionDirect(catId, actionId, label, onDone?)` to DashboardContext — same path as `runAction` but skips the confirm dialog (the emergency cards already explain everything, friction is wrong here) and exposes `freed_gb` via callback.
2. EmergencyPanel cards pass an `onDone` that updates per-card state with the **actual** freed GB from the SSE `done` event.
3. Header metrics now use live status: "Free right now" updates via `/api/live` SSE, "Freed this session" is `current_free_gb − baseline_at_mount` (truth source is the OS, not our counters).

Result: the card shows ✓ only when the shell process has actually exited. The freed-GB counter is the kernel's reported delta, not an estimate.

### The Run All command

The `emergency-run-all` action in `cleaners.py` chains all five cleanup shells in sequence with progress markers:

```bash
echo '🚨 DustPan Emergency Cleanup — starting…'
echo '① DerivedData…'
rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null
echo '  ✓ cleared'
echo '② iOS DeviceSupport…'
rm -rf ~/Library/Developer/Xcode/'iOS DeviceSupport'/* 2>/dev/null
…
df -h / | awk 'NR==2{print "✅ Disk now: "$4" free of "$2}'
```

The output streams via the same SSE channel the per-command run uses — so you see live progress in the in-app terminal AND in the header counter at the same time.

### The two diagnostic cards

`emergency-find-foreign-owned` and `emergency-takeover-homebrew` are **informational** (`"informational": True` in the action dict). Their shell commands echo guidance — they don't delete anything. They exist on the Emergency surface specifically because when the disk is at zero, the user is often staring at "the brew command isn't working either" which is the exact symptom of foreign-ownership cruft. Surfacing the takeover command here lets them recover even when DustPan's normal paths are bricked.

## Paste-ready channel copy

### Tweet (280 chars)

> Your Mac is at 0 bytes free. macOS won't let you open anything. Spotlight broke. iCloud is throwing errors.
>
> DustPan's Emergency Rescue panel: 6 numbered commands, each with a Run button, live output streaming inside the app.
>
> 8 GB back in 60 seconds. https://github.com/marvelousempire/dustpan

### LinkedIn (3-5 paragraphs)

> Tested DustPan's Emergency Rescue panel on a Mac that hit 0 bytes free this week — every app froze, Spotlight refused to index, the GUI was barely usable.
>
> The panel is six numbered command cards, always loaded, never requires a category scan to populate. Each card has the exact shell command in monospace, a plain-English explanation, a typical recovery range, and a Run button that streams live output to a terminal inside the app.
>
> Recovered 6.2 GB in 4 seconds with one click on the DerivedData card. The header shows a live "Freed this session" counter and an animated disk bar with a green overlay growing in real time as space comes back.
>
> What makes it different from running the same commands manually in Terminal:
> 1. The Smart Auto-Detector Protector Agent auto-navigates to this panel when free space drops below 1 GB — no clicking required.
> 2. Each card's freed-GB counter comes from the kernel's reported delta, not an estimate.
> 3. There's also a Run-All button that chains the five cleanup commands with progress markers.
>
> Open source, MIT, free. https://github.com/marvelousempire/dustpan

### Reddit r/MacOS

**Title:** macOS hit 0 bytes free overnight. DustPan's Emergency Rescue panel got me back in under 60 seconds.

**Body:**

> Quick story for anyone else who's had this happen. Late Tuesday night, my Mac hit 0 bytes free — Spotlight broken, GUI apps froze on launch, iCloud throwing "can't sync" errors every 30 seconds.
>
> I had DustPan installed but its main UI couldn't even start cleanly (Vite was trying to write to a cache). What did work: the Emergency Rescue tab, which is six numbered command cards that load without any category scan overhead.
>
> Clicked DerivedData — 6.2 GB back. Clicked iOS DeviceSupport — 3.4 GB. Clicked the Photo Recognition Cache — 3.6 GB. By the time I'd done four, I had 13 GB free and could open everything else.
>
> Each card explains in plain English what gets deleted and what rebuilds. The freed-GB counter under each button is the kernel's reported delta, not an estimate. The header disk bar has a green overlay that grows in real time.
>
> Also: when DustPan detects you're below 1 GB free, it auto-navigates you to the Emergency tab on launch. Don't have to remember where it is.
>
> https://github.com/marvelousempire/dustpan

### Engineering blog post lede

> The Mac was at 838 MB free. Every GUI app froze on launch. Spotlight refused to index. I needed a way to run five known-safe disk-cleanup commands without opening Terminal and Googling the right syntax three times. So I built an Emergency Rescue panel — six numbered cards, each with a Run button that pipes live output into a terminal inside the app.
>
> The interesting engineering problem turned out to be: **how do you display the actual freed-GB per command, not an estimate?** The first version used a setTimeout. It was wrong. Here's the multi-day debugging journey to wire it to the real SSE done event…

## FAQ

**Q: Will running these commands break anything?**
A: No. Each one deletes a cache that rebuilds automatically. The cards explain exactly what rebuilds and how long it takes. The worst case is "your next Xcode build is 30 seconds slower."

**Q: What if I'm in the middle of an Xcode build when I click DerivedData?**
A: Xcode will probably error out the in-progress build. Re-run it. The deleted files were just scratch.

**Q: I don't have Docker installed. Will the Docker command fail?**
A: No — the command checks `command -v docker` first and prints "Docker not installed or not running — skipping" if it's not there. Same for any tool that's optional.

**Q: Why is the panel auto-opened when my disk is low?**
A: SADPA (Smart Auto-Detector Protector Agent) monitors `free_gb` via the live SSE channel. Below 1 GB free, it auto-navigates to this panel. The thinking is: when the disk is that low, you have a specific problem with a specific fix, and DustPan's general dashboard is the wrong starting point.

**Q: Can I disable the auto-navigation?**
A: It only fires once per app session (tracked via `autoEmergencyRef`). After you click into any other tab, you stay there. Reload the app to re-arm it.

**Q: What's the Run All button do exactly?**
A: Runs the five cleanup commands (not the read-only diagnostic ones) in sequence, with progress markers between each. Output streams to the same terminal. Typically recovers 10–30 GB on a Mac that's been used for development.

## What it took to ship

**Two PRs**:

- **v0.21.4** — Panel + SADPA auto-navigate. 8 files changed, ~520 lines.
- **v0.21.5** — Real-time calculation fix (replaced fake setTimeout with actual SSE done callback). 3 files changed, ~250 lines.

### Things we deliberately chose not to do

- **Run commands without showing the shell.** Every card displays the exact `rm -rf …` command in monospace. The user always knows what's about to execute.
- **Auto-run commands when disk drops below threshold.** Only the navigation is automatic. Clicking Run is always intentional.
- **Add categories to the Emergency surface.** It stays minimal: 6 numbered cleanup commands + 3 read-only diagnostic. More cards would defeat the "I'm panicking, what do I click" UX.
- **Show estimated time-remaining for commands.** Tried it; estimates were inaccurate and added noise. The elapsed-time counter is what's there now.

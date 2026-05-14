# Product Marketing Context

*Last updated: 2026-05-08*

> The foundation document other marketing skills (copywriting, page-cro, aso-audit, launch-strategy, customer-research, etc.) reference for positioning before they do anything else. Keep it current; edit in place.

## Product Overview

**One-liner:** Reclaim 10–25 GB Xcode is hoarding. One click.

**What it does:** A free, open-source macOS utility that wipes Xcode's accumulated disk caches (DerivedData, iOS/watchOS/tvOS DeviceSupport, SwiftPM caches, dormant simulators, configurable /tmp orphans) safely — without touching App Store Archives or active simulators. Same script ships as four install paths: an Apple Shortcut, a `xcc` CLI, an hourly `launchd` agent, and a SwiftBar menu-bar plugin.

**Product category:** Open-source disk-cleanup tool for iOS/macOS developers. Shelf-mates: CleanMyMac (paid generalist), DevCleaner for Xcode (paid Mac App Store), the genre of `xcode-cleanup.sh` gists scattered across GitHub.

**Product type:** Open-source side project / portfolio piece. AppleScript core + Bash helpers + a Lucide icon. No backend, no telemetry, no auto-update phone-home.

**Business model:** Free. MIT. No monetization. The repo exists because the maintainer needed it for the Red-E Play iOS workflow and shipping it publicly costs nothing.

---

## Target Audience

**Who:** Working iOS / macOS developers running Xcode daily. Especially:
- **Solo founders** building apps alone — least likely to have someone else manage disk hygiene for them
- **Indie iOS devs** with multiple side projects (each has its own ballooning DerivedData)
- **Small-team mobile engineers** at startups/agencies running multiple worktrees and parallel `xcodebuild` invocations
- **Build/CI maintainers** who SSH into a Mac mini build server and want one paste to reclaim space

**NOT for:** Non-Apple-platform devs (no Xcode), enterprise IT teams needing MDM-deployed signed binaries, anyone wanting general macOS cleanup (browser caches, Mail downloads, etc.).

**Primary use case:** Reclaim disk space *right now*, mid-workflow, without breaking the next build.

**Jobs to be done (the three real ones):**
1. **"When my disk fills mid-build, get me back to building in 30 seconds."** → manual one-click via Shortcut / hotkey / Spotlight.
2. **"When I'm a heavy daily user, do disk hygiene without me thinking about it."** → `launchd` hourly agent + SwiftBar indicator.
3. **"When I'm managing a build server remotely, clean it without SSHing in and typing rm -rf paths from memory."** → Run Script Over SSH block from `docs/SHORTCUTS.md`.

**Use cases / scenarios:**
- Pre-TestFlight upload "let me clear the decks first" sweep
- After a week of switching between 5+ Xcode projects
- Build server hourly hygiene (CI agents accumulate fastest)
- After running parallel Claude/agent sessions that each spawned a `xcodebuild`
- The morning after macOS rolled in a new simulator runtime (suddenly several old runtimes are dormant)

---

## Problems & Pain Points

**Core problem:** Xcode silently accumulates 20+ GB of cache per active month. The user finds out when a `xcodebuild` fails with "no space left," or when macOS pops the "Your startup disk is almost full" banner — usually right before something important (TestFlight upload, demo, release branch cut).

**Why current alternatives fall short:**
- **Manual `rm -rf`** — works, but everyone's at risk of fat-fingering `Archives` (breaks crash symbolication for shipped App Store builds). Also: you have to remember 5+ paths every time.
- **CleanMyMac / Setapp** — $30–$50/yr, generalist (not Xcode-specific), opaque about what it actually does, runs as a closed binary with full disk access.
- **Xcode → Settings → Locations → Manage Storage** — buried, manual per-cache, doesn't touch DeviceSupport or simulator caches.
- **GitHub gist one-liners** — unmaintained, scattered, no `--dry-run`, no threshold gate, no history.
- **"Just buy a bigger SSD"** — true for new Macs, doesn't help anyone with an existing machine, addresses symptom not cause.

**What it costs them:**
- **Time:** ~15 min of Googling "which Xcode paths are safe to delete" + Stack-Overflow-cross-referencing each time the disk fills. Multiple times a year.
- **Money:** $30–$50/yr if you escape into a paid cleaner, or hundreds of $ to upgrade SSD.
- **Risk:** Wiping Archives = permanently losing crash symbolication for already-shipped App Store builds — irrecoverable.
- **Cognitive load:** "Is iOS DeviceSupport safe? What about ModuleCache?" — knowledge you only need every 2 months but have to re-derive each time.

**Emotional tension:** Disk-full crises happen at the *worst* moments (about to ship, on a flight, demo at 4pm). The reflex is panic-deletion, which is exactly when you fat-finger Archives. The frustration is being a competent engineer reduced to Googling "rm -rf safe paths" for the fourth time this year.

---

## Competitive Landscape

| Type | Competitor | Where it falls short |
|---|---|---|
| **Direct** | CleanMyMac (MacPaw / Setapp) | $30–$50/yr, generalist, opaque, closed-source binary, full-disk-access required, "let us decide what's safe" model |
| **Direct** | DevCleaner for Xcode (Mac App Store) | $5 one-time but App Store sandbox limits its reach; closed-source; no automation hooks; no dry-run |
| **Direct** | Various GitHub gists (`rm -rf` one-liners) | Unmaintained, scattered, no threshold gate, no dry-run, no history log, no SSH/CLI/Shortcut surface |
| **Secondary** | Manual `rm -rf` from terminal | Memory-dependent; high fat-finger risk on Archives; no measurement before/after |
| **Secondary** | Xcode → Settings → Locations → Manage Storage | Buried in UI, manual per-cache, doesn't touch DeviceSupport or simulator caches |
| **Indirect** | "Buy a bigger SSD" / external drive | Doesn't help anyone with their current machine; treats symptom |
| **Indirect** | "Restart Mac and hope" | Some caches are session-cleared, most aren't |

---

## Differentiation

**Key differentiators:**
1. **Auditable** — ~150 lines of AppleScript you can read end-to-end in 5 minutes. No binary blob, no closed-source helper, no opaque "let us decide what's safe."
2. **Specifically Xcode-shaped** — encodes the exact list of paths that are safe vs. dangerous (skip Archives, only delete *unavailable* simulators, never touch active project state). That knowledge is the product.
3. **Multi-modal** — single source script, four install paths (Shortcut, CLI, launchd, SwiftBar). Fits any workflow without forcing one.
4. **Safe-by-design defaults** — threshold gate (silent no-op when disk is healthy), `--dry-run` mode (measure before deleting), confirmation alert (skip-able for automation), per-run history log (so you can prove what happened).
5. **Free and forkable** — MIT, no subscription, no telemetry. Fork it and add your own `/tmp` patterns; it's literally one file to edit.

**How we do it differently:** A specialist script that knows iOS dev workflows, beats a generalist binary that treats your Mac like every other Mac.

**Why that's better:** You can verify exactly what gets deleted. You can extend it (community-marketing skill territory — if usage grows). You can run it from any context (manual, scheduled, remote, CLI). You pay $0.

**Why customers choose us:** Trust + control + price. In that order. The "auditable" claim is the moat — once a dev has read the script and confirmed it's safe, they're a permanent user. CleanMyMac will never get that level of trust because their code isn't readable.

---

## Objections

| Objection | Response |
|---|---|
| "I can just `rm -rf` myself." | Yes — until you fat-finger Archives once. The script's value is the encoded knowledge of which paths are safe. Plus `--dry-run` and history log come free. |
| "Why not just use CleanMyMac?" | $30–$50/yr for a generalist that's less Xcode-specific than a known-paths script. And you can't read its code. |
| "What if it deletes something I need?" | Read the source — 150 lines of AppleScript. Or run `--dry-run` first. The script never touches Archives, never touches active simulators, never touches project files. |
| "I don't want a background process eating CPU." | All automation is opt-in. The base install is a manual Shortcut. The launchd agent (when you opt in) sleeps until the hour boundary and no-ops if disk is healthy. |
| "Won't this break my Xcode?" | DerivedData and DeviceSupport are *designed* to be regenerated on next build/device-connect. The first build after cleanup takes ~30 sec longer; nothing else is affected. |
| "Why should I trust a random GitHub repo?" | You shouldn't. Read the script first. It's `dustpan.applescript`, ~150 lines, one screen of code. |

**Anti-persona (people we are NOT for):**
- **Non-Xcode developers** — the script targets Xcode-specific paths. Useless if you're a pure web dev / Windows / Linux.
- **Enterprise IT teams** — no MDM packaging, no signed installer, no central config. Out of scope.
- **Users wanting full-system cleanup** — this is Xcode-only. We won't touch Mail, browser caches, Trash, or Downloads.
- **People who hate giving any tool disk access** — fundamentally needs file-system access to do its job.

---

## Switching Dynamics (Jobs-to-be-Done Four Forces)

- **Push** (what makes them leave their current approach): The macOS "startup disk almost full" banner mid-workflow. A failed `xcodebuild` because there's no room. The realization that they're about to manually rm -rf for the 4th time this quarter and might fat-finger.
- **Pull** (what attracts them to us): The specific GB number ("10–25 GB" — concrete, falsifiable). One-click simplicity. Free. Open source they can read. The four install paths covering every workflow shape.
- **Habit** (what keeps them on their old way): Familiarity with their `rm -rf` ritual. The hassle of "learning yet another tool." Not knowing this tool exists.
- **Anxiety** (what worries them about switching): "Will this delete something I need?" → addressed by the explicit "DOES NOT touch" list + `--dry-run` + open source. "Will it nag me?" → addressed by threshold gate ("silent when disk is healthy"). "Will it phone home?" → addressed by "no telemetry" in headline.

---

## Customer Language

**How they describe the problem (verbatim from real interactions):**
- "Delete all the Xcode junk — need more space."
- "Back filled up."
- "Xcode is eating my disk."
- "DerivedData is huge."
- "Disk full mid-build."
- "Greedy Xcode."
- "Freeing up space."
- "Which paths are safe to delete?"

**How they describe the solution:**
- "One click."
- "Just works."
- "Set it and forget it" (for the launchd path).
- "I can read what it does."

**Words to use:**
- `DerivedData`, `DeviceSupport`, `SwiftPM`, `simulators` (specific Apple terms — devs respect specificity)
- "Reclaim", "wipe", "free up", "safe", "auditable"
- "One click", "one button", "one paste"
- Concrete GB numbers ("10–25 GB", "18 GB freed")
- "Threshold-gated", "dry-run", "history log" (engineering vocabulary)

**Words to avoid:**
- "Streamline", "optimize", "innovative", "magical", "next-generation", "AI-powered"
- Exclamation points
- "Easy" without specifics — devs are skeptical of unqualified "easy"
- "Cleaner" or "speed up your Mac" — sounds like CleanMyMac genre, distrusted
- Vague claims ("save time" without a number)

**Glossary:**

| Term | Meaning |
|---|---|
| `DerivedData` | Xcode's per-project build cache. Located at `~/Library/Developer/Xcode/DerivedData`. Safe to wipe — regenerated on next build. |
| `DeviceSupport` | Debug symbols for connected/historic iOS/watchOS/tvOS devices. Re-downloaded automatically when device reconnects. |
| `SwiftPM` cache | Swift Package Manager dependency cache. Safe to wipe — re-fetched on next package resolve. |
| `Archives` | Shipped app bundles (`.xcarchive`) needed for crash symbolication via `.dSYM` files. **Never wiped** by this tool. |
| Unavailable simulator | A simulator whose iOS/watchOS/tvOS runtime is no longer installed. Removed by `xcrun simctl delete unavailable`. |
| Threshold gate | The script's >50 GB free check — silently no-ops when disk is healthy. |
| `/tmp` orphan | Leftover scratch directory under `/private/tmp` from a previous `xcodebuild` or sandboxed process. Configurable via env var. |

---

## Brand Voice

**Tone:** Direct, dry, no-nonsense. Engineer-to-engineer. Slightly self-deprecating. Zero hype.

**Style:** Technical but not gatekeeping. Specific over vague. Show evidence, never trust claims. Confident without qualifiers ("really", "very", "almost").

**Personality** (5 adjectives): Direct, specific, auditable, dry, useful.

**Models / inspirations:**
- The `htop` / `ripgrep` / `ffmpeg` school of utility-tool prose: terse, factual, every claim backed by behavior you can observe.
- Anti-models: CleanMyMac marketing copy, any tool that says "magical" or shows a sparkle animation.

---

## Proof Points

**Metrics (real, observable):**
- 10–25 GB freed per run on an active dev machine (this is the headline number — concrete, falsifiable; users can verify with `--dry-run`).
- `make report` renders a Unicode-block sparkline of *your own* cleanup history — proof becomes personalized over time.
- All 6 releases (v0.1 → v0.4.2) ship with green CI. Auto-tag/auto-release workflow proves itself by tagging its own release commits.

**Customers / logos:** N/A yet — brand-new public release. The maintainer (Red-E Play workflow) is the proof-by-example.

**Testimonials:** None yet. Future work: pull quotes from GitHub Issues or Show HN comments once the repo gets traction.

**Value themes:**

| Theme | Proof |
|---|---|
| Specific outcome | Headline says "10–25 GB" — backed by per-run measurement and CSV history |
| Safe | README's "DOES NOT touch" section is enforced by the literal rm path list in the script |
| Auditable | ~150 lines of AppleScript, all in one file, visible on the repo homepage |
| Quiet | Threshold gate at 50 GB; launchd agent no-ops silently when not needed |
| Multi-modal | Four install paths, all sharing one source script |

---

## Goals

**Business goal:** Be the canonical "free up Xcode disk space" tool for iOS devs — the answer when someone searches "xcode taking too much disk space" or asks in r/iOSProgramming.

**Primary conversion action:** GitHub star + one install (any of the four paths). Stars are the social-proof flywheel; installs are the success metric.

**Secondary conversion:** PR from another iOS dev adding their own `/tmp` orphan patterns or a new cleanup phase. PRs imply usage and stickiness.

**Channel goals:**
- **SEO** — rank for "xcode disk full", "free up xcode space", "DerivedData cleanup script". The headline phrasing ("Reclaim 10–25 GB Xcode is hoarding") is optimized for this.
- **HN / Show HN** — one-line headline + the dry-run paste = strong post fodder.
- **Word of mouth in iOS dev circles** (Mastodon, Slack groups, r/iOSProgramming, r/swift) — the "auditable" claim is the share-trigger.

**Current metrics:**
- v0.4.2 latest release as of 2026-05-08
- 0 external stars, 0 forks (just shipped)
- 6 releases shipped over the past day with green CI

---

*To update: rerun the `product-marketing-context` skill in any future Claude session. To regenerate from current state of the repo: pass "auto-draft from codebase".*

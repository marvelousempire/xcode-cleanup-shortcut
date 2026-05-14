# Launch Plan — xcode-cleanup-shortcut

> Reading order: this file → `.agents/product-marketing-context.md` for positioning → README for the user-facing pitch.

**Status:** Pre-launch
**Target launch window:** Tuesday or Wednesday, 8:00–9:30 AM US Eastern (peaks HN front-page chance)
**Owner:** [@marvelousempire](https://github.com/marvelousempire)

---

## Executive summary

This is **not** a SaaS launch — no waitlist, no email capture, no phases. It's a single-day coordinated push to bring a free, open-source dev utility into iOS-dev consciousness. The goal is **GitHub stars + one install** (any of four paths), measured over 7 days post-launch.

The product is fully ready. The README is conversion-shaped (rewritten via `copywriting` skill). The positioning is locked into `.agents/product-marketing-context.md`. The only soft gap is the progress-bar GIF (issue #2) — recommend capturing it before launch but not a blocker.

### Three plausible outcomes

| Scenario | Stars at T+7d | What it means | Next move |
|---|---|---|---|
| **Hit** | 500+ | Front page of HN / r/iOSProgramming hot post | Issue triage mode (see below); roadmap public release planning |
| **Steady** | 50–500 | Niche-aware iOS dev audience found it; word of mouth working | Repeat the launch in 6 months with new features; build owned channel |
| **Flop** | <50 | Nobody saw it, or saw it and didn't care | Diagnose: was it the title? the timing? the GIF gap? Re-launch with fixes |

All three are acceptable outcomes for a zero-cost side-project launch. The asymmetric upside (canonical disk-cleanup tool) justifies a few hours of coordinated effort.

---

## Pre-launch checklist (do all of these BEFORE T-0)

- [x] README rewritten with hook headline (v0.4.2)
- [x] `.agents/product-marketing-context.md` complete (v0.4.3)
- [x] `docs/SHORTCUTS.md` paste-ready (v0.4.1)
- [x] CHANGELOG up to date
- [x] All 7 releases tagged + auto-release workflow green
- [ ] **Progress-bar GIF captured** ([issue #2](https://github.com/marvelousempire/xcode-cleanup-shortcut/issues/2)) — soft blocker; HN/Reddit posts with visuals get 2–3× engagement
- [ ] **Run `--dry-run` on YOUR own machine** and screenshot the output (the freed-GB number is a great proof point in the post)
- [ ] **Star the repo from a second GH account** so it doesn't show "0 stars" when HN/Reddit lands on it (this is fine; it's your own account)
- [ ] **Pin the repo** to your GitHub profile
- [ ] **Verify Issues are enabled** and you've got notifications on
- [ ] Draft + schedule the social posts (see Channel Copy below)
- [ ] Block 4 hours on your calendar starting at the launch time — you need to be reachable for live comment response

---

## Launch-day timeline (all times US Eastern)

| T | Action | Channel |
|---|---|---|
| **T-1d** (Mon eve) | Pre-warm: post on Mastodon "shipping something tomorrow" — builds curiosity | Mastodon |
| **T-0 = 8:00 AM Tue** | Post **Show HN** | Hacker News |
| T+15m | If Show HN is alive (≥3 upvotes), post on Mastodon | Mastodon |
| T+30m | Post on **r/iOSProgramming** | Reddit |
| T+1h | Post on X / Twitter (thread, screenshot in first tweet, link in second) | X |
| T+2h | Post on **r/swift** *(only if r/iOSProgramming is going well — avoid spam-flag)* | Reddit |
| T+4h | DM 3–5 iOS dev influencers individually (Paul Hudson, Sean Allen, Antoine van der Lee, Curtis Herbert, Marin Todorov). Subject line: "Built this last week, thought you might like it" + link. **Not asking for retweets** — just sharing. | DM |
| **T+8h** | Pause, eat dinner. Resist refreshing HN. | — |
| T+24h | Write a short follow-up post — "What happened on launch day" — for future use | Owned (draft) |

---

## Channel copy (paste-ready)

### Show HN

**Title** (67 chars):
```
Show HN: Xcode Cleanup – a macOS Shortcut that frees 10–25GB safely
```

**URL field:** `https://github.com/marvelousempire/xcode-cleanup-shortcut`

**Text field** (leave empty — HN convention for Show HN with a working URL).

**First comment** (post yourself within 30 seconds of submission — anchors the discussion):

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
> MIT, no telemetry, no auto-update phone-home. Critique welcome — especially edge cases I'm not aware of in DeviceSupport or simulator runtime detection.

---

### r/iOSProgramming

**Title:**
```
I built a free Xcode disk-cleanup Shortcut after fat-fingering my Archives once. Open source, threshold-gated, takes one click.
```

**Body:**

> Sharing in case it saves anyone else the same headache.
>
> **The problem:** Xcode's caches grow to 20+ GB silently. DerivedData, iOS/watchOS/tvOS DeviceSupport, SwiftPM, simulator caches. Every iOS dev has at some point Googled "which Xcode paths are safe to delete" — and at some point one of us has hit Archives by mistake and lost crash symbolication for a shipped App Store build (that was me, on a Tuesday afternoon I'd very much like back).
>
> **What I built:** [github.com/marvelousempire/xcode-cleanup-shortcut](https://github.com/marvelousempire/xcode-cleanup-shortcut)
>
> A single AppleScript (~150 lines, all readable) that:
> - Wipes the 5 known-safe Xcode caches
> - Removes simulators for runtimes you've already uninstalled
> - **Never** touches Archives or active simulators
> - Threshold-gated — silent when disk is healthy
> - `--dry-run` measures what cleanup would free without deleting
> - Per-run history in `~/Library/Logs/dustpan-history.csv`
>
> **How you install it (pick one or stack them):**
> - Apple Shortcut (menu bar, hotkey, schedulable)
> - `xcc` CLI (`xcc --dry-run`, `xcc --force`)
> - launchd hourly agent (silent until disk pressure)
> - SwiftBar plugin (live free-disk indicator + 1-click cleanup)
> - Run Script Over SSH for a remote Mac (build server / second machine)
>
> MIT, free, no telemetry. PRs welcome — the `/tmp` orphan patterns ship with my own project's defaults; happy to take patterns from yours.
>
> Quickest way to see if it'd help you:
> ```
> bash <(curl -fsSL https://raw.githubusercontent.com/marvelousempire/xcode-cleanup-shortcut/main/scripts/remote-cleanup.sh) --dry-run
> ```
>
> Curious what edge cases I haven't thought of — especially around DeviceSupport for paired Apple Watch / Vision Pro setups.

---

### r/swift *(secondary — post 2h after r/iOSProgramming, only if that's going well)*

**Title:**
```
Free Xcode disk-cleanup utility (Shortcut + CLI + launchd) — open source, threshold-gated, dry-run mode
```

**Body:** Same as r/iOSProgramming, with one tweak — replace "iOS dev" with "Swift dev" and add a line acknowledging the script is AppleScript not Swift, because r/swift readers will notice:

> *(One pre-emptive note for this sub: the core script is AppleScript, not Swift. That was deliberate — AppleScript is the only language that gives you native macOS progress bars + notifications from a one-file dependency-free script. The `xcc` CLI wrapper is bash. Open to a Swift rewrite as a future variant if there's interest.)*

---

### iOS dev Mastodon

**Thread (3 posts):**

Post 1:
```
Shipped a free open-source thing today: a macOS Shortcut that wipes Xcode's caches safely (DerivedData, DeviceSupport, SwiftPM, dead simulators) without touching Archives.

Headline number: 10–25 GB reclaimed per run on my machine.

🧵 ↓
```

Post 2:
```
The reason it exists: I fat-fingered Archives once during a quarterly "ugh disk full" rm -rf and lost crash symbolication for a shipped App Store build. Wanted a small auditable script that knew which paths were safe vs. not.

150 lines of AppleScript you can read in five minutes.
```

Post 3:
```
Four install paths share one script:
• Shortcut (menu bar / hotkey / schedule)
• xcc CLI
• launchd hourly agent
• SwiftBar menu-bar plugin

MIT, no telemetry, no auto-update phone home.

github.com/marvelousempire/xcode-cleanup-shortcut

#iOSDev #Xcode #macOS
```

---

### X / Twitter

**Tweet 1** (image: screenshot of `xcc --dry-run` output showing the freed-GB number):
```
Free Xcode disk-cleanup utility. One AppleScript, four install paths (Shortcut/CLI/launchd/SwiftBar). Reclaims 10–25 GB safely — skips Archives so App Store crash symbolication stays intact.

MIT, no telemetry, open source.
```

**Tweet 2** (reply to your own tweet — algo de-prioritizes external links in first tweet):
```
Repo + install instructions:
github.com/marvelousempire/xcode-cleanup-shortcut

Quickest way to see how much it'd free on your Mac:
bash <(curl -fsSL https://raw.githubusercontent.com/marvelousempire/xcode-cleanup-shortcut/main/scripts/remote-cleanup.sh) --dry-run
```

---

### Product Hunt *(optional — recommend skipping for v1 launch)*

PH expects polished marketing assets — gallery images, demo video, polished tagline. For a dev utility you can run from the terminal, the ROI is low and the prep time is high (4+ hours for assets vs. 30 min for Show HN). **Recommendation: skip for the initial launch.** Revisit at the v1.0 release if traction warrants.

If you do launch on PH:
- Tagline (60 chars): `Reclaim 10–25 GB Xcode is hoarding. Free, MIT, audi­table.`
- Description: pull from the README hero
- Gallery: README icon, dry-run output screenshot, SwiftBar menu-bar screenshot, the install-path matrix table
- First comment: cross-post the Show HN first comment
- Timing: Tuesday 12:01 AM PT, all-day engagement required

---

## Engagement playbook

### Within 30 minutes of every channel post

- Reload the post. Reply to **every** comment.
- For technical questions ("does this clear ModuleCache.noindex?"): answer with the actual behavior, point to the relevant lines in the script.
- For "why not just use X?" questions (X = CleanMyMac / DevCleaner / etc.): use the differentiation table from `.agents/product-marketing-context.md` — auditable + Xcode-specific + multi-modal + safe + free. Don't trash competitors; just be specific about the difference.
- For "I wish it also cleaned Y" requests: thank, ask them to open an issue or PR, **don't promise it on the spot**.

### What to absolutely not do

- ❌ Don't reply with marketing-speak ("Great question!", "Glad you asked!"). HN/Reddit downrank instantly.
- ❌ Don't fight critics. If someone says "this is a bash script with extra steps" — agree partially ("yes, the core operations are rm -rf — the value is the encoded knowledge of which paths are safe and the multi-install-path packaging"), don't escalate.
- ❌ Don't @ users to ask for upvotes. Auto-flagged.
- ❌ Don't post on more than one Reddit sub per hour during launch window — both look spammy and Reddit's algorithm hates it.
- ❌ Don't auto-DM HN/Reddit voters or commenters. Reddit-bannable; HN frowns on it.

### Tone reminders (from product-marketing-context brand voice)

- Direct, dry, slightly self-deprecating
- Zero exclamation points
- "I built this because [specific pain]" beats "Excited to announce!!!"
- Specificity (GB numbers, path names) beats abstraction
- Acknowledge limits openly — "I haven't tested this on Sonoma yet" is more credible than vague promises

---

## If it lands (Hit / Steady scenarios)

### Hour 1–4: First responders

- **Star spike monitoring:** Open `https://github.com/marvelousempire/xcode-cleanup-shortcut/stargazers` in a tab and refresh every 30 min for the first 4h. Pattern-match: who's starring, what kind of profile (iOS-leaning is good signal).
- **Issue triage:** New issues will come in. Most will be feature requests; some will be bug reports. Sort:
  - **Real bugs:** acknowledge within 1h, fix within 24h
  - **Feature requests:** label `enhancement`, thank, ask for more detail, don't commit to a timeline
  - **Critique / "won't fix" requests:** respond once, politely, with the differentiation table

### Hour 4–24

- **First PR is likely:** someone will open a PR adding their own `/tmp` patterns, or a new cleanup phase (`brew cleanup -s`, `pnpm store prune`, etc.). Review same-day. **Merge generously** — early-launch PRs are momentum and the contributor often becomes a champion. If you can't merge as-is, suggest specific changes, not a vague "needs work."
- **HN flame-pit watch:** sometimes a tangent thread starts (e.g. "I've been using `find ~/Library -name 'Caches' -delete` for years and it's never broken anything" → 30-comment subthread on macOS-cache safety). Engage if you have something useful to add, ignore if it's drifted off-topic. Don't try to control every thread.

### Day 2–7

- **Write a "what happened on launch day" post** for your blog/Mastodon — meta-content drives a second wave. Numbers + lessons. People love the "what worked, what didn't" format.
- **Identify your first 3 power users** — people who not only starred but commented thoughtfully or opened a PR. DM them: "Thanks for the [specific thing they did]. Mind if I ask: how did you find the repo, and what would make you recommend it to someone?" This is light VoC research — feeds back into `customer-research` skill calls later.

---

## If it flops (Flop scenario)

**Don't panic. Don't delete posts. Don't relaunch immediately.**

Diagnose for 48 hours, then decide:

| Symptom | Likely cause | Fix |
|---|---|---|
| Show HN got <5 votes in first hour | Wrong timing (peak window is Tue/Wed 8–9:30am ET), or title was unclear | Re-submit with a sharper title in 2–3 weeks (HN allows after a cooling period if content didn't get discussed) |
| Reddit got removed or shadow-banned | Looked too promotional, or new account with no karma | Build comment karma in the sub for 2 weeks, then repost with a more "I built this for myself" framing |
| Good initial spike but no installs | Hero copy is unclear OR the dry-run command is too scary OR there's no GIF | Capture the progress-bar GIF (issue #2), then re-pitch in 2 weeks |
| Crickets on every channel | The need isn't as visceral as you think, OR the audience isn't where you're posting | Switch channels: try iOSDevWeekly newsletter submission, Hacking with Swift forums, Swift Slack #showcase |

Re-launch budget: **one full retry, 30 days out.** After that, accept the result and either pivot the product (different scope) or shelve it as a personal tool.

---

## 7-day post-launch follow-up plan

| Day | Action |
|---|---|
| **D+1** | Reply to anything overnight. Star + Reddit-message anyone who opened a high-quality issue or PR. |
| **D+2** | Write the "what happened on launch day" post (numbers + 3 lessons). Publish to Mastodon thread. |
| **D+3** | Audit feedback themes. Group by: (a) missing features people want, (b) confusing parts of the docs, (c) edge cases not covered. Open issues for each cluster. |
| **D+4** | Address the top 3 doc-clarity issues (low-hanging fruit). Ship as v0.5.0 with CHANGELOG entry. |
| **D+5** | If a Show HN clone-post lands on a related topic (e.g. someone posts "Show HN: My macOS cache cleaner"), comment with a link to xcode-cleanup-shortcut as a related project. Only if genuinely relevant. |
| **D+6** | Reach out to one iOSDevWeekly-style newsletter with a brief submission. Subject: "Submission for an upcoming issue: free DustPan disk cleaner [link]" + 2-sentence pitch. |
| **D+7** | Decide: keep promoting (re-launch in 30d for v1.0)? Shift to feature work? Audit star/install growth. |

---

## Owned-channel build (long-term)

Even though this is a one-day launch with no email list, **build one** during launch:

- Add a simple "Watching this repo? Get an email when v1.0 ships" link on the README pointing to a [Buttondown](https://buttondown.email) or [TinyLetter](https://tinyletter.com) form. Zero-effort owned channel.
- Each subsequent release announcement goes to that list.
- Over 6–12 months, this becomes the most valuable thing the launch produces — direct line to people who've already self-identified as iOS devs who care.

*(Optional. Not blocking for v1 launch.)*

---

## Metrics to watch (record daily for 7 days)

| Metric | T+0 | T+1d | T+3d | T+7d | Note |
|---|---|---|---|---|---|
| GitHub stars | 0 | | | | The primary signal |
| Issues opened | 0 | | | | Engagement quality |
| PRs opened | 0 | | | | Stickiness signal |
| Forks | 0 | | | | Strong stickiness signal |
| HN comments | 0 | | | | Conversation depth |
| Reddit upvotes | 0 | | | | |
| Reddit comments | 0 | | | | |
| `xcc --report` runs (proxy: # of CSV rows) | n/a | | | | Can't measure remotely; ask 3 random adopters |

---

## After launch — chain the next marketing skill

1. **`/customer-research`** to validate the VoC assumptions in `.agents/product-marketing-context.md` against real launch-day comments (verbatim quotes, common questions, repeated objections)
2. **`/page-cro`** if launch lands a lot of GitHub traffic but few stars — README is the landing page; conversion-optimize it
3. **`/programmatic-seo`** if you decide to expand into related queries ("free up DerivedData", "Xcode Archives location", "xcrun simctl delete unavailable") — generate one short page per query that links back to the repo
4. **`/email-sequence`** if the owned-channel list grows past 50 subscribers — onboarding sequence

Don't run any of these until launch data is in.

# 💬 Every cleanup tells you the cost before you click

**Tagline:** Cleaning Chrome's cache? *"The first time you load each website it'll be 1–3 seconds slower."* Cleaning Xcode's working files? *"Your next build will take about 30 extra seconds."* No mystery. No "trust me." No closed source.

**Version:** Founding principle — present since v0.10
**Surface:** Every action button, every confirmation modal, every emergency card
**Backend:** `web/cleaners.py` — the `cost` field on every action

## The principle

Every disk cleaner has a tradeoff: you give up speed, convenience, or some piece of state in exchange for free space. "Clear cache" sounds harmless because most users don't know what cache means. But the cache exists for a reason — clearing it means *something* gets slower, *something* re-downloads, *something* needs to be rebuilt.

**DustPan's founding principle: name the cost before the click.**

Not after. Not in fine print. Not "the app will re-launch faster after this" hand-wavy nonsense. The actual, specific, concrete cost — what will be slower, by how much, for how long, the first time it happens.

This is the single biggest reason to use DustPan over CleanMyMac, Onyx, or `rm -rf` guesses you Googled. Every other tool says "click here to clean caches." DustPan says:

> **Cursor Code Cache** (~/Library/Application Support/Cursor/Code Cache)
>
> Cursor's compiled JavaScript bytecode cache. Cursor rebuilds it on next launch.
>
> **Cost:** Cursor takes ~10 seconds longer on next launch (just once). Extensions stay installed; their cached metadata is rebuilt. No code/settings/projects affected.

You can decide whether 10 seconds of launch slowdown is worth the GB recovered. The app doesn't pretend the cost doesn't exist.

## Where it shows up

### Every action card in every category

Each cleaner action in `cleaners.py` carries a `cost` field that ships unchanged through to the UI:

```python
"clear-deriveddata": {
    "label": "Clear Xcode Build Cache (DerivedData)",
    "desc":  "Removes ~/Library/Developer/Xcode/DerivedData/* …",
    "cost":  "One slower Xcode build. That's it.",
    "shell": "rm -rf ~/Library/Developer/Xcode/DerivedData/*",
},
```

### The approval card in the AI chat

When SADPA wants to run a cleanup, the approval card pulls `desc` and `cost` straight from `cleaners.py` — **never AI-generated text**. So the warning you see is curated copy from the canonical source, not the model trying to sound authoritative:

```
⚠️  SADPA wants to run this

    Run 'Clear Xcode Build Cache (DerivedData)' in Xcode

    Removes ~/Library/Developer/Xcode/DerivedData/* — Xcode's scratch pad
    where it saves build work. Your code is completely untouched.

    Cost: One slightly slower Xcode build (~30s). That's it.

    [✓ Approve]  [✕ Reject]
```

### The Emergency Rescue panel

Each emergency card has its own version of the same explanation:

```
② Xcode iOS Device Debug Files (iOS DeviceSupport)        typically 2–8 GB

   What is this?
   One folder per iPhone model per iOS version. Downloaded when you plugged
   in a device. They stack up for years.

   If you delete it:
   1–2 min re-download next time you plug a device in.

   rm -rf ~/Library/Developer/Xcode/'iOS DeviceSupport'/*

   [▶ Run this]
```

### The Survey panel cards

Even in the Space Survey results — where the action is "click through to category X" rather than running anything directly — each card carries the rebuild cost:

```
Cost to rebuild:  Re-pull images as needed (1–5 min each)
```

## Why this matters

Most "Mac cleaner" apps treat the user like a customer who needs to be sold space-savings. The pitch is always **the bigger number, the better**. They'll happily delete things that meaningfully break your workflow (Xcode Archives, simulator state with installed app data, browser session cookies) and call it "freeing space."

DustPan treats the user like an engineer making an informed tradeoff. The cost text is honest. Sometimes the cost is *"nothing"* (truly safe caches). Sometimes the cost is *"a small inconvenience once"* (most caches). Sometimes the cost is *"you lose state you care about"* — and DustPan classifies those as `caution` tier and refuses to clean them via "Clean ALL safe" buttons.

A side effect: this principle also makes DustPan **auditable**. Every action's cost lives in source. If a curator writes "no cost" for an action that actually causes data loss, that's a reviewable mistake in a Python file, not a closed-source claim in a marketing page. Open source means open accountability.

## What "cost" looks like across categories

| Category | Example action | Cost annotation |
|---|---|---|
| Xcode | DerivedData | "One slower Xcode build. That's it." |
| Xcode | iOS DeviceSupport | "1–2 min re-download next time you plug in a device." |
| Docker | docker system prune | "Re-pull a removed image takes 1–5 min on next docker run." |
| Apps | Cursor Code Cache | "Cursor takes ~10s longer on next launch (just once)." |
| Browsers | Chrome cache | "First load of each website is 1–3 seconds slower until cache rebuilds." |
| LLMs | Claude desktop cache | "App takes a few seconds longer to launch once. No conversations lost." |
| System | Photo analysis cache | "Face recognition re-learns in the background over a few hours." |
| Creative | Adobe Media Cache | "Effects pre-renders re-build when you next scrub through a clip." |
| Downloads | Old installers | "You re-download installers if you ever need them again." |
| Temp | pnpm store | "pnpm re-downloads packages as needed (slower once)." |

## Paste-ready channel copy

### Tweet (280 chars)

> Every "Mac cleaner" promises space savings. None tell you what you lose.
>
> DustPan does. Every action: "Cleaning Chrome's cache means the first time you load each website it'll be 1–3 seconds slower."
>
> Informed tradeoff, not a sales pitch.
>
> https://github.com/marvelousempire/dustpan

### LinkedIn

> Most "Mac cleaner" apps optimize for the bigger-the-number-the-better story. They'll delete things that quietly break your workflow — Xcode Archives, simulator state, browser sessions — and proudly tell you how many GB they freed.
>
> DustPan does the opposite. Every cleanup action has a curated **cost annotation** that names exactly what slows down, what re-downloads, what re-builds — and how long.
>
> Cleaning Chrome's cache? *"The first time you load each website it'll be 1–3 seconds slower."*
>
> Cleaning Xcode's DerivedData? *"Your next build will take about 30 extra seconds."*
>
> Cleaning Cursor's caches? *"Cursor takes ~10 seconds longer on next launch (just once). Extensions stay installed; their cached metadata is rebuilt. No code/settings/projects affected."*
>
> You decide whether the tradeoff is worth it. The app doesn't pretend the cost doesn't exist.
>
> This is also why DustPan is auditable: every cost annotation lives in `cleaners.py`, a hand-curated Python file. If a curator writes "no cost" for an action that causes data loss, that's a reviewable mistake in source, not a marketing claim. Open source means open accountability.
>
> https://github.com/marvelousempire/dustpan

### Reddit post

**Title:** Built a Mac cleaner that tells you what you'll lose before you click

**Body:**

> Annoyed at "Mac cleaner" apps that hand-wave the cost of deletion ("removes unnecessary files!" — which files? unnecessary to whom?), I built DustPan with a founding principle: every cleanup action has a **curated cost annotation** that names exactly what gets slower or rebuilds.
>
> Examples from the source file (cleaners.py):
>
>  - DerivedData: "One slower Xcode build. That's it."
>  - iOS DeviceSupport: "1–2 min re-download next time you plug in a device."
>  - Chrome cache: "First load of each website is 1–3 seconds slower until cache rebuilds."
>  - Docker prune: "Re-pull a removed image takes 1–5 min on next docker run."
>  - Cursor caches: "Cursor takes ~10s longer on next launch (just once)."
>
> Every action button in the UI shows this text before you click. The AI agent's approval cards pull from the same source — so even when the AI is suggesting a cleanup, the warning text is curated, never hallucinated.
>
> Three tier classification: safe (always reclaimable), probably_safe (usually fine), caution (needs human review). "Clean ALL safe" buttons never touch the caution tier.
>
> Free, open source, MIT. https://github.com/marvelousempire/dustpan

## FAQ

**Q: Where does the cost text come from?**
A: A hand-curated Python file (`web/cleaners.py`). Every category, every action, every cost annotation has been written by a human. The AI agent reads this text but never writes it.

**Q: What if the cost annotation is wrong?**
A: It's in source. Open a PR. The "cost annotation is wrong" feedback loop is the same as "any other source bug" — file an issue, propose a change, get reviewed.

**Q: What if a cleanup causes a worse cost than the annotation says?**
A: That's a bug. Open an issue. The promise is that the annotation is honest about the *expected* cost; edge cases (e.g. clearing browser cache on a really slow connection) might be longer than the annotation says, and we'd refine the annotation.

**Q: Why not auto-detect the cost?**
A: Some costs are measurable (download size = re-download time). Most aren't (how much do you care about your IDE re-indexing?). The honest cost is a human judgment about what the user will notice, written by someone who's actually used the thing being cleaned.

**Q: Does the AI agent ever generate cost text?**
A: No — for actions in `cleaners.py`, the AI uses the curated text verbatim. When the AI proposes a *new* cleaner (`propose_new_cleaner` tool), it has to write its own `cost_to_user` field — but that proposal goes to the review inbox, and the human reviews the cost text along with the rest of the proposal before accepting.

## The cost annotations as design constraints

Writing the cost annotation forces the curator to actually think about what each cleanup does. Several times during DustPan's development, the annotation step uncovered that an "always safe" action wasn't always safe — and the action got reclassified or removed.

Examples of cost-annotation-triggered reclassifications:

- `com.apple.sharedfilelist` was originally `safe` ("just preferences"). Writing the annotation forced asking: which preferences? Answer: Finder sidebar favourites. Wiping it deletes the user's saved sidebar. Reclassified to `caution`-only.
- iCloud Drive caches were marked safe. Annotation: "files re-download from iCloud." But "files might be partial downloads" — clearing breaks in-progress syncs. Moved to `probably_safe` with explicit warning.

The annotation is a design tool, not just marketing copy.

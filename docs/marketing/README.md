# DustPan marketing — feature-by-feature

This folder holds one Markdown file per shipped feature of DustPan. Each file is **self-contained marketing material**: the problem, the solution, mockups, paste-ready channel copy, FAQs, and what it took to ship.

The intent: if you (or a marketing agent, or a contributor writing a blog post) want to write about *one* DustPan feature, you should be able to open one file and have everything you need — no hunting through the README, the changelog, or the PR history.

## Files in this folder

| File | Feature | Version | Plan |
|---|---|---|---|
| [chat-with-sadpa.md](./chat-with-sadpa.md) | 💬 Conversational AI agent with tool-calling (BYO API key) | v0.23.0–v0.25.0 | 0023 |
| [locked-space-recovery.md](./locked-space-recovery.md) | 🔒 Find disk space locked by previous users | v0.24.0 | 0024 |
| [emergency-rescue.md](./emergency-rescue.md) | 🚨 Disk-at-zero rescue panel with live in-app terminal | v0.21.4–v0.21.5 | 0021 |
| [space-survey.md](./space-survey.md) | 📊 Live-streaming comprehensive filesystem crawl | v0.22.0–v0.22.1 | 0022 |
| [cleaner-proposals.md](./cleaner-proposals.md) | 📋 AI proposes new cleaners; you review and paste | v0.25.0 | 0023 Ship 2 |
| [every-cleanup-tells-you-the-cost.md](./every-cleanup-tells-you-the-cost.md) | 💬 The founding cost-transparency principle | All versions | — |
| [the-original-pitch.md](./the-original-pitch.md) | 🧹 Xcode cache cleanup — the original audience pitch | v0.1.0–today | — |

## How to use these files

**To write a blog post / video script:** open the file for the feature, copy the "Story arc" section as your outline, and use the "Paste-ready channel copy" as starter material to rewrite in your own voice.

**To launch on a channel:** the "Paste-ready channel copy" section has Tweet / LinkedIn / Reddit / Show HN variants per feature. They're meant to be adapted, not copy-pasted verbatim — every channel has its own dialect.

**To answer a user question:** the FAQ section in each file has the most common questions a curious user or skeptical reviewer might ask, with the honest answer.

**To brief a new contributor:** start them with the "What it took to ship" section — it shows the design tradeoffs and what we explicitly chose not to do.

## Style guide

Every file follows the same shape (skim one to learn the template):

1. **Header block** — tagline, version, plan, surface
2. **Problem in plain English** — what was broken before this feature existed
3. **How DustPan solves it** — the actual mechanism
4. **What it looks like** — mockup or ASCII diagram of the UI
5. **The technical story** — for HN / power users / engineering blog posts
6. **Paste-ready channel copy** — tweet, LinkedIn, Reddit, Show HN
7. **FAQ** — the honest answers to common questions
8. **What it took to ship** — design decisions, things we chose not to do

Voice: plain English, short paragraphs, specific numbers, no hype. Treat the reader like a smart friend, not a marketing target.

## When to add a new file

Add a new file when you ship a feature that meets all three:
1. **It's substantive** — at least a full PR's worth of work, ideally with its own version bump
2. **It's user-facing** — visible in the dashboard, the CLI, or a documented endpoint
3. **It's stand-alone marketable** — you'd write a tweet just about this

Update an existing file when you ship an enhancement that strengthens an existing pillar.

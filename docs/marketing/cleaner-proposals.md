# 📋 AI cleaner proposals — the app teaches itself

**Tagline:** When SADPA finds a cache DustPan doesn't already track, it proposes a new cleaner. You review, accept, and get a paste-ready Python snippet. The source file stays hand-curated.

**Version:** v0.25.0 (Plan 0023 Ship 2)
**Plan:** [0023 Ship 2](../../plans/)
**Surface:** Inbox inside the `💬 Chat with SADPA` tab + pending-count badge in the sidebar
**Backend:** `web/proposals_store.py`, `web/agent_tools.py::_h_propose_new_cleaner`
**Frontend:** `apps/web/src/components/ProposalsInbox.tsx`

## The problem in plain English

DustPan's `cleaners.py` file is the source of truth for every path the app knows how to clean. It's hand-curated — 19 categories, ~120 paths, ~35 actions. That's the right design: every entry has been vetted, has a curated `desc` and `cost` text, and the file is a reviewable Markdown-like Python.

But there's a long tail. JetBrains caches. `pyenv` build artifacts. Bun's install cache. Rust target dirs. Older `pip` wheels. The library of caches that *could* be in DustPan grows over time as more people use more tools.

You could:
- Ask users to file PRs (slow, requires git workflow)
- Build a settings UI for adding custom paths (defeats the curation guarantee)
- Just add them to the source file periodically (the maintainer's bottleneck)

What you actually want: the AI agent that's already chatting with the user about their disk **proposes the addition itself**, in a format that's easy for the maintainer to accept and ship.

That's the `propose_new_cleaner` tool.

## How DustPan solves it

### The tool

When the agent is exploring (asked "find caches you don't already track" or has spotted a fat directory in `list_directory` output), it calls `propose_new_cleaner` with structured input:

```json
{
  "name": "JetBrains IDE Caches",
  "category_id_suggested": "apps",
  "rationale": "JetBrains IDEs (IntelliJ, PyCharm, WebStorm) keep large indexes and caches in ~/Library/Caches/JetBrains. They rebuild on next IDE launch.",
  "cost_to_user": "IDE re-indexes on next launch (~30 sec).",
  "paths": [
    {"label": "IntelliJ caches", "path": "~/Library/Caches/JetBrains/IntelliJIdea2024.1", "tier": "safe"},
    {"label": "PyCharm caches",  "path": "~/Library/Caches/JetBrains/PyCharm2024.1",      "tier": "safe"},
    {"label": "WebStorm caches", "path": "~/Library/Caches/JetBrains/WebStorm2024.1",     "tier": "safe"}
  ]
}
```

The tool **never modifies `cleaners.py`**. It writes to `~/.dustpan/proposals.json` as a pending record:

```json
{
  "id": "4029b663acb1",
  "created_at": 1715692800,
  "status": "pending",
  "name": "JetBrains IDE Caches",
  "category_id_suggested": "apps",
  "rationale": "JetBrains IDEs (IntelliJ, …",
  "cost_to_user": "IDE re-indexes on next launch (~30 sec).",
  "paths": [...],
  "shell": null,
  "source": "ai-chat"
}
```

### The inbox

A `ProposalsInbox` component sits at the bottom of the Chat with SADPA panel. It shows pending proposals immediately; filter chips let you switch to accepted / dismissed / all. Each card has:

- The proposal's name + category + path count
- The agent's rationale and cost-to-user text
- A path table with tier badges (Safe / Opt-in / Caution)
- The optional shell action, if the agent proposed one
- **[✓ Accept & generate snippet]** and **[✕ Dismiss]** buttons

### The snippet generator

Accept calls `POST /api/ai/proposals/<id>/accept`. The server marks the proposal accepted and calls `proposals_store.generate_snippet(proposal)`, which produces:

```python
# ── Proposed by AI agent: JetBrains IDE Caches ──
# Target category: 'apps'
# Rationale: JetBrains IDEs (IntelliJ, PyCharm, WebStorm) keep large indexes and caches in ~/Library/Caches/JetBrains.
# Cost: IDE re-indexes on next launch (~30 sec).
# Add the following tuples to CATEGORIES['apps']['groups'][TIER]:

# Tier: safe
    ("IntelliJ caches", "~/Library/Caches/JetBrains/IntelliJIdea2024.1"),
    ("PyCharm caches", "~/Library/Caches/JetBrains/PyCharm2024.1"),
    ("WebStorm caches", "~/Library/Caches/JetBrains/WebStorm2024.1"),
```

The snippet matches the exact style used in `cleaners.py` — tuples per tier, comments at the top, double-quote strings. If the proposal included a shell action, the snippet adds an action block too:

```python
# Optional: custom action in CATEGORIES['apps']['actions']:
"ai-jetbrains-ide-caches": {
    "label": "JetBrains IDE Caches",
    "desc":  "JetBrains IDEs (…) keep large indexes…",
    "cost":  "IDE re-indexes on next launch (~30 sec).",
    "shell": (
        "rm -rf ~/Library/Caches/JetBrains/*/caches/* 2>/dev/null"
    ),
},
```

The snippet is shown in a monospace block with a **[📋 Copy]** button. You copy, paste into `cleaners.py`, commit, ship a new version. The file stays hand-curated.

### The sidebar badge

The Dashboard context polls `/api/ai/proposals/count` on mount and every 30 seconds. When pending > 0, the **💬 Chat with SADPA** sidebar entry shows a small accent-coloured badge with the count:

```
💬 Chat with SADPA  [2]
```

So even if you're on a different tab and SADPA filed a proposal during a previous chat, you'll see the badge and know to check.

## What it looks like — full inbox mockup

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 AI Cleaner Proposals          [2 pending]                            │
│                          [pending] [accepted] [dismissed] [all]         │
│                                                                          │
│ When SADPA finds a cache or directory DustPan doesn't yet know about,   │
│ it proposes a new cleaner here. Accept generates a paste-ready snippet  │
│ you can drop into cleaners.py. DustPan never auto-edits source — the    │
│ file is hand-curated.                                                    │
│                                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 💡 JetBrains IDE Caches                          [pending]   [▲]    │ │
│ │ → apps category · 3 paths                                            │ │
│ │ ─────────────────────────────────────────────────────────────────── │ │
│ │ Why                                                                  │ │
│ │ JetBrains IDEs (IntelliJ, PyCharm, WebStorm) keep large indexes…    │ │
│ │                                                                      │ │
│ │ Cost to user                                                         │ │
│ │ IDE re-indexes on next launch (~30 sec).                            │ │
│ │                                                                      │ │
│ │ Proposed paths                                                       │ │
│ │ ┌─────────────────────────────────────────────────────────────────┐│ │
│ │ │ [Safe]  IntelliJ caches   ~/Library/Caches/JetBrains/Intelli… ││ │
│ │ │ [Safe]  PyCharm caches    ~/Library/Caches/JetBrains/PyCharm… ││ │
│ │ │ [Safe]  WebStorm caches   ~/Library/Caches/JetBrains/WebSto…  ││ │
│ │ └─────────────────────────────────────────────────────────────────┘│ │
│ │                                                                      │ │
│ │ [✓ Accept & generate snippet]  [✕ Dismiss]                         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 💡 Rust target/ directories                       [pending]   [▼]   │ │
│ │ → temp category · 2 paths                                            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

After clicking Accept, the card shows the generated snippet:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ✓ JetBrains IDE Caches                              [accepted]   [▲]   │
│                                                                          │
│ Paste-ready snippet for cleaners.py            [📋 Copy]                │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ # ── Proposed by AI agent: JetBrains IDE Caches ──                  │ │
│ │ # Target category: 'apps'                                            │ │
│ │ # Rationale: JetBrains IDEs (IntelliJ, PyCharm, WebStorm) keep…     │ │
│ │ # Cost: IDE re-indexes on next launch (~30 sec).                    │ │
│ │ # Add the following tuples to CATEGORIES['apps']['groups'][TIER]:    │ │
│ │                                                                       │ │
│ │ # Tier: safe                                                          │ │
│ │     ("IntelliJ caches", "~/Library/Caches/JetBrains/IntelliJIdea…"), │ │
│ │     ("PyCharm caches",  "~/Library/Caches/JetBrains/PyCharm2024.1"), │ │
│ │     ("WebStorm caches", "~/Library/Caches/JetBrains/WebStorm2024.1"),│ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## The technical story

### Why the storage is a JSON file

`~/.dustpan/proposals.json` (atomic writes via tmp + rename). Plain JSON because:

- The Docker-mode Postgres backend can be added later without changing the tool's input shape or the UI
- The user can `cat` it, `jq` it, version-control it, sync it across machines
- The file format matches DustPan's general philosophy: every piece of data the app produces should be human-readable and grep-able

### Why the snippet, not auto-edit

`cleaners.py` is the **canonical, hand-curated source**. Auto-editing it from a running app would:

1. Break the git workflow (the file becomes an authoring vs. application target)
2. Introduce a class of bugs where the AI's parsing or formatting subtly diverges from human convention
3. Weaken the trust contract — the user knows that every entry in `cleaners.py` has been read by a human

The snippet approach keeps the human as the final author. The AI is doing the research and the formatting. You're doing the read-and-ship.

### Why the proposal needs `tier` per path

The agent could just say "here's a path" and let the maintainer decide the tier. But the agent is in a better position to reason about tier:

- `safe`: cache rebuilds automatically, no user data lost (e.g. compiled indexes)
- `probably_safe`: rebuilds but might cause minor friction (e.g. workspace state, recent file lists)
- `caution`: requires human review (e.g. anything that could contain user data)

Forcing the agent to pick a tier per path makes it think harder about what each path actually contains.

### Why `requires_approval: false` on this tool

This is a Tier-B tool in spirit (it modifies state) but doesn't trigger an approval card. The reasoning: saving a proposal for review is itself an act of review. The actual approval gate is the Accept button in the inbox — that's where the human decides. Adding a chat-time approval card would be redundant friction.

## Paste-ready channel copy

### Tweet (280 chars)

> DustPan v0.25 ships AI cleaner proposals.
>
> SADPA finds a cache DustPan doesn't track. Proposes it with paths, tiers, rationale, cost. You accept. Get a paste-ready Python snippet for cleaners.py.
>
> The app teaches itself. Source stays hand-curated.

### LinkedIn (3-5 paragraphs)

> Curious design problem: when a disk-cleanup app's AI agent finds a cache the app doesn't already know about, what should it do?
>
> Option A: nothing — just tell the user. ("Hey, your JetBrains caches are 3 GB.")
>
> Option B: auto-add it to the cleaners source file. Convenient, but now the AI is mutating canonical source.
>
> Option C: file a proposal for human review. The agent fills in paths, tiers, rationale, and cost-to-user. The user accepts and gets a paste-ready Python snippet they copy into cleaners.py themselves.
>
> We shipped Option C in DustPan v0.25. Storage is a flat JSON file at ~/.dustpan/proposals.json. A pending-count badge on the sidebar surfaces unreviewed proposals. Accept generates a snippet that matches the existing source style. Source stays hand-curated.
>
> The interesting part is the per-path tier classification — the agent has to pick safe / probably_safe / caution for each path, which forces it to reason about what's actually in there. "Compiled index" is safe; "workspace state" is probably_safe; "anything user-generated" is caution.
>
> Open source: https://github.com/marvelousempire/dustpan

### Engineering blog post

> **Subject:** Letting your AI agent propose features without letting it touch source
>
> Most "AI can edit your repo" demos pitch the same loop: agent suggests change, agent writes change, agent commits change. That's a coherent story when the user is okay with the agent being a developer. It's not the right story when the agent is a co-pilot for an end-user app.
>
> DustPan's case: the AI agent is talking to a user about disk space. It finds a 3 GB JetBrains cache directory. It could propose that DustPan add JetBrains as a known cache. But DustPan's cleaners.py is hand-curated — every entry has been reviewed, has curated `desc` and `cost` text, and is the trust anchor for the whole app.
>
> So we shipped a proposal-and-snippet pattern instead:
>
> 1. Agent calls `propose_new_cleaner` with structured input (name, category, paths-with-tiers, rationale, cost)
> 2. Server validates and persists to `~/.dustpan/proposals.json`
> 3. UI shows pending proposals in an inbox with [Accept] / [Dismiss]
> 4. Accept generates a paste-ready Python snippet — a comment block + tuples
> 5. User copies, pastes into cleaners.py, commits
>
> What this preserves: cleaners.py is still 100% human-authored. The agent's contribution is the **research and formatting**, not the source code itself. The diff in git is still "human wrote this" because a human did write it (by pasting after reviewing).
>
> Full repo: https://github.com/marvelousempire/dustpan

## FAQ

**Q: Can SADPA file proposals without my asking?**
A: Only during conversation. The tool isn't called on a schedule or in the background. If you don't chat with SADPA, no proposals appear.

**Q: What if the AI proposes something silly?**
A: Dismiss it. The status changes to `dismissed`; the proposal stays in the inbox under the "dismissed" filter for history. You can also reload the chat and ask it to investigate the specific path and propose again with better input.

**Q: Where do accepted proposals live?**
A: Marked `accepted` in `~/.dustpan/proposals.json`. The status is permanent — accepted means "I copied the snippet into cleaners.py." If you don't actually paste it, the proposal sits there in your local file forever. (No harm — just a record.)

**Q: Can the AI propose a cleaner that deletes my home directory?**
A: The proposal validation requires at least one path. The `tier` field defaults to `safe`, and the proposal goes into the inbox unedited — you see exactly what it suggested. **You** decide whether to paste. The proposal mechanism never modifies anything outside `~/.dustpan/`.

**Q: Can I edit a proposal before accepting?**
A: Not in v0.25. The proposal renders read-only. If you want to tweak, copy the snippet, edit the snippet, then paste your edits into cleaners.py. Inline editing is a wishlist item.

**Q: Do dismissed proposals come back?**
A: No. SADPA doesn't see the proposals file. If the same condition recurs (e.g. the cache is still there next time you ask), SADPA might propose again — but it's not aware of history. That's deliberate; we want fresh judgments per session.

## What it took to ship

**One PR** (Ship 2 of plan 0023), ~730 lines:

- `web/proposals_store.py` — NEW. ~150 lines. JSON-backed storage with atomic writes, snippet generation, status transitions.
- `web/agent_tools.py` — added the 15th tool (`propose_new_cleaner`) with strict input schema validation. ~70 lines.
- `web/server.py` — 5 new endpoints (`GET /api/ai/proposals`, `GET /api/ai/proposals/count`, `GET /api/ai/proposals/<id>/snippet`, `POST .../accept`, `POST .../dismiss`). ~70 lines.
- `apps/web/src/components/ProposalsInbox.tsx` — NEW. ~270 lines. Filter tabs, expandable cards, snippet block with Copy button.
- `apps/web/src/state/DashboardContext.tsx` — pendingProposals state + 30s polling. ~30 lines.
- `apps/web/src/components/SidebarLeft.tsx` — badge prop on SidebarFooterBtn. ~15 lines.
- `apps/web/src/components/AIAgentChat.tsx` — refresh signal on propose_new_cleaner tool result. ~10 lines.
- `apps/web/src/lib/api.ts` — Proposal type + 5 helpers. ~20 lines.

### Things we deliberately chose not to do

- **Auto-add accepted proposals to `cleaners.py`.** Hard line. Source stays hand-curated. See "The technical story" section.
- **In-app proposal editing.** Read-only for v0.25. If you want to tweak, edit the snippet after copying. Future work.
- **Email or notification on new proposal.** The sidebar badge is the entire surface area. Email feels excessive for a local-first app.
- **Per-user sharing of proposals.** Each Mac has its own inbox. No central registry, no community pool. (Would be a fun standalone project but outside DustPan scope.)
- **Postgres backend.** Docker-mode storage is JSON for v0.25. Postgres-backed `cleaner_proposals` table is a clean follow-up that doesn't change the API surface.

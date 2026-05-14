# 🔒 Unlock space locked by previous users

**Tagline:** Find disk space owned by accounts that aren't yours — Homebrew installed by `olivia`, `/Users/<oldname>/` from a previous owner, Guest account leftovers. Often 5–50 GB.

**Version:** v0.24.0
**Plan:** [0024 — foreign-ownership discovery](../../plans/) (folded into 0023 series)
**Surface:** Space Survey tab (`📊 Survey`) + Emergency Rescue tab (`🚨 Emergency Rescue`) + Chat (via `find_foreign_ownership` tool)
**Backend:** `web/server.py::_stream_survey::discover_foreign_ownership`, `web/agent_tools.py::_h_find_foreign_ownership`, `web/cleaners.py` (two new emergency actions)
**Frontend:** `apps/web/src/components/SurveyPanel.tsx::TakeoverCard`

## The problem in plain English

macOS gives every file an owner. If you weren't the first user of your Mac, big folders are silently locked behind UIDs that aren't your current login. **You can't see them. You can't delete them. You can't even know they exist** unless you specifically look.

Real cases from real Macs:

- A user buys/inherits a Mac. The previous owner ('olivia') installed Homebrew at `/opt/homebrew`. Now the new user runs `brew install something` and gets a permission error. The 12 GB of Homebrew packages is locked.
- A Mac that was set up by IT, given to a contractor, then re-assigned. `/Users/contractorname/` is still there. 30 GB of files nobody has the password to.
- Guest users left data behind in `/Users/Guest`. Sometimes large downloads or app data.

The fix is one shell command: `sudo chown -R $(whoami) <path>`. But you have to know it's possible, find the right path, and not nuke something important by mistake. Almost no tool surfaces this — CleanMyMac doesn't, Onyx doesn't, DaisyDisk doesn't. They scan as your user, so they only see what you can already see.

## How DustPan solves it

DustPan's Space Survey runs a discovery thread that specifically looks for **foreign-owned** paths:

1. **Known multi-user-cruft locations**: `/opt/homebrew`, `/opt/local`, `/usr/local/Homebrew`, `/usr/local/Cellar`. Checks the owner of each. If it's not the current user and not root, measures total size.

2. **`/Users/*` enumeration**: lists every home directory under `/Users/`, skips the current user + `Shared` + `.localized` + root-owned entries. Anything left is an old user home.

3. **UID resolution**: maps each owner UID to a username via `pwd.getpwuid()`. If the UID isn't in the password file (the account has been deleted), reports it as `uid-NNN` and flags `owner_still_exists: false`.

4. **Size measurement**: `du -sh` on each finding with a 20-second timeout.

5. **Surface generation**: each finding becomes a `SurveyTarget` with `confidence: "takeover"` and `owner / owner_uid / owner_exists / takeover_command` fields.

### What happens when DustPan finds something

The Survey panel renders a dedicated section **above** the regular ranked table:

```
🔒 Locked by previous users — 38.4 GB recoverable

  Disk space owned by user accounts that aren't yours. DustPan can't touch
  this — macOS file permissions protect it — but each one can be unlocked
  with a single Terminal command.

  1   12 GB    Homebrew at /opt/homebrew (installed by 'olivia')   owner: olivia      [▼]
  2   24 GB    Old user home: /Users/abrownsanta                   owner: abrownsanta  [▼]
                                                                         (gone)
  3   2.4 GB   Old user home: /Users/Guest                         owner: uid-201    [▼]
```

Clicking a row expands to show the exact command in a monospace block with a **[📋 Copy]** button:

```bash
sudo chown -R $(whoami) /opt/homebrew && echo '✓ /opt/homebrew is now owned by '$(whoami)
```

For old user homes, the card shows **both** options:

```bash
# WARNING: This will delete user data. Make sure you don't need it.
sudo rm -rf /Users/abrownsanta

# OR — keep the data but transfer ownership to you:
sudo chown -R $(whoami) /Users/abrownsanta
```

The card also shows:
- Recoverable size
- Cost to rebuild (for ownership transfer: "Nothing rebuilds — you keep the data, just gain access to it")
- An explicit note: *"DustPan can't run sudo commands — macOS requires you to type your password in Terminal directly."*

### The Emergency Rescue surface

Two new informational commands in the Emergency Rescue tab:

```
🔒  Find space locked by previous users   [▶ Run check]
🍺  Get the Homebrew takeover command     [▶ Run check]
```

Running either streams the same diagnostic output to the in-app terminal — same commands, different surface. The Emergency surface is for when the disk is at zero and the user is panicking; the Survey surface is for the deep-audit case.

### The AI agent tool

The `find_foreign_ownership` tool (Tier A, read-only) is registered with SADPA. Ask the agent *"Is any disk space locked by other users on this Mac?"* and it'll call the tool, get structured findings, and recommend in conversational form:

```
SADPA: Yes — I found 38.4 GB locked across 3 paths:

  1. /opt/homebrew (12 GB) — Homebrew installed by 'olivia'
     This is why `brew install` would fail for you. Transfer ownership with:
       sudo chown -R $(whoami) /opt/homebrew

  2. /Users/abrownsanta (24 GB) — old user home, account has been deleted
     You can either delete (frees the full size) or take ownership (keeps the
     data). Which would you like?

  3. /Users/Guest (2.4 GB) — guest account leftovers
     Safe to delete: sudo rm -rf /Users/Guest

DustPan can't run sudo for you — macOS requires the password prompt in
Terminal directly. Want me to break down what's in any of these before you
decide?
```

The agent can drill in further with `list_directory` calls (within the sandbox) to help you decide.

## The boundary: DustPan never runs `sudo`

This is the most important design decision. **Ownership transfer is permanent**. Once you `chown -R`, the original user can't reach those files anymore. `rm -rf` on a home directory is irreversible. macOS' sudo password prompt is the correct consent gate for these operations — and routing them through DustPan would weaken that.

So DustPan:
- ✅ Discovers foreign-owned paths
- ✅ Measures their sizes
- ✅ Maps UIDs to usernames (flagging orphan accounts)
- ✅ Generates the exact recovery command
- ✅ Puts the command in a monospace block with a Copy button
- ✅ Explains what the command will do
- ❌ Never runs the command itself

You copy. You paste into Terminal. macOS prompts for *your* Mac password — not DustPan's. You're the one authorizing the change.

## What it looks like — full TakeoverCard mockup

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🔒 Locked by previous users — 38.4 GB recoverable                       │
│                                                                          │
│ Disk space owned by user accounts that aren't yours. DustPan can't       │
│ touch this — macOS file permissions protect it — but each one can be     │
│ unlocked with a single Terminal command.                                  │
│                                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 1     12 GB   Homebrew at /opt/homebrew (installed by 'olivia')     │ │
│ │              /opt/homebrew                            owner: olivia │ │
│ │                                                            [▲]      │ │
│ │ ─────────────────────────────────────────────────────────────────── │ │
│ │ This directory (12.0 GB) is owned by user 'olivia'. DustPan and     │ │
│ │ Homebrew can't manage it under your current account until ownership │ │
│ │ is transferred to you.                                              │ │
│ │                                                                      │ │
│ │ **To unlock:** open Terminal and run the command below. You'll be   │ │
│ │ prompted for your Mac password — this is the macOS sudo prompt,     │ │
│ │ not anything DustPan can do silently.                               │ │
│ │                                                                      │ │
│ │ ┌─ Run this in Terminal ────────────────────────  [📋 Copy] ────┐  │ │
│ │ │ sudo chown -R $(whoami) /opt/homebrew &&                       │  │ │
│ │ │ echo '✓ /opt/homebrew is now owned by '$(whoami)              │  │ │
│ │ └────────────────────────────────────────────────────────────────┘  │ │
│ │                                                                      │ │
│ │ ┌─ Recoverable ───┐  ┌─ Cost ────────────────────────────────────┐ │ │
│ │ │   12.0 GB        │  │ Nothing rebuilds — you keep the data,     │ │ │
│ │ └──────────────────┘  │ just gain access to it                   │ │ │
│ │                       └────────────────────────────────────────┘   │ │
│ │                                                                      │ │
│ │ ⓘ DustPan can't run sudo commands — macOS requires you to type     │ │
│ │ your password in Terminal directly. Copy the command, paste into    │ │
│ │ Terminal, and macOS will prompt you for your Mac password.          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## The technical story

`discover_foreign_ownership()` runs as a daemon thread inside `_stream_survey` alongside the worktree, build-artifact, and node_modules discoverers. It's bounded by per-`du` timeouts (15–20 seconds) and the overall 60-second survey deadline.

The owner-resolution logic handles three cases:

1. **Owner exists as a named user**: `pwd.getpwuid(uid).pw_name` returns a real username (`olivia`, `abrownsanta`).
2. **Owner exists but is the current user**: skipped (not a takeover target).
3. **Owner is root (UID 0)**: skipped (system directories — different fix entirely).
4. **UID doesn't resolve to a user**: returned as `uid-NNN` with `owner_exists: false` — flagged in the UI as "(gone)" because the account has been deleted but their files survived.

For `/Users/` enumeration, the code is careful to:
- Skip the current user
- Skip `Shared` (root-owned, normal macOS folder)
- Skip `.localized` (a placeholder file)
- Skip dotfiles
- Skip non-directories
- Skip root-owned entries (those are macOS folders, not user homes)

The Survey panel filters takeover targets out of the regular ranked table — they get their own dedicated section above. This is deliberate: they're a different class of recovery (requires sudo, requires user thought), not just "more big stuff to clean."

## Paste-ready channel copy

### Tweet (280 chars)

> macOS quietly locks disk space behind previous users' accounts.
>
> Bought a used Mac? Homebrew might still be owned by the old owner. /Users/<theirname> might still be 30 GB on your disk. Standard cleaners can't see any of it.
>
> DustPan v0.24 finds it and shows the unlock command.

### LinkedIn (3-5 paragraphs)

> If you've ever bought a used Mac, inherited one from a previous employee, or shared one between accounts, there's a chance you have **5–50 GB of disk space locked behind macOS file ownership** that you can't see or recover with standard tools.
>
> Real case from my own Mac this week: /opt/homebrew was owned by 'olivia' — a previous owner. Every `brew install` was failing. CleanMyMac doesn't surface this. Onyx doesn't. DaisyDisk doesn't. They all scan as your user, so they only see what you can already see.
>
> DustPan v0.24 ships a discovery scan that specifically looks for foreign-owned paths: /opt/homebrew, /usr/local/Homebrew, /opt/local, and every /Users/<oldname>/ home directory still on disk. Maps UIDs to usernames so you know who owned what (and flags deleted accounts as "gone").
>
> The unlock is one shell command — `sudo chown -R $(whoami) /opt/homebrew` — but DustPan never runs sudo for you. The app shows you the exact command in a monospace block with a Copy button. macOS prompts for your password in Terminal directly. That boundary matters: ownership transfer is permanent, the password prompt is the consent gate, and routing it through a third-party app would weaken that.
>
> Open source, MIT, no telemetry. https://github.com/marvelousempire/dustpan

### Reddit r/MacOS

**Title:** PSA — if you bought or inherited a Mac, you might have 30+ GB of disk space locked by the previous owner

**Body:**

> I've been working on a disk-recovery app called DustPan. v0.24 specifically targets this: **foreign-owned files**.
>
> macOS gives every file an owner. If a previous user installed Homebrew, /opt/homebrew is owned by their account. Now `brew` doesn't work under your account, and 12 GB is invisible to standard cleaners because they scan as your user.
>
> Same for /Users/<oldperson>/ — if a previous employee's home directory was left on the machine, it's still there using disk space you can't reach.
>
> DustPan finds these by checking specific known multi-user-cruft locations and enumerating /Users/* for non-current-user-owned dirs. It then shows you the unlock command:
>
>     sudo chown -R $(whoami) /opt/homebrew
>
> The app never runs sudo for you — you copy the command, paste it into Terminal, and macOS prompts for your password directly. That's the right consent gate for a permanent operation.
>
> Free, open source, MIT, no telemetry: https://github.com/marvelousempire/dustpan
>
> Just run the Space Survey and look for the "🔒 Locked by previous users" section. If you have any, the size will surprise you.

### Show HN comment thread starter

> One of the more interesting things shipping in DustPan v0.24 (the macOS disk recovery tool) is a scanner for **disk space locked by previous user accounts**.
>
> The pattern: someone installs Homebrew, the Mac changes hands, and now /opt/homebrew is owned by a UID that doesn't match the new user. Every `brew install` fails. CleanMyMac et al don't surface this because they scan as the current user — they only see what's already visible.
>
> Detection is simple in retrospect:
> 1. Walk known locations (/opt/homebrew, /opt/local, /usr/local/Homebrew, /Users/*).
> 2. For each entry, stat the owner UID.
> 3. If UID != current and UID != 0 (root), measure size with `du -sh`.
> 4. Resolve UIDs via `pwd.getpwuid()`. UIDs that don't resolve are flagged as "deleted account, files orphaned."
>
> The interesting design question was whether to run the takeover command from the app. We decided no: ownership transfer is permanent, macOS's sudo password prompt is the correct consent gate, and DustPan's value-add is finding the thing — not bypassing the permission boundary. So the app shows the exact command in a monospace block with a Copy button, and the user pastes into Terminal.
>
> Repo: https://github.com/marvelousempire/dustpan

## FAQ

**Q: Why doesn't DustPan just run the sudo command for me?**
A: Two reasons. First, ownership transfer is permanent and irreversible — the macOS password prompt is the correct consent gate for that. Second, routing sudo through a third-party app weakens the security model. DustPan never asks for your Mac password; that prompt should always be the OS asking, not us.

**Q: Is `sudo chown -R $(whoami) /opt/homebrew` actually safe?**
A: Yes — it just changes ownership. The files are unchanged. After running it, you own /opt/homebrew and brew works under your account. There's no data loss. The official Homebrew docs even recommend this approach when ownership gets messed up.

**Q: What about /Users/<oldname>/ — should I delete or chown?**
A: Depends. If the old user is gone and you don't need their files, `sudo rm -rf` frees the full size immediately. If you might want to look through their files first (they might have left behind code or documents you want), `sudo chown -R $(whoami)` makes the directory yours so you can browse it. DustPan shows both commands so you can pick.

**Q: Can old user homes contain anything dangerous?**
A: Could contain dotfiles that load on shell startup if you `cd` into them and source them. Don't blindly source random `.bashrc` files. The files themselves are inert until you execute them.

**Q: Does this work for Linux paths too?**
A: Currently macOS-only. The logic (`pwd.getpwuid`, `stat -f`, `find -not -user`) would translate trivially but the candidate roots (`/Users/`, `/opt/homebrew`) are Mac-specific. Linux support is a wishlist item.

**Q: My disk is fine. Why scan for this?**
A: If your disk is fine you don't need to. Run the Survey when you have a disk-pressure problem and DustPan's standard categories don't seem to add up to the missing space — the locked-space scan often explains the gap.

**Q: What if I'm the only user my Mac has ever had?**
A: Then the scan finds nothing — `/opt/homebrew` is owned by you, `/Users/` has only your home + Shared + maybe Guest. The section just doesn't appear in the Survey results.

## What it took to ship

**One PR**, ~515 lines:

- `web/server.py` — `discover_foreign_ownership()` added as a 4th thread inside `_stream_survey` (~130 lines)
- `web/agent_tools.py` — `find_foreign_ownership` tool added (~80 lines)
- `web/cleaners.py` — two new informational actions for the Emergency Rescue tab: `emergency-find-foreign-owned` and `emergency-takeover-homebrew` (~100 lines)
- `apps/web/src/components/SurveyPanel.tsx` — new `confidence: "takeover"` tier in the type system, new `TakeoverCard` component, prominent section above the regular table (~150 lines)
- `apps/web/src/components/EmergencyPanel.tsx` — two new read-only command cards added to the existing emergency commands list
- Tests + Python integration verification

### Things we deliberately chose not to do

- **Run sudo from the app**: see "The boundary" section above. Hard line.
- **Auto-suggest deletion vs chown for old user homes**: shows both, lets the user decide. The right answer depends on whether you need the data, and the app doesn't know.
- **Read inside other users' home directories**: even with sudo, we don't preview file contents. Privacy boundary.
- **Surface root-owned macOS dirs**: `/Users/Shared`, `/private/`, etc. are normal macOS infrastructure, not takeover targets. The discoverer skips UID 0 entries.
- **Cross-volume scanning**: only scans the root volume's `/Users/` and `/opt/`. External drives are out of scope.

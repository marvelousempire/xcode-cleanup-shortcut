# Apple Shortcuts integration — paste-ready blocks

Tested against **Shortcuts 12.4 / macOS 26 (Tahoe)**.

This page gives you exact, copy-paste-ready code for the two Shortcuts actions you're most likely to wire up:

- **Run Shell Script** — local cleanup, from any Shortcut invocation
- **Run Script Over SSH** — clean up a remote Mac (build server, second machine) over SSH

Plus the **Run AppleScript** variant if you want the menu-bar progress bar + notifications.

---

## Run Shell Script (local Mac)

**Action settings:**

| Field | Value |
|---|---|
| Shell | **`zsh`** |
| Pass Input | **as arguments** *(or `to stdin` if you want to feed a path/pattern in)* |
| Input | *(leave the variable empty unless you want to pipe a pattern in)* |
| Run as Administrator | **off** *(the cleanup runs in your user dirs only — never use sudo)* |

Pick one of the following blocks for the **Script** field.

### Block 1A — Self-updating (uses GitHub raw, always latest)

The cleanest option if you don't want to clone the repo. Always pulls the current release from GitHub:

```sh
bash <(curl -fsSL https://raw.githubusercontent.com/marvelousempire/xcode-cleanup-shortcut/main/scripts/remote-cleanup.sh)
```

Add `--dry-run` or `--force` after the closing `)` to control behavior:

```sh
bash <(curl -fsSL https://raw.githubusercontent.com/marvelousempire/xcode-cleanup-shortcut/main/scripts/remote-cleanup.sh) --dry-run
```

### Block 1B — Pinned to your local clone (no network)

If you have the repo at `~/Developer/xcode-cleanup-shortcut/`:

```sh
bash $HOME/Developer/xcode-cleanup-shortcut/scripts/remote-cleanup.sh
```

### Block 1C — Use the `xcc` CLI (if installed via `make install-cli`)

```sh
# Shortcuts doesn't inherit your shell's PATH, so use the absolute path:
$HOME/.local/bin/xcc --dry-run
```

Drop `--dry-run` to actually clean.

### Block 1D — Fully inline (no repo dependency, no curl)

For a shortcut that should work even on a fresh machine with no Internet:

```sh
set -u
DRY=${DRY_RUN:-0}
free_kb=$(df -k / | awk 'NR==2 {print $4}')
free_gb=$((free_kb / 1024 / 1024))
host=$(hostname -s)

if [ "$DRY" != "1" ] && [ "$free_gb" -gt 50 ]; then
  echo "[$host] OK · ${free_gb} GB free · no cleanup needed"
  exit 0
fi

for p in \
  "$HOME/Library/Developer/Xcode/DerivedData" \
  "$HOME/Library/Developer/Xcode/iOS DeviceSupport" \
  "$HOME/Library/Developer/Xcode/watchOS DeviceSupport" \
  "$HOME/Library/Developer/Xcode/tvOS DeviceSupport" \
  "$HOME/Library/Caches/com.apple.dt.Xcode" \
  "$HOME/Library/Caches/org.swift.swiftpm" \
  "$HOME/Library/Developer/CoreSimulator/Caches"; do
  if [ "$DRY" = "1" ]; then
    size=$(du -sh "$p" 2>/dev/null | awk '{print $1}')
    [ -n "$size" ] && echo "  $size  $p"
  else
    rm -rf "$p"/* 2>/dev/null || true
  fi
done

if [ "$DRY" != "1" ]; then
  xcrun simctl delete unavailable >/dev/null 2>&1 || true
  after_kb=$(df -k / | awk 'NR==2 {print $4}')
  freed_gb=$(awk "BEGIN { printf \"%.1f\", ($after_kb - $free_kb) / 1024 / 1024 }")
  echo "[$host] Freed ${freed_gb} GB"
fi
```

---

## Run AppleScript (best for menu-bar progress + notifications)

If you want the full Shortcut UX — menu-bar progress bar with phases, native confirmation alert, "Freed X GB" banner — use a **Run AppleScript** action instead and paste the entire contents of [`xcode-cleanup.applescript`](../xcode-cleanup.applescript). The version is on `main`; right-click the file on GitHub → "Raw" → ⌘A → ⌘C.

**Action settings:**

| Field | Value |
|---|---|
| Pass Input | (don't pass input) |
| Script | *paste the full `xcode-cleanup.applescript`* |

First run will prompt for Automation permission — approve.

---

## Run Script Over SSH (remote Mac)

The Run Script Over SSH action runs a shell script on another Mac you can reach via SSH. The remote machine has **no GUI session attached**, so you must use a pure shell script — `osascript`, `display alert`, `display notification` all silently no-op over SSH.

### Setup (one-time per remote)

1. **Verify SSH access** — `ssh user@remote.local` from your Mac works without errors.
2. **Add this Shortcut action**: search "Run Script Over SSH" in the action library.
3. **Fill the connection fields:**

| Field | Value |
|---|---|
| Host | `mac-mini.local` *(or IP like `192.168.1.50`)* |
| Port | `22` |
| User | *your username on the remote Mac* |
| Authentication | **SSH Key** *(recommended — see below)* or **Password** |
| Input | *(leave empty)* |
| Shell | **`zsh`** *(or `bash` — both work)* |

4. **If you picked SSH Key:**
   - Tap the **Authentication** field. Shortcuts auto-generates an Ed25519 keypair on first use.
   - Tap **Copy Public Key**.
   - On the remote Mac, append it to `~/.ssh/authorized_keys`:
     ```sh
     # On your Mac, after copying the key:
     pbpaste | ssh user@remote.local 'cat >> ~/.ssh/authorized_keys'
     ```
   - Run the Shortcut once to verify authentication works without a password prompt.

5. **Host key verification:** since iOS/macOS 13, Shortcuts verifies host keys. The first connection prompts you to confirm the fingerprint — accept it; subsequent connections will fail if the remote's host key changes (good).

### Block 2A — Self-updating one-liner (recommended)

Paste this into the **Script** field:

```sh
bash <(curl -fsSL https://raw.githubusercontent.com/marvelousempire/xcode-cleanup-shortcut/main/scripts/remote-cleanup.sh)
```

For dry-run mode on the remote:

```sh
bash <(curl -fsSL https://raw.githubusercontent.com/marvelousempire/xcode-cleanup-shortcut/main/scripts/remote-cleanup.sh) --dry-run
```

Output (captured by the Shortcut and available as the action's result):

```
[mac-mini] Cleaning · current: 12 GB free
  [clean]   DerivedData + DeviceSupport    18.3 GB … done
  [clean]   SwiftPM caches                 421 MB … done
  [clean]   Simulator caches               0 KB … done
  [clean]   Unavailable simulators … done
[mac-mini] Freed 18.7 GB · 31 GB free
```

### Block 2B — Inline fallback (no curl / no Internet on remote)

If the remote Mac has no Internet or you don't trust pulling code at runtime, paste the full `remote-cleanup.sh` body directly. Get the current source from:

https://github.com/marvelousempire/xcode-cleanup-shortcut/blob/main/scripts/remote-cleanup.sh

Click **Raw**, select all, paste into the Script field. Update by re-pasting whenever you bump a version.

### Block 2C — One-liner direct rm (minimal)

For a build-agent quick-clean with no logging or threshold gate:

```sh
rm -rf ~/Library/Developer/Xcode/DerivedData/* \
       ~/Library/Developer/Xcode/iOS\ DeviceSupport/* \
       ~/Library/Developer/Xcode/watchOS\ DeviceSupport/* \
       ~/Library/Developer/Xcode/tvOS\ DeviceSupport/* \
       ~/Library/Caches/com.apple.dt.Xcode/* \
       ~/Library/Caches/org.swift.swiftpm/* \
       ~/Library/Developer/CoreSimulator/Caches/* 2>/dev/null
xcrun simctl delete unavailable 2>/dev/null
df -h / | awk 'NR==2 {print "[" ENVIRON["HOST"] "] " $4 " free"}'
```

---

## Gotchas worth knowing

| Issue | Why | Fix |
|---|---|---|
| `command not found: xcc` (or any tool) in a Shell Script action | Shortcuts doesn't read your shell's `~/.zshrc` — no PATH inherited | Use the absolute path: `$HOME/.local/bin/xcc`, `/usr/local/bin/...`, etc. |
| "Operation not permitted" on `rm` from a Shell Script | Shortcuts.app needs Full Disk Access for some Xcode paths | System Settings → Privacy & Security → Full Disk Access → enable **Shortcuts** |
| `osascript` notifications don't fire | Script Editor / osascript lacks Notification permission | System Settings → Notifications → Script Editor → enable banners |
| SSH action fails with "host key changed" | Remote's SSH host key was rotated (or you're connecting to a different host on same name) | Re-add the action and accept the new fingerprint on first run |
| Output truncated in the Shortcuts UI | Shortcuts caps action output at ~10K chars | Pipe to a file: append `> ~/Desktop/cleanup.log 2>&1` |

---

## Suggested Shortcut compositions

These are entire Shortcut workflows worth building, not just single actions.

### "Clean all my Macs"

A single Shortcut that runs cleanup on a list of remote Macs in sequence:

1. **Text** action with `mac-mini.local,mac-studio.local,build-agent.local`
2. **Split Text** by `,`
3. **Repeat with Each** loop
   - inside: **Run Script Over SSH** with **Host** = `Repeat Item`, Block 2A as the script
4. **Show Notification** with the combined output

### "Babysit the build server"

Personal automation that fires every 4 hours and runs cleanup remotely:

1. **Personal Automation → Time of Day → every 4 hours**
2. **Run Script Over SSH** to your build agent, Block 2A with `--dry-run` removed
3. If freed-GB > 5, **Show Notification** "Build server cleanup freed X GB"

### "Pre-flight before TestFlight upload"

Before a heavy Xcode operation, clear the decks:

1. **Run Shell Script** with Block 1B (your local repo)
2. **Show Result** — confirms how much was freed
3. **Open App** → Xcode

---

## When you outgrow Shortcuts

If you find yourself wanting more than these actions can give you:

- **Live menu-bar disk indicator** → install the SwiftBar plugin: `make install-swiftbar`
- **Hands-free hourly cleanup** → install the launchd agent: `make install-launchd`
- **Terminal-first workflow** → `make install-cli` and use `xcc` directly

All three coexist peacefully with any Shortcut you build above.

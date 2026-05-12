"""All cleanup categories, paths, and actions for the web UI dashboard.

Structure:
    CATEGORIES = {
        "<category-id>": {
            "label":  "Display name",
            "icon":   "emoji or SVG ref",
            "groups": { "safe": [...], "probably_safe": [...], "caution": [...] },
            "actions": {
                "<action-id>": {
                    "label": str, "desc": str, "cost": str,
                    "shell": str OR "cmd": [str], "sudo": bool,
                },
                ...
            },
        },
        ...
    }

Path entries are tuples: (display_label, expand-to-path).

Cost annotations are written for users — "what you lose when you click this."
"""

CATEGORIES = {

    # ─── Xcode ─────────────────────────────────────────────────────────
    "xcode": {
        "label": "Xcode",
        "icon":  "🛠",
        "tagline": "Reclaim 10–25 GB Xcode is hoarding.",
        "groups": {
            "safe": [
                ("DerivedData",              "~/Library/Developer/Xcode/DerivedData"),
                ("iOS DeviceSupport",        "~/Library/Developer/Xcode/iOS DeviceSupport"),
                ("watchOS DeviceSupport",    "~/Library/Developer/Xcode/watchOS DeviceSupport"),
                ("tvOS DeviceSupport",       "~/Library/Developer/Xcode/tvOS DeviceSupport"),
                ("visionOS DeviceSupport",   "~/Library/Developer/Xcode/visionOS DeviceSupport"),
                ("Xcode caches",             "~/Library/Caches/com.apple.dt.Xcode"),
                ("SwiftPM cache",            "~/Library/Caches/org.swift.swiftpm"),
                ("Simulator caches",         "~/Library/Developer/CoreSimulator/Caches"),
                ("CoreSimulator Cryptex",    "~/Library/Developer/CoreSimulator/Cryptex"),
                ("iOS Device Logs",          "~/Library/Developer/Xcode/iOS Device Logs"),
                ("Xcode Snapshots",          "~/Library/Developer/Xcode/Snapshots"),
                ("Interface Builder caches", "~/Library/Developer/Xcode/UserData/IB Support"),
                ("Xcode Products",           "~/Library/Developer/Xcode/Products"),
            ],
            "probably_safe": [
                ("Simulator app data (all devices)",  "~/Library/Developer/CoreSimulator/Devices"),
                ("Instruments traces",                "~/Library/Application Support/Instruments"),
                ("CocoaPods cache",                   "~/Library/Caches/CocoaPods"),
                ("CocoaPods specs",                   "~/.cocoapods/repos"),
            ],
            "caution": [
                ("iOS device backups (Finder/iTunes)",            "~/Library/Application Support/MobileSync/Backup"),
                ("Xcode Archives (NEEDED for symbolication)",     "~/Library/Developer/Xcode/Archives"),
                ("Provisioning Profiles",                          "~/Library/MobileDevice/Provisioning Profiles"),
            ],
        },
        "actions": {
            "clean-safe": {
                "label": "Clean all safe Xcode caches",
                "desc":  "Wipes DerivedData + DeviceSupport + SwiftPM cache + simulator caches + Xcode extras.",
                "cost":  "First build after cleanup takes ~30s longer (caches regenerate). Device debug symbols re-download when a device reconnects. Nothing project-affecting.",
                "shell": "rm -rf ~/Library/Developer/Xcode/DerivedData/* "
                         "~/Library/Developer/Xcode/iOS\\ DeviceSupport/* "
                         "~/Library/Developer/Xcode/watchOS\\ DeviceSupport/* "
                         "~/Library/Developer/Xcode/tvOS\\ DeviceSupport/* "
                         "~/Library/Developer/Xcode/visionOS\\ DeviceSupport/* "
                         "~/Library/Caches/com.apple.dt.Xcode/* "
                         "~/Library/Caches/org.swift.swiftpm/* "
                         "~/Library/Developer/CoreSimulator/Caches/* "
                         "~/Library/Developer/Xcode/Snapshots/* "
                         "~/Library/Developer/Xcode/UserData/IB\\ Support/* "
                         "~/Library/Developer/Xcode/iOS\\ Device\\ Logs/* "
                         "~/Library/Developer/Xcode/Products/* 2>/dev/null; "
                         "xcrun simctl delete unavailable 2>/dev/null; true",
            },
            "erase-simulators": {
                "label": "Erase all simulator app data",
                "desc":  "Runs `xcrun simctl erase all` — keeps simulator devices, wipes installed apps + their data.",
                "cost":  "Simulator apps you've installed for testing are gone (re-installable from your projects). Saved app state in simulators is lost. Simulator device definitions and runtimes stay.",
                "cmd":   ["xcrun", "simctl", "erase", "all"],
            },
            "clear-instruments": {
                "label": "Clear Instruments traces",
                "desc":  "Removes all saved .trace files.",
                "cost":  "Past Instruments profiling sessions are gone. Future profiling unaffected.",
                "shell": "rm -rf ~/Library/Application\\ Support/Instruments/* 2>/dev/null; true",
            },
            "clear-cocoapods": {
                "label": "Clear CocoaPods caches",
                "desc":  "Removes ~/Library/Caches/CocoaPods + ~/.cocoapods/repos.",
                "cost":  "Next `pod install` re-fetches pod specs (slower over flaky internet, otherwise minimal).",
                "shell": "rm -rf ~/Library/Caches/CocoaPods/* ~/.cocoapods/repos/* 2>/dev/null; true",
            },
        },
    },

    # ─── LLM tools (sub-tabs) ──────────────────────────────────────────
    "llms-claude": {
        "label": "Claude",
        "parent": "llms",
        "icon":   "🤖",
        "tagline": "Claude Code + Claude Desktop caches.",
        "groups": {
            "safe": [
                ("Claude Desktop updater cache",      "~/Library/Caches/com.anthropic.claudefordesktop.ShipIt"),
                ("Claude Desktop cache",              "~/Library/Caches/com.anthropic.claudefordesktop"),
                ("Claude Desktop logs",               "~/Library/Logs/Claude"),
                ("Claude Code plugin cache",          "~/.claude/plugins/cache"),
            ],
            "probably_safe": [
                ("Claude Code session transcripts",   "~/.claude/projects"),
                ("Claude Desktop app state",          "~/Library/Application Support/Claude"),
            ],
            "caution": [
                ("Claude Code config + settings",     "~/.claude/settings.json"),
                ("Claude Code installed skills",      "~/.claude/skills"),
            ],
        },
        "actions": {
            "clear-shipit": {
                "label": "Clear Claude Desktop updater cache",
                "desc":  "Removes ~/Library/Caches/com.anthropic.claudefordesktop.ShipIt (often 500MB+).",
                "cost":  "Next Claude Desktop update re-downloads (typical ~200MB). Nothing else affected.",
                "shell": "rm -rf ~/Library/Caches/com.anthropic.claudefordesktop.ShipIt/* 2>/dev/null; true",
            },
            "clear-claude-cache": {
                "label": "Clear all Claude caches + logs",
                "desc":  "Removes Claude Desktop cache, ShipIt cache, logs, and Claude Code plugin cache.",
                "cost":  "Logs gone (rarely useful). Plugins re-cache on next use. Updater re-downloads next update.",
                "shell": "rm -rf ~/Library/Caches/com.anthropic.claudefordesktop.ShipIt/* "
                         "~/Library/Caches/com.anthropic.claudefordesktop/* "
                         "~/Library/Logs/Claude/* "
                         "~/.claude/plugins/cache/* 2>/dev/null; true",
            },
            "clear-claude-sessions": {
                "label": "Clear Claude Code session transcripts",
                "desc":  "Removes ~/.claude/projects (per-project session histories).",
                "cost":  "You lose conversation history with Claude Code. Settings, skills, and plugins are preserved.",
                "shell": "rm -rf ~/.claude/projects/* 2>/dev/null; true",
            },
            "reset-claude-desktop": {
                "label": "Reset Claude Desktop (sign out + clear local cache)",
                "desc":  "Removes ~/Library/Application Support/Claude — Claude Desktop's local app state, can be 5–15 GB.",
                "cost":  "Hard reset: you sign out of Claude Desktop and re-sign-in (cloud conversation history re-syncs). Local-only drafts, unsaved project files, and any MCP-server state stored there are LOST. Only run this if you're OK with that trade.",
                "shell": "rm -rf ~/Library/Application\ Support/Claude/* 2>/dev/null; true",
            },
        },
    },

    "llms-cursor": {
        "label": "Cursor",
        "parent": "llms",
        "icon":   "✏️",
        "tagline": "Cursor IDE caches.",
        "groups": {
            "safe": [
                ("Cursor Code Cache",              "~/Library/Application Support/Cursor/Code Cache"),
                ("Cursor GPU Cache",               "~/Library/Application Support/Cursor/GPUCache"),
                ("Cursor CachedData",              "~/Library/Application Support/Cursor/CachedData"),
                ("Cursor CachedExtensions",        "~/Library/Application Support/Cursor/CachedExtensions"),
                ("Cursor CachedExtensionVSIXs",    "~/Library/Application Support/Cursor/CachedExtensionVSIXs"),
                ("Cursor Cache",                   "~/Library/Application Support/Cursor/Cache"),
                ("Cursor logs",                    "~/Library/Application Support/Cursor/logs"),
                ("Cursor crash reports",           "~/Library/Application Support/Cursor/Crashpad"),
            ],
            "probably_safe": [
                ("Cursor remote (cursor-server)",  "~/.cursor-server"),
                ("Cursor workspace state",         "~/Library/Application Support/Cursor/User/workspaceStorage"),
            ],
            "caution": [
                ("Cursor user settings",           "~/Library/Application Support/Cursor/User/settings.json"),
                ("Cursor keybindings",             "~/Library/Application Support/Cursor/User/keybindings.json"),
                ("Cursor snippets",                "~/Library/Application Support/Cursor/User/snippets"),
            ],
        },
        "actions": {
            "clear-cursor-caches": {
                "label": "Clear Cursor caches",
                "desc":  "Removes Cursor's Code Cache, GPUCache, CachedData, CachedExtensions, and logs.",
                "cost":  "Cursor takes ~10s longer on next launch (caches rebuild). Extensions stay installed; their cached metadata is rebuilt. No code/settings/projects affected.",
                "shell": "rm -rf ~/Library/Application\\ Support/Cursor/Code\\ Cache/* "
                         "~/Library/Application\\ Support/Cursor/GPUCache/* "
                         "~/Library/Application\\ Support/Cursor/CachedData/* "
                         "~/Library/Application\\ Support/Cursor/CachedExtensions/* "
                         "~/Library/Application\\ Support/Cursor/CachedExtensionVSIXs/* "
                         "~/Library/Application\\ Support/Cursor/Cache/* "
                         "~/Library/Application\\ Support/Cursor/logs/* 2>/dev/null; true",
            },
            "clear-cursor-workspace-state": {
                "label": "Clear workspace state",
                "desc":  "Removes per-workspace history (open files, search history, undo stack, etc.).",
                "cost":  "Workspace state (open tabs, recent files, search history) resets to fresh on next open. Your files and settings are untouched.",
                "shell": "rm -rf ~/Library/Application\\ Support/Cursor/User/workspaceStorage/* 2>/dev/null; true",
            },
        },
    },

    "llms-chatgpt": {
        "label": "ChatGPT",
        "parent": "llms",
        "icon":   "💬",
        "tagline": "ChatGPT desktop app caches.",
        "groups": {
            "safe": [
                ("ChatGPT cache",        "~/Library/Caches/com.openai.chat"),
                ("ChatGPT logs",         "~/Library/Logs/com.openai.chat"),
            ],
            "probably_safe": [
                ("ChatGPT app state",    "~/Library/Application Support/com.openai.chat"),
            ],
            "caution": [],
        },
        "actions": {
            "clear-chatgpt-cache": {
                "label": "Clear ChatGPT caches + logs",
                "desc":  "Removes the desktop app's cache and logs.",
                "cost":  "ChatGPT desktop loads slightly slower on next launch (re-caches assets). You stay signed in. Conversation history is preserved (lives in OpenAI's cloud, not local).",
                "shell": "rm -rf ~/Library/Caches/com.openai.chat/* ~/Library/Logs/com.openai.chat/* 2>/dev/null; true",
            },
        },
    },

    # ─── Apps (browsers, communicators, downloads) ────────────────────
    "apps": {
        "label": "Apps",
        "icon":  "🧹",
        "tagline": "Browser caches, chat-app caches, old installers.",
        "groups": {
            "safe": [
                ("Chrome cache",                          "~/Library/Caches/Google/Chrome"),
                ("Safari cache",                          "~/Library/Caches/com.apple.Safari"),
                ("Firefox cache",                         "~/Library/Caches/Firefox"),
                ("Brave cache",                           "~/Library/Caches/BraveSoftware"),
                ("Arc cache",                             "~/Library/Caches/Arc"),
                ("Slack service-worker cache",            "~/Library/Application Support/Slack/Service Worker"),
                ("Discord cache",                         "~/Library/Application Support/discord/Cache"),
                ("Spotify cache",                         "~/Library/Caches/com.spotify.client"),
                ("Zoom cache",                            "~/Library/Caches/us.zoom.xos"),
                ("Microsoft Teams cache",                 "~/Library/Caches/com.microsoft.teams"),
                ("Homebrew downloads",                    "~/Library/Caches/Homebrew/downloads"),
            ],
            "probably_safe": [
                ("~/Downloads/*.dmg installer images",    "~/Downloads"),
                ("Trash",                                 "~/.Trash"),
                ("All ~/Library/Caches/*",                "~/Library/Caches"),
            ],
            "caution": [
                ("Mail downloads",                        "~/Library/Containers/com.apple.mail/Data/Library/Mail Downloads"),
            ],
        },
        "actions": {
            "clear-browser-caches": {
                "label": "Clear browser caches",
                "desc":  "Clears Chrome, Safari, Firefox, Brave, Arc caches.",
                "cost":  "Each browser reloads pages from origin on next visit (slightly slower first-load per site). Bookmarks, history, passwords, cookies are NOT affected.",
                "shell": "rm -rf ~/Library/Caches/Google/Chrome/*/Cache/* "
                         "~/Library/Caches/Google/Chrome/*/Code\\ Cache/* "
                         "~/Library/Caches/com.apple.Safari/* "
                         "~/Library/Caches/Firefox/* "
                         "~/Library/Caches/BraveSoftware/*/Cache/* "
                         "~/Library/Caches/Arc/* 2>/dev/null; true",
            },
            "clear-chat-caches": {
                "label": "Clear chat-app caches",
                "desc":  "Clears Slack, Discord, Zoom, Teams caches.",
                "cost":  "Slack/Discord re-download recent message media on next launch. You stay signed in. No conversation history lost.",
                "shell": "rm -rf ~/Library/Application\\ Support/Slack/Service\\ Worker/* "
                         "~/Library/Application\\ Support/discord/Cache/* "
                         "~/Library/Caches/com.spotify.client/* "
                         "~/Library/Caches/us.zoom.xos/* "
                         "~/Library/Caches/com.microsoft.teams/* 2>/dev/null; true",
            },
            "clear-old-installers": {
                "label": "Clear *.dmg installers in ~/Downloads",
                "desc":  "Removes ~/Downloads/*.dmg and *.pkg files (often 100MB–5GB each).",
                "cost":  "You'll need to re-download installers from the apps' websites if you want to reinstall. Apps already installed stay installed.",
                "shell": "rm -f ~/Downloads/*.dmg ~/Downloads/*.pkg 2>/dev/null; true",
            },
            "empty-trash": {
                "label": "Empty Trash",
                "desc":  "Permanently removes everything in ~/.Trash.",
                "cost":  "Files in Trash are gone forever. Anything outside Trash is untouched.",
                "shell": "rm -rf ~/.Trash/* ~/.Trash/.[!.]* 2>/dev/null; true",
            },
            "clear-homebrew": {
                "label": "Clear Homebrew downloads",
                "desc":  "Runs `brew cleanup -s` — removes old formula downloads + clears cache.",
                "cost":  "Re-downloads needed on next `brew install` of a formula whose download was pruned (usually fast). Installed brews stay installed.",
                "shell": "command -v brew >/dev/null && brew cleanup -s 2>&1 || echo 'Homebrew not installed — skipping'",
            },
        },
    },

    # ─── System (macOS-level junk) ─────────────────────────────────────
    "system": {
        "label": "System",
        "icon":  "💾",
        "tagline": "macOS system-level junk: installers, indexes, snapshots.",
        "groups": {
            "safe": [
                ("Icon cache",                          "~/Library/Caches/com.apple.iconservices"),
                ("Spotlight parser cache",              "~/Library/Caches/com.apple.parsecd"),
                ("Help system cache",                   "~/Library/Caches/com.apple.helpd"),
                ("CloudKit cache",                      "~/Library/Caches/CloudKit"),
                ("iCloud Drive (bird) cache",           "~/Library/Caches/com.apple.bird"),
                ("CoreFollowUp",                        "~/Library/CoreFollowUp"),
                ("Sharing recent items cache",          "~/Library/Application Support/com.apple.sharedfilelist"),
                ("DiagnosticReports",                   "~/Library/Logs/DiagnosticReports"),
            ],
            "probably_safe": [
                # /Applications and ~/Library/Logs are intentionally not measured here —
                # /Applications would count all your apps, ~/Library/Logs covers all app
                # logs (mostly useful ones). Old-installer detection lives in the action
                # below as `show-old-macos-installers`.
            ],
            "caution": [
                ("System Updates (needs sudo)",         "/Library/Updates"),
                ("System Caches (needs sudo)",          "/Library/Caches"),
                ("Time Machine local snapshots",        "tm-snapshots"),
            ],
        },
        "actions": {
            "clear-system-caches-user": {
                "label": "Clear user-level system caches",
                "desc":  "Clears icon cache, Spotlight parser, help cache, CloudKit cache, iCloud Drive cache, CoreFollowUp.",
                "cost":  "First Finder window reloads icon cache (~1 min). Spotlight re-indexes some content. Help search re-builds. Nothing user-data affected.",
                "shell": "rm -rf ~/Library/Caches/com.apple.iconservices/* "
                         "~/Library/Caches/com.apple.parsecd/* "
                         "~/Library/Caches/com.apple.helpd/* "
                         "~/Library/Caches/CloudKit/* "
                         "~/Library/Caches/com.apple.bird/* "
                         "~/Library/CoreFollowUp/* "
                         "~/Library/Application\\ Support/com.apple.sharedfilelist/* 2>/dev/null; true",
            },
            "clear-diagnostics": {
                "label": "Clear diagnostic reports",
                "desc":  "Removes app crash reports from ~/Library/Logs/DiagnosticReports.",
                "cost":  "Past app crash logs are gone. Useful if you were debugging — otherwise just noise.",
                "shell": "rm -rf ~/Library/Logs/DiagnosticReports/* 2>/dev/null; true",
            },
            "clear-time-machine-snapshots": {
                "label": "Clear local Time Machine snapshots",
                "desc":  "Lists and deletes local APFS snapshots (these can hold 10+ GB of 'free' disk that macOS reserves for backups).",
                "cost":  "Local Time Machine snapshots are gone — your external Time Machine backups on a separate drive are untouched. Frees 'purgeable' space immediately.",
                "shell": "for s in $(tmutil listlocalsnapshots / 2>/dev/null | sed 's/.*\\.\\([0-9]\\{4\\}-[0-9-]*\\)/\\1/' ); do "
                         "echo \"Deleting snapshot $s…\"; tmutil deletelocalsnapshots \"$s\" 2>/dev/null; done; "
                         "echo 'Done. Run `df -h /` to see freed purgeable space.'",
            },
            "show-old-macos-installers": {
                "label": "Show old macOS installers in /Applications",
                "desc":  "Lists 'Install macOS *.app' bundles — typically 12–15 GB each.",
                "cost":  "Just informational — you delete them manually if you don't need them. Safe to delete if you've already upgraded past that macOS version.",
                "shell": "ls -lh /Applications | grep -i 'Install macOS' || echo 'No macOS installer apps found.'",
                "informational": True,
            },
            "show-system-updates": {
                "label": "Check /Library/Updates (sudo required)",
                "desc":  "Surfaces the size of /Library/Updates (system update downloads). The web UI can't delete this without sudo.",
                "cost":  "If you delete /Library/Updates/*, queued updates re-download. Most users can safely clear this after applying updates.",
                "shell": "du -sh /Library/Updates 2>/dev/null || echo 'Empty or not readable'; "
                         "echo ''; echo 'To clear (in your Terminal, not here):'; "
                         "echo '  sudo rm -rf /Library/Updates/*'",
                "informational": True,
                "sudo": True,
            },
        },
    },

}

# Tab structure — top-level navigation
TABS = [
    {"id": "xcode",    "label": "Xcode",  "category": "xcode"},
    {"id": "llms",     "label": "LLMs",   "subcategories": ["llms-claude", "llms-cursor", "llms-chatgpt"]},
    {"id": "apps",     "label": "Apps",   "category": "apps"},
    {"id": "system",   "label": "System", "category": "system"},
]

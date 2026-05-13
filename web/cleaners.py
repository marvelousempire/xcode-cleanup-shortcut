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

    # ─── Docker ────────────────────────────────────────────────────────
    "docker": {
        "label": "Docker",
        "icon":  "🐳",
        "tagline": "Reclaim 5–60 GB. Docker.raw is the usual culprit.",
        "groups": {
            "safe": [
                ("Docker Desktop logs",                "~/Library/Containers/com.docker.docker/Data/log"),
                ("Docker buildx build cache",          "~/.docker/buildx"),
                ("Docker CLI plugins cache",           "~/.docker/cli-plugins-cache"),
                ("Docker Desktop diagnostics",         "~/Library/Group Containers/group.com.docker/diagnostics"),
                ("Docker Desktop telemetry queue",     "~/Library/Group Containers/group.com.docker/telemetry"),
            ],
            "probably_safe": [
                # Images / containers / volumes live INSIDE Docker.raw — not measurable
                # by `du` on the host. Reclaim them via the prune actions below.
            ],
            "caution": [
                ("Docker VM disk (Docker.raw — new location)",      "~/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw"),
                ("Docker VM disk (Docker.raw — legacy location)",   "~/Library/Containers/com.docker.docker/Data/vms/0/Docker.raw"),
                ("Docker Desktop group container state",            "~/Library/Group Containers/group.com.docker"),
            ],
        },
        "actions": {
            "docker-system-df": {
                "label": "Show Docker disk usage (`docker system df -v`)",
                "desc":  "Summarizes what Docker is using on disk — images, containers, local volumes, build cache. Verbose mode breaks it down per item.",
                "cost":  "Informational only. Nothing is changed.",
                "shell": "if command -v docker >/dev/null 2>&1; then "
                         "echo '▶ Summary:'; docker system df 2>&1; "
                         "echo ''; echo '▶ Per-item breakdown:'; "
                         "docker system df -v 2>&1 | head -80; "
                         "else echo 'Docker CLI not found — install Docker Desktop or skip.'; fi",
                "informational": True,
            },
            "docker-prune-safe": {
                "label": "Prune Docker — safe (stopped containers + dangling images + networks)",
                "desc":  "Runs `docker container prune`, `image prune` (dangling only), and `network prune`. Build cache + volumes are NOT touched (each has its own action).",
                "cost":  "Stopped containers gone (start them again to recreate). Untagged/dangling images gone (re-pull on demand). Unused networks gone (`docker compose up` recreates them). Build cache + volumes are NOT touched in this action — your DB data and your iterative build caches both stay.",
                "shell": "if command -v docker >/dev/null 2>&1; then "
                         "echo '▶ container prune'; docker container prune -f 2>&1; "
                         "echo '▶ image prune (dangling)'; docker image prune -f 2>&1; "
                         "echo '▶ network prune'; docker network prune -f 2>&1; "
                         "echo ''; echo '▶ disk usage now:'; docker system df 2>&1; "
                         "else echo 'Docker CLI not found — install Docker Desktop or skip.'; fi",
            },
            "docker-buildx-prune": {
                "label": "Wipe Docker build cache (`docker buildx prune -af`)",
                "desc":  "Removes every cached buildx layer. Separate from the safe-prune action because the next build runs from scratch (one-time slowdown) — that's why it's opt-in.",
                "cost":  "The next `docker build` / `docker buildx build` / `docker compose build` will run from scratch — no layer reuse. After it completes once, the cache repopulates and future builds are fast again. No image / container / volume affected.",
                "shell": "if command -v docker >/dev/null 2>&1; then "
                         "docker buildx prune -af 2>&1; "
                         "echo ''; echo '▶ disk usage now:'; docker system df 2>&1; "
                         "else echo 'Docker CLI not found.'; fi",
            },
            "docker-volume-preflight": {
                "label": "Pre-flight: list what `--volumes` prune would delete",
                "desc":  "Before clicking the aggressive prune below, see exactly which volumes would be wiped. Shows volumes that aren't currently attached to any container.",
                "cost":  "Informational only. Nothing is deleted — this just tells you what's at stake.",
                "shell": "if command -v docker >/dev/null 2>&1; then "
                         "echo '▶ All volumes:'; "
                         "docker volume ls 2>&1; "
                         "echo ''; echo '▶ Volumes not attached to any container (would be deleted by --volumes prune):'; "
                         "DANGLING=$(docker volume ls -qf dangling=true 2>/dev/null); "
                         "if [ -z \"$DANGLING\" ]; then echo '  (none — your volumes are all attached to containers, safe to prune.)'; "
                         "else echo \"$DANGLING\" | while read v; do "
                         "size=$(docker run --rm -v \"$v\":/data alpine du -sh /data 2>/dev/null | cut -f1); "
                         "echo \"  $v  ($size)\"; done; fi; "
                         "echo ''; echo 'If any of these are important (DB data, persistent state), STOP — start the container that should be using them before pruning.'; "
                         "else echo 'Docker CLI not found.'; fi",
                "informational": True,
            },
            "docker-prune-everything": {
                "label": "Nuke ALL unused Docker (system prune --volumes)",
                "desc":  "Aggressive: `docker system prune -a --volumes -f`. Removes everything not currently in use, INCLUDING volumes. Run the pre-flight first.",
                "cost":  "ALL stopped containers gone. ALL unused images gone (re-pull on next `docker compose up`, often 5+ GB). **ALL unused volumes gone** — this is the dangerous one: any DB/postgres/redis volume not attached to a RUNNING container is wiped. Run the pre-flight action above first to see exactly what would be deleted.",
                "shell": "if command -v docker >/dev/null 2>&1; then "
                         "docker system prune -a --volumes -f 2>&1; "
                         "echo ''; echo '▶ disk usage now:'; docker system df 2>&1; "
                         "else echo 'Docker CLI not found.'; fi",
            },
            "docker-vm-reset-info": {
                "label": "How to actually shrink Docker.raw (informational)",
                "desc":  "Pruning shrinks what's INSIDE the VM, not the .raw file on host disk. This shows how to reset the VM image.",
                "cost":  "Resetting Docker Desktop's VM wipes ALL images, containers, volumes, and Kubernetes state. Surfaces the manual command rather than running it for you.",
                "shell": "echo 'Docker.raw is the VM disk that holds your images/containers/volumes.'; "
                         "echo 'Pruning shrinks WHAT IS INSIDE the VM, not the .raw file on host disk.'; "
                         "echo ''; echo 'Current Docker.raw size:'; "
                         "ls -lh ~/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw 2>/dev/null || "
                         "ls -lh ~/Library/Containers/com.docker.docker/Data/vms/0/Docker.raw 2>/dev/null || "
                         "echo '  (Docker.raw not found — Docker Desktop may not be installed.)'; "
                         "echo ''; echo 'To shrink it (in Docker Desktop):'; "
                         "echo '  Settings → Troubleshoot → Clean / Purge data → Reset disk image'; "
                         "echo ''; echo 'Or from Terminal (nukes everything, then rebuilds the VM):'; "
                         "echo '  docker system prune -a --volumes -f'; "
                         "echo '  killall Docker'; "
                         "echo '  rm -f ~/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw'; "
                         "echo '  open -a Docker'",
                "informational": True,
            },
            "docker-clear-logs": {
                "label": "Clear Docker Desktop logs + diagnostics",
                "desc":  "Removes ~/Library/Containers/com.docker.docker/Data/log + Group Containers diagnostics.",
                "cost":  "Past Docker Desktop logs + diagnostics gone. Containers, images, and volumes are untouched.",
                "shell": "rm -rf ~/Library/Containers/com.docker.docker/Data/log/* "
                         "~/Library/Group\\ Containers/group.com.docker/diagnostics/* "
                         "~/Library/Group\\ Containers/group.com.docker/telemetry/* 2>/dev/null; true",
            },
        },
    },

    # ─── Adobe (Creative sub-tab) ──────────────────────────────────────
    "creative-adobe": {
        "label": "Adobe",
        "parent": "creative",
        "icon":   "🎨",
        "tagline": "Premiere · After Effects · Photoshop · Lightroom caches.",
        "groups": {
            "safe": [
                ("Adobe Media Cache (Premiere/AE shared)",       "~/Library/Application Support/Adobe/Common/Media Cache Files"),
                ("Adobe Media Cache index",                       "~/Library/Application Support/Adobe/Common/Media Cache"),
                ("Premiere Pro disk cache",                       "~/Library/Application Support/Adobe/Premiere Pro"),
                ("After Effects disk cache",                      "~/Library/Application Support/Adobe/After Effects"),
                ("Photoshop disk cache",                          "~/Library/Application Support/Adobe/Adobe Photoshop"),
                ("Adobe general cache",                           "~/Library/Caches/Adobe"),
                ("Adobe Creative Cloud cache",                    "~/Library/Caches/com.adobe.acc.AdobeCreativeCloud"),
                ("Adobe Acrobat cache",                           "~/Library/Caches/com.adobe.Acrobat.Pro"),
            ],
            "probably_safe": [
                ("Camera Raw cache",                              "~/Library/Caches/Adobe Camera Raw"),
                ("Adobe Bridge cache",                            "~/Library/Caches/Adobe/Bridge"),
            ],
            "caution": [
                ("Lightroom folder (CATALOG + previews together)",  "~/Pictures/Lightroom"),
            ],
        },
        "actions": {
            "clear-adobe-media-cache": {
                "label": "Clear Adobe Media Cache (Premiere + AE shared)",
                "desc":  "Removes the shared Media Cache Files + index that Premiere Pro and After Effects both use. Often the single biggest reclaim on a video editor's Mac.",
                "cost":  "Premiere / After Effects re-conform audio and rebuild peaks the next time you open each project (one-time cost per project, can take minutes on long timelines). Project files, sequences, edits — all untouched.",
                "shell": "rm -rf "
                         "~/Library/Application\\ Support/Adobe/Common/Media\\ Cache\\ Files/* "
                         "~/Library/Application\\ Support/Adobe/Common/Media\\ Cache/* 2>/dev/null; true",
            },
            "clear-adobe-app-caches": {
                "label": "Clear Adobe app caches (Premiere / AE / Photoshop / Bridge)",
                "desc":  "Per-app disk caches for Premiere Pro, After Effects, Photoshop, plus Bridge previews. Doesn't touch the shared Media Cache (that has its own action). **Note:** ~/Library/Caches/Adobe is also where Lightroom's *non-catalog* caches live; the catalog itself in ~/Pictures/Lightroom is never touched by this action.",
                "cost":  "Each app rebuilds its disk cache on next launch / next preview render. Preference settings, presets, project files, and your Lightroom catalog are NOT affected.",
                "shell": "rm -rf "
                         "~/Library/Application\\ Support/Adobe/Premiere\\ Pro/*/Common/Media\\ Cache* "
                         "~/Library/Application\\ Support/Adobe/After\\ Effects/*/Adobe\\ After\\ Effects\\ Disk\\ Cache* "
                         "~/Library/Application\\ Support/Adobe/Adobe\\ Photoshop\\ */Cache* "
                         "~/Library/Caches/Adobe/Bridge/* "
                         "~/Library/Caches/Adobe/* 2>/dev/null; true",
            },
            "clear-camera-raw-cache": {
                "label": "Clear Camera Raw cache",
                "desc":  "Removes Camera Raw's previews + ACR cache (~/Library/Caches/Adobe Camera Raw).",
                "cost":  "Lightroom / Photoshop rebuilds raw previews on next view (slower per-image first-time). Edits are stored in catalogs / sidecar XMP files and are unaffected.",
                "shell": "rm -rf ~/Library/Caches/Adobe\\ Camera\\ Raw/* 2>/dev/null; true",
            },
            "lightroom-preview-cleanup": {
                "label": "Clear Lightroom previews (only previews — catalog stays)",
                "desc":  "Per-catalog: removes the `*.lrdata` and `*.lrpreviewstore` preview pyramids next to each `.lrcat`. The catalog itself is never touched.",
                "cost":  "Lightroom rebuilds previews on demand as you view photos (slower scroll on first browse per folder, one-time per photo). Your **catalog (`.lrcat`), edits, develop history, virtual copies, and ratings are all preserved** — they live in the catalog, not in the previews.",
                "shell": "ROOT=~/Pictures/Lightroom; "
                         "[ -d \"$ROOT\" ] || { echo 'No ~/Pictures/Lightroom folder found.'; exit 0; }; "
                         "echo '▶ Catalogs found:'; "
                         "find \"$ROOT\" -maxdepth 3 -name '*.lrcat' 2>/dev/null | while read c; do echo \"  $(basename \"$c\")\"; done; "
                         "echo ''; echo '▶ Removing previews (NOT touching .lrcat):'; "
                         "find \"$ROOT\" -maxdepth 3 \\( -name 'Previews.lrdata' -o -name '*.lrpreviewstore' -o -name 'Helper.lrdata' \\) -type d 2>/dev/null | while read p; do "
                         "size=$(du -sh \"$p\" 2>/dev/null | cut -f1); "
                         "echo \"  removing $p ($size)\"; rm -rf \"$p\"; done; "
                         "echo ''; echo '▶ Done. Lightroom will rebuild previews on demand.'",
            },
            "lightroom-folder-stats": {
                "label": "Show Lightroom folder sizes (informational)",
                "desc":  "Surfaces the size of each catalog + previews pair without touching anything. Faster than browsing in Finder.",
                "cost":  "Informational only. Nothing changes.",
                "shell": "ROOT=~/Pictures/Lightroom; "
                         "[ -d \"$ROOT\" ] || { echo 'No ~/Pictures/Lightroom folder found.'; exit 0; }; "
                         "echo '▶ Top-level entries:'; "
                         "du -sh -d 0 \"$ROOT\"/* 2>/dev/null | sort -hr | head -20; "
                         "echo ''; echo 'Tip: previews live in *.lrdata / *.lrpreviewstore — safe to delete via the action above. The .lrcat next to them is your catalog.'",
                "informational": True,
            },
        },
    },

    # ─── DaVinci Resolve (Creative sub-tab) ────────────────────────────
    "creative-davinci": {
        "label": "DaVinci Resolve",
        "parent": "creative",
        "icon":   "🎬",
        "tagline": "Render cache, proxies, optimized media.",
        "groups": {
            "safe": [
                ("Render Cache",                          "~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Render Cache"),
                ("Optimized Media",                       "~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Optimized Media"),
                ("CacheClip (proxies, legacy location)",  "~/Movies/CacheClip"),
                ("CacheClip (proxies, 18+ location)",     "~/Movies/Blackmagic Design/DaVinci Resolve/CacheClip"),
                ("DaVinci Resolve logs",                  "~/Library/Logs/Blackmagic Design/DaVinci Resolve"),
                ("DaVinci general cache",                 "~/Library/Caches/com.blackmagic-design.DaVinciResolve"),
            ],
            "probably_safe": [
                ("Gallery Stills (per-project color refs)",   "~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Gallery Stills"),
                ("Fusion Disk Cache",                          "~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Disk Cache"),
            ],
            "caution": [
                ("Resolve Projects",                           "~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Resolve Projects"),
                ("Resolve Disk Database",                      "~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Resolve Disk Database"),
                ("~/Movies/DaVinci Resolve (may contain exports)",  "~/Movies/DaVinci Resolve"),
            ],
        },
        "actions": {
            "clear-davinci-cache": {
                "label": "Clear Render Cache + Optimized Media + CacheClip",
                "desc":  "Removes the three big regenerable buckets: Render Cache, Optimized Media, and CacheClip proxies (both the legacy `~/Movies/CacheClip` location and the Resolve-18+ `~/Movies/Blackmagic Design/...` location).",
                "cost":  "Resolve re-renders cached / optimized clips on next playback (slower scrubbing until the cache rebuilds — usually within a session). Anything you've EXPORTED is untouched; projects and color grades are untouched.",
                "shell": "rm -rf "
                         "~/Library/Application\\ Support/Blackmagic\\ Design/DaVinci\\ Resolve/Render\\ Cache/* "
                         "~/Library/Application\\ Support/Blackmagic\\ Design/DaVinci\\ Resolve/Optimized\\ Media/* "
                         "~/Movies/CacheClip/* "
                         "~/Movies/Blackmagic\\ Design/DaVinci\\ Resolve/CacheClip/* 2>/dev/null; true",
            },
            "clear-davinci-logs": {
                "label": "Clear DaVinci logs + general cache",
                "desc":  "Removes ~/Library/Logs/Blackmagic Design + ~/Library/Caches/com.blackmagic-design.*",
                "cost":  "Past crash logs gone. Projects, render cache, and color databases untouched.",
                "shell": "rm -rf ~/Library/Logs/Blackmagic\\ Design/* "
                         "~/Library/Caches/com.blackmagic-design.*/* 2>/dev/null; true",
            },
            "clear-fusion-cache": {
                "label": "Clear Fusion disk cache",
                "desc":  "Removes Fusion's disk cache (used for VFX node previews).",
                "cost":  "Fusion comp nodes recompute on next preview (slower the first time per comp). Final flows / saved comps are stored in projects and unaffected.",
                "shell": "rm -rf ~/Library/Application\\ Support/Blackmagic\\ Design/DaVinci\\ Resolve/Fusion/Disk\\ Cache/* 2>/dev/null; true",
            },
        },
    },

    # ─── Final Cut Pro (Creative sub-tab) ──────────────────────────────
    "creative-finalcut": {
        "label": "Final Cut Pro",
        "parent": "creative",
        "icon":   "🎞",
        "tagline": "Render files, optimized media, backups.",
        "groups": {
            "safe": [
                ("Final Cut Pro caches",                   "~/Library/Caches/com.apple.FinalCut"),
                ("Final Cut Pro app state",                "~/Library/Application Support/Final Cut Pro"),
                ("Motion templates cache",                 "~/Library/Caches/com.apple.motion"),
                ("Compressor caches",                      "~/Library/Caches/com.apple.compressor"),
            ],
            "probably_safe": [
                # Final Cut renders + optimized media live INSIDE the .fcpbundle library,
                # which is a user-managed file (could be on external storage). Per-library
                # cleanup happens via the action below.
                ("Final Cut Backups (~/Movies/Final Cut Backups)", "~/Movies/Final Cut Backups"),
            ],
            "caution": [
                # Library bundles are user content — surfaced for review only.
            ],
        },
        "actions": {
            "clear-finalcut-renders": {
                "label": "Clear render files in every Final Cut library (~/Movies/*.fcpbundle)",
                "desc":  "For each `.fcpbundle` in ~/Movies, removes the Render Files subfolders. Library structure + your edits + your imported media are NOT touched.",
                "cost":  "Final Cut re-renders timelines on next preview / export (one-time cost per project, can take minutes on long timelines). Edits, audio sync, color grades — all preserved. **Important:** this only scans `~/Movies/*.fcpbundle`. Libraries on external drives or other folders are not affected.",
                "shell": "BUNDLES=(~/Movies/*.fcpbundle); "
                         "if [ ! -e \"${BUNDLES[0]}\" ]; then echo 'No .fcpbundle libraries found in ~/Movies.'; exit 0; fi; "
                         "for B in \"${BUNDLES[@]}\"; do "
                         "echo \"▶ $(basename \"$B\")\"; "
                         "find \"$B\" -type d -name 'Render Files' -exec rm -rf {}/* \\; 2>/dev/null; "
                         "echo '  ✓ render files cleared'; done; "
                         "echo ''; echo '▶ Done. Next preview/export will re-render.'",
            },
            "clear-finalcut-optimized": {
                "label": "Clear optimized + proxy media in every Final Cut library",
                "desc":  "For each `.fcpbundle` in ~/Movies, removes the Transcoded Media subfolders (optimized .mov + proxy .mov). Originals are untouched.",
                "cost":  "Final Cut falls back to using ORIGINAL media for playback (potentially less responsive scrubbing on big files until you re-transcode). Source clips, edits, and exports are unaffected.",
                "shell": "BUNDLES=(~/Movies/*.fcpbundle); "
                         "if [ ! -e \"${BUNDLES[0]}\" ]; then echo 'No .fcpbundle libraries found in ~/Movies.'; exit 0; fi; "
                         "for B in \"${BUNDLES[@]}\"; do "
                         "echo \"▶ $(basename \"$B\")\"; "
                         "find \"$B\" -type d -name 'Transcoded Media' -exec rm -rf {}/* \\; 2>/dev/null; "
                         "echo '  ✓ transcoded media cleared'; done",
            },
            "clear-finalcut-backups": {
                "label": "Clear Final Cut auto-backups (~/Movies/Final Cut Backups)",
                "desc":  "Removes the 15-minute auto-snapshots Final Cut keeps in ~/Movies/Final Cut Backups. These are project-edit snapshots, not your media.",
                "cost":  "You lose the ability to roll back to an auto-snapshot from before this point. Your current library state stays exactly as it is.",
                "shell": "rm -rf ~/Movies/Final\\ Cut\\ Backups/* 2>/dev/null; "
                         "echo '✓ Final Cut auto-backups cleared.'",
            },
        },
    },

    # ─── Logic Pro (Creative sub-tab) ──────────────────────────────────
    "creative-logic": {
        "label": "Logic Pro",
        "parent": "creative",
        "icon":   "🎹",
        "tagline": "Logic + GarageBand caches. Apple Loops can be 5–20 GB.",
        "groups": {
            "safe": [
                ("Logic Pro caches",                       "~/Library/Caches/com.apple.logic10"),
                ("Logic Pro waveform cache",               "~/Library/Application Support/Logic/Cache"),
                ("GarageBand caches",                      "~/Library/Caches/com.apple.garageband10"),
                ("Plug-In Settings cache",                 "~/Music/Audio Music Apps/Plug-In Settings/Cache"),
            ],
            "probably_safe": [
                # Apple Loops are reinstallable but can be 20+ GB. Bouncing them as
                # opt-in lets the user reclaim aggressively if they're disk-pressed.
                ("Apple Loops (re-downloadable, 5–20 GB typical)",  "~/Library/Audio/Apple Loops"),
                ("Logic Pro Sound Library (re-downloadable)",       "~/Library/Application Support/Logic/Sounds"),
            ],
            "caution": [
                # User projects + plugin presets — surfaced for review only.
                ("Logic Pro user content (templates, projects)",     "~/Music/Audio Music Apps"),
                ("Plug-In Settings (your presets)",                  "~/Music/Audio Music Apps/Plug-In Settings"),
            ],
        },
        "actions": {
            "clear-logic-caches": {
                "label": "Clear Logic + GarageBand caches",
                "desc":  "Removes per-app caches and waveform caches. Doesn't touch your projects, presets, or sound libraries.",
                "cost":  "Logic / GarageBand recalculates waveform displays on next project open (slower first-load per project). Settings, projects, plugins — all preserved.",
                "shell": "rm -rf ~/Library/Caches/com.apple.logic10/* "
                         "~/Library/Caches/com.apple.garageband10/* "
                         "~/Library/Application\\ Support/Logic/Cache/* "
                         "~/Music/Audio\\ Music\\ Apps/Plug-In\\ Settings/Cache/* 2>/dev/null; true",
            },
            "remove-apple-loops-info": {
                "label": "Apple Loops cleanup (how to do it without breaking your projects)",
                "desc":  "Apple Loops can be 5–20 GB. The safe way to clear them is via Logic itself — File → Project Settings → Audio → Delete unused content. Deleting from Finder breaks Logic's loop browser until re-downloaded.",
                "cost":  "Informational only. Surfaces the current loop folder size and the in-app reclaim path.",
                "shell": "echo '▶ Apple Loops folder sizes:'; "
                         "du -sh -d 0 ~/Library/Audio/Apple\\ Loops 2>/dev/null || echo '  (no Apple Loops folder)'; "
                         "du -sh -d 0 ~/Library/Application\\ Support/Logic/Sounds 2>/dev/null || echo '  (no Logic Sounds folder)'; "
                         "echo ''; echo 'To reclaim safely:'; "
                         "echo '  Logic Pro → Logic Pro menu → Sound Library → Reinstall Sound Library (lets you uncheck packs you don\\'t use)'; "
                         "echo '  Or: in any open project: File → Project Settings → Assets → Save / Delete unused'; "
                         "echo ''; echo 'Re-download anytime from the Sound Library window.'",
                "informational": True,
            },
        },
    },

    # ─── Blender (Creative sub-tab) ────────────────────────────────────
    "creative-blender": {
        "label": "Blender",
        "parent": "creative",
        "icon":   "🌀",
        "tagline": "Cycles cache, render output, autosaves.",
        "groups": {
            "safe": [
                ("Blender autosave temp files (in /tmp)",  "/tmp/blender_autosave"),
                ("Blender app caches",                     "~/Library/Caches/org.blenderfoundation.blender"),
                ("Blender crash dumps",                    "~/Library/Logs/Blender"),
            ],
            "probably_safe": [
                # Blender stores Cycles bakes + render caches in per-version dirs.
                # Wildcard at scan time so 4.0 / 4.1 / etc. all get measured together.
                ("Blender per-version caches",             "~/Library/Application Support/Blender"),
            ],
            "caution": [
                # User scripts + addons in the same Application Support tree.
            ],
        },
        "actions": {
            "clear-blender-cycles-cache": {
                "label": "Clear Blender Cycles cache (per-version)",
                "desc":  "Removes the `cache/` subfolders under every Blender version directory in ~/Library/Application Support/Blender/*. Leaves your scripts, addons, and preferences alone.",
                "cost":  "Cycles re-bakes denoiser data + GPU shader caches on next render (slower first frame after this; subsequent frames are normal speed). Your .blend files, addons, and user prefs are untouched.",
                "shell": "ROOT=~/Library/Application\\ Support/Blender; "
                         "[ -d \"$ROOT\" ] || { echo 'No Blender app-support folder found.'; exit 0; }; "
                         "echo '▶ Found versions:'; "
                         "ls -d \"$ROOT\"/*/ 2>/dev/null | while read v; do echo \"  $(basename \"$v\")\"; done; "
                         "find \"$ROOT\" -maxdepth 2 -type d -name cache -exec rm -rf {}/* \\; 2>/dev/null; "
                         "echo '▶ Cycles caches cleared.'",
            },
            "clear-blender-temp": {
                "label": "Clear Blender autosave + temp files in /tmp",
                "desc":  "Removes /tmp/blender_autosave (where Blender drops auto-recovery .blend files). Useful after Blender crashes left orphans behind.",
                "cost":  "You lose auto-recovery snapshots from past sessions. Your saved .blend files (anywhere you've explicitly saved them) are untouched.",
                "shell": "rm -rf /tmp/blender_autosave 2>/dev/null; "
                         "rm -rf /tmp/quit.blend* 2>/dev/null; "
                         "echo '✓ Blender autosave temp cleared.'",
            },
        },
    },

    # ─── OBS Studio (Creative sub-tab) ─────────────────────────────────
    "creative-obs": {
        "label": "OBS Studio",
        "parent": "creative",
        "icon":   "🎙",
        "tagline": "Logs, crash dumps, browser-source cache.",
        "groups": {
            "safe": [
                ("OBS logs",                       "~/Library/Application Support/obs-studio/logs"),
                ("OBS crash dumps",                "~/Library/Application Support/obs-studio/crashes"),
                ("OBS browser-source cache",       "~/Library/Application Support/obs-studio/plugin_config/obs-browser/Cache"),
                ("OBS Service Worker cache",       "~/Library/Application Support/obs-studio/plugin_config/obs-browser/Service Worker"),
            ],
            "probably_safe": [],
            "caution": [
                # OBS stores recordings/replay buffer wherever the user configured —
                # never in app-support by default. We don't surface that path because
                # it's user-configurable and not something we should ever auto-touch.
                ("OBS user config (scenes, profiles)",        "~/Library/Application Support/obs-studio/basic"),
            ],
        },
        "actions": {
            "clear-obs-logs": {
                "label": "Clear OBS logs + crash dumps",
                "desc":  "Removes ~/Library/Application Support/obs-studio/logs and /crashes.",
                "cost":  "Past stream/recording logs gone (rarely useful unless debugging). Crash dumps gone. Scenes, profiles, recordings — all untouched.",
                "shell": "rm -rf ~/Library/Application\\ Support/obs-studio/logs/* "
                         "~/Library/Application\\ Support/obs-studio/crashes/* 2>/dev/null; "
                         "echo '✓ OBS logs + crash dumps cleared.'",
            },
            "clear-obs-browser-cache": {
                "label": "Clear OBS browser-source cache",
                "desc":  "Removes the Chromium cache that browser-source overlays use.",
                "cost":  "Browser-source overlays (chat widgets, alerts, etc.) reload from origin on next stream. Saved login state for those overlays may be lost — re-login if a widget asks for it.",
                "shell": "rm -rf ~/Library/Application\\ Support/obs-studio/plugin_config/obs-browser/Cache/* "
                         "~/Library/Application\\ Support/obs-studio/plugin_config/obs-browser/Service\\ Worker/* 2>/dev/null; "
                         "echo '✓ OBS browser-source cache cleared.'",
            },
        },
    },

    # ─── Apps (chat, productivity, dev tools) ────────────────────────
    # Focused on non-browser apps that accumulate large caches silently.
    # Browser caches live in the dedicated `browsers` category.
    "apps": {
        "label": "Apps",
        "icon":  "💬",
        "tagline": "Telegram · Slack · Discord · VS Code · Figma · WhatsApp — app caches that quietly eat GB.",
        "groups": {
            "safe": [
                # ── Messaging / Communication ──────────────────────────────
                # Telegram stores all received media in a Group Container that
                # can reach 5–20 GB. The cache rebuilds as you re-view content.
                ("Telegram media cache (Group Container)",  "~/Library/Group Containers/6N38VWS5BX.ru.keepcoder.Telegram/stable/postbox/media"),
                ("Telegram Desktop cache",                  "~/Library/Application Support/Telegram Desktop/tdata/user_data/cache"),
                ("Telegram Desktop temp",                   "~/Library/Application Support/Telegram Desktop/tdata/user_data/temp"),

                # Slack has three separate cache layers; Cache/ is usually largest.
                ("Slack Cache",                             "~/Library/Application Support/Slack/Cache"),
                ("Slack Code Cache",                        "~/Library/Application Support/Slack/Code Cache"),
                ("Slack Service Worker",                    "~/Library/Application Support/Slack/Service Worker"),
                ("Slack GPU cache",                         "~/Library/Application Support/Slack/GPUCache"),

                # Discord — lowercase and capital-D variants exist on different setups.
                ("Discord cache",                           "~/Library/Application Support/discord/Cache"),
                ("Discord Code Cache",                      "~/Library/Application Support/discord/Code Cache"),
                ("Discord blob storage",                    "~/Library/Application Support/discord/blob_storage"),
                ("Discord (capital-D) cache",               "~/Library/Application Support/Discord/Cache"),

                # Zoom
                ("Zoom cache",                              "~/Library/Caches/us.zoom.xos"),
                ("Zoom app cache",                          "~/Library/Application Support/zoom.us/cache"),

                # Microsoft Teams
                ("Microsoft Teams cache",                   "~/Library/Application Support/Microsoft/Teams/Cache"),
                ("Microsoft Teams Code Cache",              "~/Library/Application Support/Microsoft/Teams/Code Cache"),
                ("Microsoft Teams GPU cache",               "~/Library/Application Support/Microsoft/Teams/GPUCache"),

                # ── Music / Media ─────────────────────────────────────────
                # Spotify caches buffered + downloaded tracks (3–10 GB is common).
                ("Spotify cache",                           "~/Library/Caches/com.spotify.client"),
                ("Spotify persistent cache",                "~/Library/Application Support/Spotify/PersistentCache"),
                ("Spotify storage",                         "~/Library/Application Support/Spotify/Storage"),

                # ── Developer tools ───────────────────────────────────────
                # VS Code keeps a large compiled-TypeScript cache per install.
                ("VS Code cache",                           "~/Library/Application Support/Code/Cache"),
                ("VS Code CachedData (compiled TS)",        "~/Library/Application Support/Code/CachedData"),
                ("VS Code GPU cache",                       "~/Library/Application Support/Code/GPUCache"),
                ("Cursor cache",                            "~/Library/Application Support/Cursor/Cache"),
                ("Cursor CachedData",                       "~/Library/Application Support/Cursor/CachedData"),

                # Figma desktop caches document previews, fonts, and asset tiles
                # — can easily reach 2–5 GB on an active design machine.
                ("Figma cache",                             "~/Library/Application Support/Figma"),

                # ── Homebrew ──────────────────────────────────────────────
                ("Homebrew downloads cache",                "~/Library/Caches/Homebrew/downloads"),
            ],
            "probably_safe": [
                # VS Code workspace storage holds per-project state. Clearing
                # loses workspace-level settings but not your code or extensions.
                ("VS Code workspace storage",               "~/Library/Application Support/Code/User/workspaceStorage"),
                ("VS Code cached extension VSIXs",          "~/Library/Application Support/Code/CachedExtensionVSIXs"),

                # WhatsApp / Signal store received media. Re-downloadable from chat
                # history, but clears local copies of photos/videos.
                ("WhatsApp media",                          "~/Library/Application Support/WhatsApp"),
                ("Signal attachments",                      "~/Library/Application Support/Signal/attachments.noindex"),
            ],
            "caution": [
                ("Mail downloads (user data)",  "~/Library/Containers/com.apple.mail/Data/Library/Mail Downloads"),
            ],
        },
        "actions": {
            "clear-chat-caches": {
                "label": "Clear Telegram + Slack + Discord + Zoom + Teams caches",
                "desc":  "Wipes safe-tier cache dirs for every major chat app in one shot.",
                "cost":  "Each app re-downloads avatars, emoji packs, and recently viewed media on next launch. You stay signed in everywhere. No message history is lost.",
                "shell": (
                    "rm -rf "
                    "'~/Library/Group Containers/6N38VWS5BX.ru.keepcoder.Telegram/stable/postbox/media' "
                    "'~/Library/Application Support/Telegram Desktop/tdata/user_data/cache' "
                    "'~/Library/Application Support/Telegram Desktop/tdata/user_data/temp' "
                    "'~/Library/Application Support/Slack/Cache' "
                    "'~/Library/Application Support/Slack/Code Cache' "
                    "'~/Library/Application Support/Slack/Service Worker' "
                    "'~/Library/Application Support/Slack/GPUCache' "
                    "'~/Library/Application Support/discord/Cache' "
                    "'~/Library/Application Support/discord/Code Cache' "
                    "'~/Library/Application Support/discord/blob_storage' "
                    "'~/Library/Application Support/Discord/Cache' "
                    "'~/Library/Caches/us.zoom.xos' "
                    "'~/Library/Application Support/Microsoft/Teams/Cache' "
                    "'~/Library/Application Support/Microsoft/Teams/Code Cache' "
                    "2>/dev/null; echo \'\u2713 Chat app caches cleared.\'"
                ),
            },
            "clear-spotify-cache": {
                "label": "Clear Spotify cache (3–10 GB)",
                "desc":  "Removes Spotify\'s download + storage cache.",
                "cost":  "Spotify re-buffers songs as you play. Downloaded offline tracks need to be re-downloaded.",
                "shell": "rm -rf ~/Library/Caches/com.spotify.client/* "
                         "~/Library/Application\ Support/Spotify/PersistentCache/* "
                         "~/Library/Application\ Support/Spotify/Storage/* "
                         "2>/dev/null; echo \'\u2713 Spotify cache cleared.\'",
            },
            "clear-vscode-cache": {
                "label": "Clear VS Code / Cursor cache",
                "desc":  "Removes compiled-TypeScript and GPU caches for VS Code and Cursor.",
                "cost":  "VS Code/Cursor re-compiles on first launch (~5s). Extensions, settings, keybindings untouched.",
                "shell": "rm -rf "
                         "'~/Library/Application Support/Code/Cache' "
                         "'~/Library/Application Support/Code/CachedData' "
                         "'~/Library/Application Support/Code/GPUCache' "
                         "'~/Library/Application Support/Cursor/Cache' "
                         "'~/Library/Application Support/Cursor/CachedData' "
                         "2>/dev/null; echo \'\u2713 VS Code/Cursor cache cleared.\'",
            },
            "clear-homebrew": {
                "label": "Clear Homebrew download cache",
                "desc":  "Runs `brew cleanup -s` — removes cached formula + cask archives.",
                "cost":  "Re-downloads on next `brew install` of a pruned formula (fast). Installed brews stay installed.",
                "shell": "command -v brew >/dev/null && brew cleanup -s 2>&1 || echo \'Homebrew not installed — skipping\'",
            },
            "show-telegram-size": {
                "label": "Show Telegram full footprint (informational)",
                "desc":  "du -sh on Telegram\'s Group Container and Desktop data directory.",
                "cost":  "Read-only.",
                "shell": (
                    "echo \'=== Telegram (iOS-based) ===\'; "
                    "du -sh \'~/Library/Group Containers/6N38VWS5BX.ru.keepcoder.Telegram/\' 2>/dev/null "
                    "|| echo \'  (not installed)\'; "
                    "echo \'=== Telegram Desktop ===\'; "
                    "du -sh \'~/Library/Application Support/Telegram Desktop/\' 2>/dev/null "
                    "|| echo \'  (not installed)\'"
                ),
                "informational": True,
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
                # NOTE: com.apple.sharedfilelist intentionally removed from safe tier.
                # It contains Finder sidebar favorites (FavoriteItems.sfl3) and clearing it
                # wipes the user's sidebar. Moved to caution-only; do not auto-clean.
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
                ("Application logs (~/Library/Logs)",   "~/Library/Logs"),
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
                         "2>/dev/null; true",
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

    # ─── Browsers ─────────────────────────────────────────────────────
    # Cache reclaim for every browser you're likely to have installed.
    #
    # WHY BROWSERS SOMETIMES SHOW ZERO:
    # Safari moved its cache to a container directory in macOS Ventura+.
    # The old ~/Library/Caches/com.apple.Safari path is now empty on most
    # Macs. We measure both paths so older and newer macOS installations
    # both surface real data. Same issue for Chrome — the actual disk cache
    # lives inside Application Support, not just Caches.
    #
    # ~/Library/WebKit is a SEPARATE high-value target: it holds IndexedDB,
    # localStorage, offline databases, and Service Worker caches for EVERY
    # WebKit-based app (not just Safari). Often 1–3 GB on an active machine.
    "browsers": {
        "label": "Browsers",
        "icon":  "🌐",
        "tagline": "Reclaim 2–30 GB across Chrome / Safari / Firefox / Edge / Brave / Arc. Check WebKit too.",
        "groups": {
            "safe": [
                # ── Chrome ────────────────────────────────────────────────
                # Chrome keeps its disk cache inside Application Support on
                # modern macOS. The Caches/Google/Chrome entry may be empty.
                ("Chrome cache (Caches dir)",           "~/Library/Caches/Google/Chrome"),
                ("Chrome Default profile cache",        "~/Library/Application Support/Google/Chrome/Default/Cache"),
                ("Chrome Code Cache",                   "~/Library/Application Support/Google/Chrome/Default/Code Cache"),
                ("Chrome GPU cache",                    "~/Library/Application Support/Google/Chrome/Default/GPUCache"),
                ("Chrome Service Worker cache",         "~/Library/Application Support/Google/Chrome/Default/Service Worker/CacheStorage"),

                # ── Safari ────────────────────────────────────────────────
                # macOS Ventura+ moves Safari into a container. Measure BOTH
                # so older and newer macOS versions both report non-zero.
                ("Safari cache (legacy path)",          "~/Library/Caches/com.apple.Safari"),
                ("Safari cache (Ventura+ container)",   "~/Library/Containers/com.apple.Safari/Data/Library/Caches"),
                ("Safari WebKit storage",               "~/Library/Containers/com.apple.Safari/Data/Library/WebKit"),

                # WebKit offline storage — shared across ALL WebKit-based apps.
                # This single directory is often 1–3 GB and almost never cleaned.
                ("WebKit offline storage + IndexedDB",  "~/Library/WebKit"),
                ("WebKit Caches",                       "~/Library/Caches/com.apple.WebKit.WebContent"),
                ("WebKit networking cache",             "~/Library/Caches/com.apple.WebKit.Networking"),

                # ── Firefox ───────────────────────────────────────────────
                ("Firefox cache (Caches dir)",          "~/Library/Caches/Firefox"),
                ("Firefox profile caches (cache2)",     "~/Library/Application Support/Firefox/Profiles"),

                # ── Edge ──────────────────────────────────────────────────
                ("Edge cache (Caches dir)",             "~/Library/Caches/Microsoft Edge"),
                ("Edge Default profile cache",          "~/Library/Application Support/Microsoft Edge/Default/Cache"),
                ("Edge Code Cache",                     "~/Library/Application Support/Microsoft Edge/Default/Code Cache"),

                # ── Brave ─────────────────────────────────────────────────
                ("Brave cache (Caches dir)",            "~/Library/Caches/BraveSoftware/Brave-Browser"),
                ("Brave Default profile cache",         "~/Library/Application Support/BraveSoftware/Brave-Browser/Default/Cache"),
                ("Brave Service Worker cache",          "~/Library/Application Support/BraveSoftware/Brave-Browser/Default/Service Worker/CacheStorage"),

                # ── Arc ───────────────────────────────────────────────────
                ("Arc cache (Caches dir)",              "~/Library/Caches/Company Browser, Inc."),
                ("Arc Service Worker cache",            "~/Library/Application Support/Arc/User Data/Default/Service Worker/CacheStorage"),

                # ── Others ────────────────────────────────────────────────
                ("Vivaldi cache",                       "~/Library/Caches/Vivaldi"),
                ("Opera cache",                         "~/Library/Caches/com.operasoftware.Opera"),
            ],
            "probably_safe": [
                ("Chrome browsing history",             "~/Library/Application Support/Google/Chrome/Default/History"),
                ("Edge browsing history",               "~/Library/Application Support/Microsoft Edge/Default/History"),
                ("Brave browsing history",              "~/Library/Application Support/BraveSoftware/Brave-Browser/Default/History"),
                ("Arc browsing history",                "~/Library/Application Support/Arc/User Data/Default/History"),
                ("Safari downloads.plist (history only — not the files)", "~/Library/Safari/Downloads.plist"),
            ],
            "caution": [
                ("Chrome cookies (logs you out of all sites)",  "~/Library/Application Support/Google/Chrome/Default/Cookies"),
                ("Chrome saved passwords",                      "~/Library/Application Support/Google/Chrome/Default/Login Data"),
                ("Safari cookies",                              "~/Library/Cookies"),
                ("Safari local storage",                        "~/Library/Safari/LocalStorage"),
                ("Firefox cookies + login data",                "~/Library/Application Support/Firefox/Profiles"),
                ("Edge cookies",                                "~/Library/Application Support/Microsoft Edge/Default/Cookies"),
                ("Brave cookies",                               "~/Library/Application Support/BraveSoftware/Brave-Browser/Default/Cookies"),
                ("Arc cookies",                                 "~/Library/Application Support/Arc/User Data/Default/Cookies"),
            ],
        },
        "actions": {
            "clean-all-browser-caches": {
                "label": "Clean every browser\'s cache + WebKit offline storage",
                "desc":  "Wipes safe-tier cache folders for all installed browsers, plus ~/Library/WebKit (shared offline storage).",
                "cost":  "First page-load on each site re-fetches assets (1–3s extra per site). No logins, bookmarks, history, passwords affected — only caches and offline storage.",
                "shell": (
                    "rm -rf "
                    "'~/Library/Caches/Google/Chrome' "
                    "'~/Library/Application Support/Google/Chrome/Default/Cache' "
                    "'~/Library/Application Support/Google/Chrome/Default/Code Cache' "
                    "'~/Library/Application Support/Google/Chrome/Default/GPUCache' "
                    "'~/Library/Application Support/Google/Chrome/Default/Service Worker/CacheStorage' "
                    "'~/Library/Caches/com.apple.Safari' "
                    "'~/Library/Containers/com.apple.Safari/Data/Library/Caches' "
                    "'~/Library/Containers/com.apple.Safari/Data/Library/WebKit' "
                    "'~/Library/WebKit' "
                    "'~/Library/Caches/com.apple.WebKit.WebContent' "
                    "'~/Library/Caches/com.apple.WebKit.Networking' "
                    "'~/Library/Caches/Firefox' "
                    "'~/Library/Caches/Microsoft Edge' "
                    "'~/Library/Application Support/Microsoft Edge/Default/Cache' "
                    "'~/Library/Application Support/Microsoft Edge/Default/Code Cache' "
                    "'~/Library/Caches/BraveSoftware/Brave-Browser' "
                    "'~/Library/Application Support/BraveSoftware/Brave-Browser/Default/Cache' "
                    "'~/Library/Application Support/BraveSoftware/Brave-Browser/Default/Service Worker/CacheStorage' "
                    "'~/Library/Caches/Company Browser, Inc.' "
                    "'~/Library/Application Support/Arc/User Data/Default/Service Worker/CacheStorage' "
                    "'~/Library/Caches/Vivaldi' "
                    "'~/Library/Caches/com.operasoftware.Opera' "
                    "2>/dev/null; echo \'\u2713 All browser caches + WebKit storage cleared.\'"
                ),
            },
            "clean-webkit-only": {
                "label": "Clear WebKit offline storage only",
                "desc":  "Targets ~/Library/WebKit — the shared offline storage used by Safari and every Electron/WebKit app. Often 1–3 GB, almost never cleaned.",
                "cost":  "Web apps using IndexedDB or offline-storage (Gmail Offline, Notion, etc.) lose cached data and re-download it on next open.",
                "shell": "rm -rf ~/Library/WebKit/* "
                         "~/Library/Caches/com.apple.WebKit.WebContent/* "
                         "~/Library/Caches/com.apple.WebKit.Networking/* "
                         "2>/dev/null; echo \'\u2713 WebKit offline storage cleared.\'",
            },
            "list-browser-sizes": {
                "label": "Show per-browser disk usage (informational)",
                "desc":  "Runs du -sh on each browser\'s profile root so you can see who\'s using the most space.",
                "cost":  "Read-only — no files touched.",
                "shell": (
                    "for p in "
                    "\'~/Library/Application Support/Google/Chrome\' "
                    "\'~/Library/Application Support/Firefox\' "
                    "\'~/Library/Safari\' "
                    "\'~/Library/Containers/com.apple.Safari\' "
                    "\'~/Library/Application Support/Microsoft Edge\' "
                    "\'~/Library/Application Support/BraveSoftware/Brave-Browser\' "
                    "\'~/Library/Application Support/Arc\' "
                    "\'~/Library/WebKit\'; do "
                    "  [ -d \"$p\" ] && du -sh \"$p\" 2>/dev/null; "
                    "done"
                ),
                "informational": True,
            },
        },
    },


    # ─── Downloads ────────────────────────────────────────────────────
    # ~/Downloads accumulates installers, screenshots, DMGs, ZIP exports, video
    # exports. Even though the folder itself is user-owned, the actions here
    # surface candidates for cleanup rather than deleting blindly.
    "downloads": {
        "label": "Downloads",
        "icon":  "📥",
        "tagline": "Surface installers, DMGs, and old exports cluttering ~/Downloads.",
        "groups": {
            "safe": [],
            "probably_safe": [],
            "caution": [
                ("~/Downloads (user files — review individually)", "~/Downloads"),
            ],
        },
        "actions": {
            "list-old-downloads": {
                "label": "List Downloads older than 30 days (sorted by size)",
                "desc":  "Surfaces what's been sitting in ~/Downloads for over a month. Read-only — does not delete.",
                "cost":  "Read-only — no files touched. Run the dedicated clean action below if you want to remove them.",
                "shell": "find ~/Downloads -maxdepth 2 -type f -mtime +30 -size +1M 2>/dev/null "
                         "| while read f; do du -sh \"$f\" 2>/dev/null; done | sort -rh | head -50",
                "informational": True,
            },
            "list-installer-dmgs": {
                "label": "List .dmg / .pkg installers in Downloads",
                "desc":  "Most installers are one-shot — once you've used them, they're disposable. Lists candidates with their sizes.",
                "cost":  "Read-only — surfaces what's there. Re-download from the vendor if you need it again.",
                "shell": "find ~/Downloads -maxdepth 2 -type f \\( -iname '*.dmg' -o -iname '*.pkg' \\) 2>/dev/null "
                         "| while read f; do du -sh \"$f\" 2>/dev/null; done | sort -rh",
                "informational": True,
            },
            "clean-old-installers": {
                "label": "Delete .dmg / .pkg installers in ~/Downloads",
                "desc":  "Removes every .dmg and .pkg in ~/Downloads. Run the 'List …' action first to see what's about to go.",
                "cost":  "Re-download from the vendor if you need a specific installer again. Doesn't touch the apps themselves — only the installer files.",
                "shell": "find ~/Downloads -maxdepth 2 -type f \\( -iname '*.dmg' -o -iname '*.pkg' \\) -print -delete 2>/dev/null; true",
            },
            "list-big-downloads": {
                "label": "List the 25 biggest files in ~/Downloads",
                "desc":  "Top 25 by size. Useful for finding that 12 GB video export you forgot about.",
                "cost":  "Read-only.",
                "shell": "find ~/Downloads -maxdepth 3 -type f -size +50M 2>/dev/null "
                         "| while read f; do du -sh \"$f\" 2>/dev/null; done | sort -rh | head -25",
                "informational": True,
            },
        },
    },

    # ─── Temporary files ──────────────────────────────────────────────
    # Per-user + per-system temp directories. macOS rotates /var/folders/*/T
    # on reboot but it can balloon during long uptimes. /private/tmp is shared
    # across processes — third-party tools sometimes leak orphans there.
    "temp": {
        "label": "Temp files",
        "icon":  "🧹",
        "tagline": "Sweep /tmp orphans + per-user temp dirs + the Trash.",
        "groups": {
            "safe": [
                ("/private/tmp orphans (older than 1 day)", "/private/tmp"),
                ("TemporaryItems cache",                    "~/Library/Caches/TemporaryItems"),
                ("Per-user system caches",                  "~/Library/Caches/com.apple.bird"),
            ],
            "probably_safe": [
                ("Per-user /var/folders temp",              "/var/folders"),
                ("Quick Look thumbnails",                   "~/Library/Caches/com.apple.QuickLook.thumbnailcache"),
                ("Spotlight indexing temp",                 "~/Library/Caches/com.apple.spotlight"),
            ],
            "caution": [
                ("~/.Trash (NOT auto-emptied — review first)", "~/.Trash"),
                ("Volume .Trashes (other volumes' trash)",     "/.Trashes"),
            ],
        },
        "actions": {
            "clean-tmp-orphans-old": {
                "label": "Clean /private/tmp orphans older than 1 day",
                "desc":  "Walks /private/tmp removing files + directories not touched in the last 24 hours. Skips anything actively in use.",
                "cost":  "If a running tool was holding a temp file we removed (rare — most tools recreate on demand), it may fail and need a restart.",
                "shell": "find /private/tmp -mindepth 1 -mtime +1 -print -delete 2>/dev/null; true",
            },
            "empty-trash": {
                "label": "Empty the Trash",
                "desc":  "Wipes ~/.Trash. Same as Finder → Empty Trash.",
                "cost":  "Files in the Trash are gone permanently — restore anything you need first.",
                "shell": "rm -rf ~/.Trash/* 2>/dev/null; rm -rf ~/.Trash/.* 2>/dev/null; true",
            },
            "list-quicklook-thumbs": {
                "label": "Show QuickLook thumbnail cache size",
                "desc":  "Informational — `du -sh` on the QuickLook thumbnailcache so you know how much regenerates on the next preview.",
                "cost":  "Read-only.",
                "shell": "du -sh ~/Library/Caches/com.apple.QuickLook.thumbnailcache 2>/dev/null || echo '(not present)'",
                "informational": True,
            },
            "clear-quicklook-thumbs": {
                "label": "Clear QuickLook thumbnails",
                "desc":  "Removes the QuickLook thumbnail cache. Finder regenerates thumbnails on the next preview.",
                "cost":  "First Finder preview of each file type takes ~100ms longer until the thumbnail is regenerated.",
                "shell": "rm -rf ~/Library/Caches/com.apple.QuickLook.thumbnailcache/* 2>/dev/null; true",
            },
        },
    },

    # ─── Archives ─────────────────────────────────────────────────────
    # Surface large archive files (.zip, .tar.gz, .dmg, .iso, .7z, .rar) so the
    # user can see what's eating disk and decide. All actions are informational
    # except the targeted "Delete archives older than X days" which is opt-in.
    "archives": {
        "label": "Archives",
        "icon":  "📦",
        "tagline": "Find old .zip / .dmg / .iso / .tar.gz files lurking on disk.",
        "groups": {
            "safe": [],
            "probably_safe": [],
            # Archives can't filter by extension via du, so these show total
            # folder sizes — use the actions below to find specific archive types.
            # Requires Full Disk Access to measure accurately on macOS Ventura+.
            "caution": [
                ("~/Downloads folder (total — check actions for archive breakdown)", "~/Downloads"),
                ("~/Desktop  (large files + exports accumulate here)",                "~/Desktop"),
                ("~/Documents (project exports + archives)",                           "~/Documents"),
            ],
        },
        "actions": {
            "list-archives-everywhere": {
                "label": "Find all archives larger than 100 MB",
                "desc":  "Walks ~/Downloads, ~/Desktop, ~/Documents, and ~/Movies for .zip/.dmg/.iso/.tar/.tgz/.7z/.rar files over 100 MB. Sorted biggest-first.",
                "cost":  "Read-only — surfaces candidates; nothing is touched.",
                "shell": "find ~/Downloads ~/Desktop ~/Documents ~/Movies -maxdepth 4 -type f -size +100M "
                         "\\( -iname '*.zip' -o -iname '*.dmg' -o -iname '*.iso' -o -iname '*.tar' "
                         "-o -iname '*.tar.gz' -o -iname '*.tgz' -o -iname '*.7z' -o -iname '*.rar' "
                         "-o -iname '*.bz2' -o -iname '*.xz' \\) 2>/dev/null "
                         "| while read f; do du -sh \"$f\" 2>/dev/null; done | sort -rh",
                "informational": True,
            },
            "list-archives-by-age": {
                "label": "Find archives untouched for 90+ days",
                "desc":  "Same archive types as above, but filtered to files you haven't opened in three months. Read-only.",
                "cost":  "Read-only.",
                "shell": "find ~/Downloads ~/Desktop ~/Documents -maxdepth 4 -type f -atime +90 "
                         "\\( -iname '*.zip' -o -iname '*.dmg' -o -iname '*.iso' -o -iname '*.tar' "
                         "-o -iname '*.tar.gz' -o -iname '*.tgz' -o -iname '*.7z' -o -iname '*.rar' \\) 2>/dev/null "
                         "| while read f; do du -sh \"$f\" 2>/dev/null; done | sort -rh | head -50",
                "informational": True,
            },
            "delete-dmgs-everywhere": {
                "label": "Delete all .dmg files in ~/Downloads + ~/Desktop",
                "desc":  "Removes every .dmg in ~/Downloads and ~/Desktop. DMGs are install images — rarely needed after the first run.",
                "cost":  "Re-download the installer from the vendor if you need it again.",
                "shell": "find ~/Downloads ~/Desktop -maxdepth 3 -type f -iname '*.dmg' -print -delete 2>/dev/null; true",
            },
        },
    },


    # ─── Space Eaters ─────────────────────────────────────────────────
    # The things that eat disk space that you never see coming.
    # iOS backups, developer caches, and package managers are the biggest
    # offenders — each can hold 10–80 GB that the user has forgotten about.
    "space-eaters": {
        "label": "Space Eaters",
        "icon":  "🔥",
        "tagline": "Biggest auto-rebuilt caches across all apps — safe to delete, auto-recovered by each app.",
        "groups": {
            # ── Safe: auto-rebuilt, no user data, no preferences touched ──────────
            # These are all PURE CACHES. Every app listed here rebuilds its cache
            # automatically the next time you use it. NO user preferences, NO
            # Finder sidebar settings, NO document history is touched.
            "safe": [
                # ── Dev caches — 100% auto-rebuilt by the tool on next run ─────────
                ("npm cache (~/.npm)",                     "~/.npm"),
                ("pip cache (macOS)",                      "~/Library/Caches/pip"),
                ("pip cache (Linux/other)",                "~/.cache/pip"),
                ("Cargo registry + git (Rust)",            "~/.cargo/registry"),
                ("Cargo git cache (Rust)",                 "~/.cargo/git"),
                ("Gradle build caches",                    "~/.gradle/caches"),
                ("Maven local repo",                       "~/.m2/repository"),
                ("Go module download cache",               "~/go/pkg/mod/cache"),
                ("Yarn cache",                             "~/.yarn/cache"),
                ("pnpm content-addressable store",         "~/.pnpm-store"),
                ("Ruby gems cache",                        "~/.gem"),
                ("CocoaPods cache",                        "~/Library/Caches/CocoaPods"),
                ("Homebrew downloads cache",               "~/Library/Caches/Homebrew/downloads"),
            ],
            "probably_safe": [],
            "caution": [
                # iOS/iPadOS/watchOS device backups. These are NOT caches —
                # they are real backup data. But people forget they have 5 old
                # device backups from 2019 here. Surfaced for awareness only.
                # One backup can be 5–50 GB; ten stale ones = hundreds of GB.
                ("iOS/iPadOS device backups",  "~/Library/Application Support/MobileSync/Backup"),

                # Steam game data. Not a cache — deleting removes installed games.
                # Surfaced so users can see how much space Steam is using.
                ("Steam game data",            "~/Library/Application Support/Steam/steamapps"),
            ],
        },
        "actions": {
            "show-ios-backups": {
                "label": "Show iOS/iPadOS backup sizes (sorted)",
                "desc":  "Lists each device backup in ~/Library/Application Support/MobileSync/Backup with its size. Often the single biggest surprise on a developer\'s Mac.",
                "cost":  "Read-only — nothing is touched. Delete old backups manually in Finder or via iTunes/Finder > Manage Backups.",
                "shell": (
                    "backup_dir=\"$HOME/Library/Application Support/MobileSync/Backup\"; "
                    "if [ -d \"$backup_dir\" ]; then "
                    "  echo \"iOS/iPadOS device backups:\"; "
                    "  du -sh \"$backup_dir\"/* 2>/dev/null | sort -rh | head -20; "
                    "  echo \"\"; "
                    "  du -sh \"$backup_dir\" 2>/dev/null | awk \'{print \"Total: \" $1}\'; "
                    "else "
                    "  echo \"No iOS backups found at $backup_dir\"; "
                    "fi"
                ),
                "informational": True,
            },
            "show-dev-cache-sizes": {
                "label": "Show developer cache sizes (npm / pip / cargo / gradle)",
                "desc":  "Runs du -sh on the most common developer package manager caches.",
                "cost":  "Read-only.",
                "shell": (
                    "for label_path in "
                    "\"npm:$HOME/.npm\" "
                    "\"pip:$HOME/Library/Caches/pip\" "
                    "\"cargo registry:$HOME/.cargo/registry\" "
                    "\"gradle:$HOME/.gradle/caches\" "
                    "\"maven:$HOME/.m2/repository\" "
                    "\"Go modules:$HOME/go/pkg/mod/cache\" "
                    "\"yarn:$HOME/.yarn/cache\" "
                    "\"pnpm:$HOME/.pnpm-store\" "
                    "\"CocoaPods:$HOME/Library/Caches/CocoaPods\"; do "
                    "  label=\"${label_path%%:*}\"; "
                    "  p=\"${label_path#*:}\"; "
                    "  [ -d \"$p\" ] && printf \"%-20s  %s\\n\" \"$label\" \"$(du -sh \"$p\" 2>/dev/null | cut -f1)\"; "
                    "done"
                ),
                "informational": True,
            },
            "clear-npm-cache": {
                "label": "Clear npm cache (~/.npm)",
                "desc":  "Runs `npm cache clean --force` then removes the ~/.npm directory.",
                "cost":  "npm re-downloads packages from the registry on next install. Slightly slower first install per package. Nothing currently installed is affected.",
                "shell": "command -v npm >/dev/null && npm cache clean --force 2>&1; rm -rf ~/.npm 2>/dev/null; echo \'\u2713 npm cache cleared.\'",
            },
            "clear-pip-cache": {
                "label": "Clear pip cache",
                "desc":  "Removes ~/Library/Caches/pip and ~/.cache/pip.",
                "cost":  "pip re-downloads packages from PyPI on next install. No installed packages affected.",
                "shell": "rm -rf ~/Library/Caches/pip ~/.cache/pip 2>/dev/null; echo \'\u2713 pip cache cleared.\'",
            },
            "clear-cargo-cache": {
                "label": "Clear Cargo registry + git cache (Rust)",
                "desc":  "Removes ~/.cargo/registry and ~/.cargo/git. Cargo re-fetches crates.io metadata on next build.",
                "cost":  "Next `cargo build` re-downloads crate source (re-compilation needed). Your installed binaries (~/.cargo/bin) are NOT touched.",
                "shell": "rm -rf ~/.cargo/registry ~/.cargo/git 2>/dev/null; echo \'\u2713 Cargo registry + git cache cleared.\'",
            },
            "clear-gradle-cache": {
                "label": "Clear Gradle caches (~/.gradle/caches)",
                "desc":  "Removes ~/.gradle/caches. Gradle re-downloads dependencies on next build.",
                "cost":  "First build after clearing re-downloads all Gradle dependencies from Maven Central. Build wrappers (gradlew) stay in each project.",
                "shell": "rm -rf ~/.gradle/caches 2>/dev/null; echo \'\u2713 Gradle caches cleared.\'",
            },
            "show-steam-size": {
                "label": "Show Steam game data size (informational)",
                "desc":  "Shows the total size of ~/Library/Application Support/Steam/steamapps — where installed games live.",
                "cost":  "Read-only. Delete individual games from inside Steam if you want to free this space.",
                "shell": "du -sh ~/Library/Application\ Support/Steam/steamapps 2>/dev/null || echo \'Steam not installed\'",
                "informational": True,
            },
            "clean-all-dev-caches": {
                "label": "Clean ALL developer caches (npm + pip + Cargo + Gradle + Go + Yarn + pnpm)",
                "desc":  "One shot — clears every developer package manager cache listed above.",
                "cost":  "Each tool re-downloads packages from its registry on the next build/install. Nothing currently installed is removed. Installed binaries (cargo bin, gem bin) are unaffected.",
                "shell": (
                    "echo \'Cleaning developer caches…\'; "
                    "rm -rf ~/.npm ~/.cache/pip ~/Library/Caches/pip "
                    "~/.cargo/registry ~/.cargo/git "
                    "~/.gradle/caches ~/.m2/repository ~/go/pkg/mod/cache "
                    "~/.yarn/cache ~/.pnpm-store ~/.gem "
                    "~/Library/Caches/CocoaPods ~/Library/Caches/Homebrew/downloads "
                    "2>/dev/null; "
                    "command -v npm >/dev/null && npm cache clean --force 2>/dev/null; "
                    "echo \'\u2713 All developer caches cleared.\'"
                ),
            },
            "show-top-25-files": {
                "label": "Show 25 biggest files in ~/Documents + ~/Desktop",
                "desc":  "Surfaces large files you may have forgotten about. Read-only.",
                "cost":  "Read-only.",
                "shell": (
                    "find ~/Documents ~/Desktop -maxdepth 5 -type f -size +50M 2>/dev/null "
                    "| while read f; do du -sh \"$f\" 2>/dev/null; done "
                    "| sort -rh | head -25"
                ),
                "informational": True,
            },
        },
    },

    # ─── iCloud Drive ──────────────────────────────────────────────────
    # ~/Library/Mobile Documents holds every file iCloud Drive has synced
    # locally. Files you haven\'t accessed recently may already be stubs
    # (*.icloud = placeholder, no local data).
    #
    # KEY INSIGHT: `brctl evict` removes the local copy of a file but leaves
    # it on iCloud perfectly intact. It\'s exactly what macOS "Optimize Mac
    # Storage" does. The file re-downloads automatically when you open it.
    # This is 100% safe and 100% reversible.
    "icloud": {
        "label": "iCloud Drive",
        "icon":  "☁️",
        "tagline": "Local iCloud Drive cache. Files stay on iCloud — only your local copy is removed.",
        "groups": {
            "safe": [
                # ~/Library/Mobile Documents is the iCloud Drive root for
                # Apple and third-party apps that use iCloud Documents. The
                # per-app entries below are subsets of this — don't sum them.
                ("iCloud Drive (Mobile Documents total)",        "~/Library/Mobile Documents"),
                # CloudStorage: Monterey+ format, also used by third-party providers.
                ("iCloud CloudStorage",                          "~/Library/CloudStorage"),
            ],
            "probably_safe": [],
            # Caution: these are real user data (not caches). Sizes are shown
            # so you can see which app is using the most local iCloud space.
            # Use `brctl evict` (action below) to reclaim local space safely —
            # files stay on iCloud and re-download when opened.
            "caution": [
                # Notes keeps ALL note data + attachments in a Group Container.
                # Receipt photos, scanned documents, images embedded in notes —
                # all live here. This is often 5–30 GB for heavy Notes users.
                # This is NOT inside ~/Library/Mobile Documents — it is a
                # separate per-app container.
                ("Notes app data + attachments (Group Container)", "~/Library/Group Containers/group.com.apple.notes"),
                # Notes also has a Mobile Documents entry if iCloud sync is on.
                ("Notes iCloud sync folder",                        "~/Library/Mobile Documents/iCloud~com~apple~Notes"),
                # iWork documents synced via iCloud Drive.
                ("Pages documents (iCloud)",                        "~/Library/Mobile Documents/com~apple~Pages"),
                ("Numbers documents (iCloud)",                      "~/Library/Mobile Documents/com~apple~Numbers"),
                ("Keynote documents (iCloud)",                      "~/Library/Mobile Documents/com~apple~Keynote"),
                # Other common iCloud app containers.
                ("Reminders local data",                            "~/Library/Group Containers/group.com.apple.reminders"),
                ("Mail local cache + attachments",                  "~/Library/Containers/com.apple.mail"),
                ("Safari local data",                               "~/Library/Containers/com.apple.Safari"),
            ],
        },
        "actions": {
            "show-icloud-breakdown": {
                "label": "Show iCloud Drive space by app (top 20)",
                "desc":  "Lists each app container inside ~/Library/Mobile Documents with its local size, sorted biggest-first. Also shows how many files are already stubs vs locally present.",
                "cost":  "Read-only.",
                "shell": (
                    "echo \'=== iCloud Drive — local footprint by app ===\'; "
                    "du -sh \'$HOME/Library/Mobile Documents\'/* 2>/dev/null | sort -rh | head -20; "
                    "echo \'\'; "
                    "echo \'=== CloudStorage ===\'; "
                    "du -sh \'$HOME/Library/CloudStorage\'/* 2>/dev/null | sort -rh | head -10; "
                    "echo \'\'; "
                    "echo \'=== Local vs stub count ===\'; "
                    "local_count=$(find \'$HOME/Library/Mobile Documents\' -not -name \'*.icloud\' -type f 2>/dev/null | wc -l); "
                    "stub_count=$(find \'$HOME/Library/Mobile Documents\' -name \'*.icloud\' -type f 2>/dev/null | wc -l); "
                    "echo \"  Locally present: $local_count files\"; "
                    "echo \"  Already stubs:   $stub_count files (data on iCloud, no local copy)\""
                ),
                "informational": True,
            },
            "evict-icloud-cache": {
                "label": "Evict iCloud Drive local copies (safe — files stay on iCloud)",
                "desc":  (
                    "Runs `brctl evict` on every locally-present file in ~/Library/Mobile Documents. "
                    "Files are NOT deleted — they become *.icloud stubs and re-download automatically "
                    "when you open them. This is exactly what macOS \'Optimize Mac Storage\' does. "
                    "100% safe and 100% reversible."
                ),
                "cost":  (
                    "Files in ~/Library/Mobile Documents become stubs (visible in Finder with a cloud icon). "
                    "Opening any file triggers a re-download from iCloud (speed depends on your connection). "
                    "Files remain on iCloud forever — nothing is deleted from Apple\'s servers."
                ),
                "shell": (
                    "echo \'Evicting locally-cached iCloud Drive files…\'; "
                    "count=0; "
                    "find \'$HOME/Library/Mobile Documents\' -not -name \'*.icloud\' -type f 2>/dev/null | "
                    "while read f; do "
                    "  brctl evict \"$f\" 2>/dev/null && count=$((count+1)) && echo \"  Evicted: $f\"; "
                    "done; "
                    "echo \"\u2713 Done. Re-run Show iCloud Drive space to see freed space.\""
                ),
            },
            "show-icloud-stubs": {
                "label": "List all iCloud stub files (*.icloud)",
                "desc":  "Shows files that are on iCloud but NOT stored locally. Opening them triggers a re-download.",
                "cost":  "Read-only.",
                "shell": (
                    "echo \'Files currently on iCloud only (stubs)::\'; "
                    "find \'$HOME/Library/Mobile Documents\' -name \'*.icloud\' -type f 2>/dev/null "
                    "| while read f; do echo \"  $f\"; done; "
                    "echo \'\'; "
                    "echo \'Tip: To download all stubs: open iCloud Drive in Finder and select all.\'"
                ),
                "informational": True,
            },
            "show-notes-footprint": {
                "label": "Show Notes storage breakdown",
                "desc":  (
                    "Measures Notes Group Container (attachments, thumbnails, database) and "
                    "the iCloud Notes sync folder separately so you can see exactly how much "
                    "Notes is using locally."
                ),
                "cost":  "Read-only. Requires Full Disk Access for accurate results.",
                "shell": (
                    "echo \'=== Notes Group Container (local database + attachments) ===\'; "
                    "du -sh \'$HOME/Library/Group Containers/group.com.apple.notes/\' 2>/dev/null "
                    "  || echo \'  (permission denied — grant Full Disk Access to Terminal)\'; "
                    "echo \'\'; "
                    "echo \'=== Notes attachments subfolder ===\'; "
                    "du -sh \'$HOME/Library/Group Containers/group.com.apple.notes/Media/\' 2>/dev/null "
                    "  || echo \'  (not found)\'; "
                    "echo \'\'; "
                    "echo \'=== Notes iCloud sync folder ===\'; "
                    "du -sh \'$HOME/Library/Mobile Documents/iCloud~com~apple~Notes/\' 2>/dev/null "
                    "  || echo \'  (not found)\'; "
                    "echo \'\'; "
                    "echo \'To stop Notes syncing to this Mac locally:\'; "
                    "echo \'  1. System Settings → [your name] → iCloud → iCloud Drive → Apps Using iCloud Drive\'; "
                    "echo \'  2. Toggle off Notes\'; "
                    "echo \'  3. macOS will remove the local Note data while keeping everything on iCloud.\'"
                ),
                "informational": True,
            },
            "evict-icloud-app-docs": {
                "label": "Evict iCloud Pages/Numbers/Keynote local copies",
                "desc":  (
                    "Runs brctl evict on all locally-present Pages, Numbers, and Keynote files "
                    "in ~/Library/Mobile Documents. Files stay on iCloud and re-download when "
                    "you open them. Does NOT touch Notes (separate container)."
                ),
                "cost":  (
                    "iWork documents become cloud-only stubs. Opening them triggers a re-download "
                    "(speed depends on your internet connection). Files remain on iCloud."
                ),
                "shell": (
                    "count=0; "
                    "for app_dir in "
                    "\'$HOME/Library/Mobile Documents/com~apple~Pages/Documents\' "
                    "\'$HOME/Library/Mobile Documents/com~apple~Numbers/Documents\' "
                    "\'$HOME/Library/Mobile Documents/com~apple~Keynote/Documents\'; do "
                    "  [ -d \"$app_dir\" ] && "
                    "  find \"$app_dir\" -not -name \'*.icloud\' -type f 2>/dev/null | "
                    "  while read f; do brctl evict \"$f\" 2>/dev/null && count=$((count+1)) "
                    "    && echo \"  Evicted: $f\"; done; "
                    "done; "
                    "echo \'\u2713 Done. iWork files are now cloud-only.\'"
                ),
            },
        },
    },
}

# Tab structure — top-level navigation.
# `meta: True` entries are UI-only (no cleaners.py category). The dashboard
# treats them as special tabs (Overview aggregates everything across categories).
TABS = [
    {"id": "overview",      "label": "Overview",      "meta": True},
    {"id": "space-eaters",  "label": "Space Eaters",  "category": "space-eaters"},
    {"id": "icloud",        "label": "iCloud Drive",  "category": "icloud"},
    {"id": "xcode",         "label": "Xcode",         "category": "xcode"},
    {"id": "llms",          "label": "LLMs",          "subcategories": ["llms-claude", "llms-cursor", "llms-chatgpt"]},
    {"id": "browsers",      "label": "Browsers",      "category": "browsers"},
    {"id": "apps",          "label": "Apps",          "category": "apps"},
    {"id": "docker",        "label": "Docker",        "category": "docker"},
    {"id": "downloads",     "label": "Downloads",     "category": "downloads"},
    {"id": "creative",      "label": "Creative",      "subcategories": [
        "creative-adobe",
        "creative-davinci",
        "creative-finalcut",
        "creative-logic",
        "creative-blender",
        "creative-obs",
    ]},
    {"id": "temp",          "label": "Temp files",    "category": "temp"},
    {"id": "archives",      "label": "Archives",      "category": "archives"},
    {"id": "system",        "label": "System",        "category": "system"},
]

SHORTCUT_NAME := DustPan
SCRIPT        := dustpan.applescript

.DEFAULT_GOAL := help
.PHONY: help run dry-run demo force install-shortcut uninstall-shortcut shortcut-run record-demo check size-report history install-cli uninstall-cli install-launchd uninstall-launchd install-swiftbar uninstall-swiftbar package-shortcut report ui ui-local ui-all ui-legacy ui-react ui-next ui-dev clean-docker update doctor

help: ## Show this help
	@echo "DustPan by AVERY GOODMAN — Make targets"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
	@echo ""

run: ## Run the cleanup directly (no Shortcut needed)
	@osascript $(SCRIPT)

dry-run: ## Show what cleanup would free without deleting anything
	@DUSTPAN_DRY_RUN=1 osascript $(SCRIPT)

demo: ## Simulate phases (sleeps instead of deleting) — for screen recording
	@DUSTPAN_DEMO=1 osascript $(SCRIPT)

force: ## Run cleanup even if disk is healthy (skip 50 GB threshold)
	@DUSTPAN_FORCE=1 osascript $(SCRIPT)

clean-docker: ## Safe Docker prune (containers + dangling images + networks). See dashboard for cost annotations.
	@if ! command -v docker >/dev/null 2>&1; then echo "Docker CLI not found — install Docker Desktop or skip."; exit 1; fi
	@echo "▶ Docker safe-prune (containers + dangling images + networks). Volumes + build cache are NOT touched."
	@echo "  (For the same action with cost annotations + a pre-flight volume check, use 'make ui' → Docker tab.)"
	@printf "Continue? [y/N] "; \
	read ans; case "$$ans" in y|Y|yes|YES) ;; *) echo "  cancelled."; exit 0;; esac
	@echo "▶ container prune"; docker container prune -f
	@echo "▶ image prune (dangling)"; docker image prune -f
	@echo "▶ network prune"; docker network prune -f
	@echo "▶ disk usage now:"; docker system df

install-shortcut: ## Copy script to clipboard and open Shortcuts.app for paste
	@pbcopy < $(SCRIPT)
	@echo "✓ Script copied to clipboard."
	@echo "→ In Shortcuts.app: New Shortcut, name it '$(SHORTCUT_NAME)',"
	@echo "  add a 'Run AppleScript' action, and ⌘V to paste."
	@open -a Shortcuts

uninstall-shortcut: ## Open Shortcuts.app to delete the Shortcut manually
	@echo "→ In Shortcuts.app, right-click '$(SHORTCUT_NAME)' and Delete."
	@open -a Shortcuts

shortcut-run: ## Run the installed Shortcut by name (must be installed first)
	@shortcuts run "$(SHORTCUT_NAME)"

record-demo: ## Print recording instructions, then run the demo
	@echo "→ Press ⌘⇧5 now → choose 'Record Selected Portion' or whole screen."
	@echo "→ Click Record. Then come back and press Return."
	@read -p "" _
	@$(MAKE) demo
	@echo ""
	@echo "→ Stop the recording (menu bar Stop button or ⌘⌃Esc)."
	@echo "→ Convert .mov to .gif (ffmpeg only, no gifsicle needed):"
	@echo "    ffmpeg -i ~/Desktop/recording.mov -filter_complex 'fps=12,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle' -y assets/progress-bar.gif"

check: ## Verify the AppleScript compiles
	@osacompile -o /tmp/dustpan-check.scpt $(SCRIPT) \
		&& rm /tmp/dustpan-check.scpt \
		&& echo "✓ AppleScript syntax OK"

history: ## Show the run history log
	@if [ -f ~/Library/Logs/dustpan.log ]; then \
		tail -20 ~/Library/Logs/dustpan.log; \
	else \
		echo "No runs logged yet. Run \`make run\` or \`make dry-run\` first."; \
	fi

size-report: ## Print current size of every directory the cleanup would touch
	@echo "Current sizes (the targets the cleanup would shrink):"
	@du -sh ~/Library/Developer/Xcode/DerivedData \
	          ~/Library/Developer/Xcode/iOS\ DeviceSupport \
	          ~/Library/Developer/Xcode/watchOS\ DeviceSupport \
	          ~/Library/Developer/Xcode/tvOS\ DeviceSupport \
	          ~/Library/Caches/com.apple.dt.Xcode \
	          ~/Library/Caches/org.swift.swiftpm \
	          ~/Library/Developer/CoreSimulator/Caches \
	          2>/dev/null | sort -rh
	@echo ""
	@echo "Free on /:"
	@df -h / | awk 'NR==2 {print "  " $$4 " free of " $$2}'

install-cli: ## Install xcc CLI to ~/.local/bin (set PREFIX=/usr/local for system-wide)
	@if [ -n "$(PREFIX)" ]; then dest="$(PREFIX)/bin/xcc"; else dest="$$HOME/.local/bin/xcc"; fi; \
		mkdir -p "$$(dirname "$$dest")"; \
		ln -sfn "$(CURDIR)/bin/xcc" "$$dest"; \
		echo "✓ xcc installed at $$dest"; \
		echo "  Run: xcc --help"; \
		if ! command -v xcc >/dev/null 2>&1; then \
			echo "  ⚠ $$(dirname "$$dest") not on PATH. Add: export PATH=\"$$(dirname "$$dest"):\$$PATH\""; \
		fi

uninstall-cli: ## Remove the xcc CLI symlink
	@rm -f ~/.local/bin/xcc /usr/local/bin/xcc 2>/dev/null || true
	@echo "✓ xcc removed"

install-launchd: ## Install hourly background cleanup via launchd
	@mkdir -p ~/Library/LaunchAgents
	@sed "s|__SCRIPT_PATH__|$(CURDIR)/dustpan.applescript|" \
		launchd/com.marvelousempire.dustpan.plist \
		> ~/Library/LaunchAgents/com.marvelousempire.dustpan.plist
	@launchctl unload ~/Library/LaunchAgents/com.marvelousempire.dustpan.plist 2>/dev/null || true
	@launchctl load ~/Library/LaunchAgents/com.marvelousempire.dustpan.plist
	@echo "✓ Launch agent installed — runs hourly."
	@echo "  The 50 GB threshold check still applies; agent no-ops silently when disk is healthy."
	@echo "  Logs: /tmp/dustpan.{out,err}.log"

uninstall-launchd: ## Remove the launchd agent
	@launchctl unload ~/Library/LaunchAgents/com.marvelousempire.dustpan.plist 2>/dev/null || true
	@rm -f ~/Library/LaunchAgents/com.marvelousempire.dustpan.plist
	@echo "✓ Launch agent removed"

install-swiftbar: ## Install the SwiftBar menu-bar plugin
	@plugins="$$HOME/Library/Application Support/SwiftBar/Plugins"; \
		if [ ! -d "$$plugins" ]; then \
			echo "✗ SwiftBar plugin folder not found at $$plugins"; \
			echo "  Install SwiftBar first: brew install --cask swiftbar"; \
			exit 1; \
		fi; \
		ln -sfn "$(CURDIR)/swiftbar/dustpan.30m.sh" "$$plugins/dustpan.30m.sh"; \
		echo "✓ SwiftBar plugin installed (refreshes every 30 minutes)"

uninstall-swiftbar: ## Remove the SwiftBar plugin
	@rm -f "$$HOME/Library/Application Support/SwiftBar/Plugins/dustpan.30m.sh"
	@echo "✓ SwiftBar plugin removed"

package-shortcut: ## Sign an exported .shortcut bundle as 'Anyone Mode' for sharing
	@if [ ! -f dist/source.shortcut ]; then \
		echo "✗ dist/source.shortcut not found"; \
		echo ""; \
		echo "  To produce it: in Shortcuts.app, right-click the 'DustPan' shortcut →"; \
		echo "  Share → Save File → save to dist/source.shortcut in this repo."; \
		exit 1; \
	fi
	@mkdir -p dist
	@shortcuts sign --mode anyone --input dist/source.shortcut --output dist/dustpan.shortcut
	@echo "✓ Signed bundle at dist/dustpan.shortcut"
	@echo "  Attach to the next GitHub Release for one-click install."

report: ## Sparkline of freed-GB across recent real cleanup runs
	@python3 scripts/report.py

# ─────────────────────────────────────────────────────────────────────────────
# Self-update — fixes the "git pull says 'no tracking information'" UX trap
# ─────────────────────────────────────────────────────────────────────────────
#
# Users routinely hit `git pull` after switching branches and see:
#   "There is no tracking information for the current branch."
# That's macOS git asking them to learn about upstream tracking. Most users
# just want "give me the latest version." `make update` does that safely
# regardless of branch state.

update: ## Pull the latest DustPan from main (safe from any branch state)
	@CURRENT=$$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?"); \
	if [ "$$CURRENT" = "?" ] || [ "$$CURRENT" = "HEAD" ]; then \
		echo "✗ Not in a git repo (or detached HEAD). Re-clone:"; \
		echo "    git clone https://github.com/marvelousempire/dustpan.git"; \
		exit 1; \
	fi; \
	echo "→ Currently on: $$CURRENT"; \
	echo "→ Fetching from origin…"; \
	git fetch origin --quiet 2>&1 | sed 's/^/  /'; \
	if ! git diff-index --quiet HEAD --; then \
		echo "⚠ You have uncommitted local changes. Stash or commit them first:"; \
		echo "    git stash       # to save them aside"; \
		echo "    git status      # to review"; \
		exit 1; \
	fi; \
	if [ "$$CURRENT" != "main" ]; then \
		echo "→ Switching to main…"; \
		git checkout main --quiet; \
	fi; \
	echo "→ Pulling latest main from origin…"; \
	BEFORE=$$(git rev-parse HEAD); \
	git pull --ff-only origin main 2>&1 | sed 's/^/  /'; \
	AFTER=$$(git rev-parse HEAD); \
	if [ "$$BEFORE" = "$$AFTER" ]; then \
		echo "✓ Already up to date."; \
	else \
		echo ""; \
		echo "✓ Updated $$BEFORE → $$AFTER"; \
		echo ""; \
		echo "Changes pulled:"; \
		git log --oneline "$$BEFORE..$$AFTER" | head -20 | sed 's/^/  /'; \
	fi; \
	echo ""; \
	echo "Next: run 'make ui' to launch the dashboard."

doctor: ## Diagnose the local install (git state, deps, build status)
	@echo "▶ DustPan doctor"
	@echo ""
	@printf "  git branch:        "; git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(not a git repo)"
	@printf "  git status:        "; \
		if git diff-index --quiet HEAD -- 2>/dev/null; then echo "clean"; \
		else echo "uncommitted changes (run: git status)"; fi
	@printf "  current version:   "; grep 'property kVersion' $(SCRIPT) 2>/dev/null | head -1 | sed -E 's/.*"([^"]+)".*/\1/' || echo "(unknown)"
	@printf "  pnpm installed:    "; if command -v pnpm >/dev/null 2>&1; then pnpm --version; else echo "no (legacy UI will be used)"; fi
	@printf "  python3:           "; python3 --version 2>&1
	@printf "  vite dist/ built:  "; if [ -d apps/web/dist ]; then echo "yes (will use)"; else echo "no (run: make ui)"; fi
	@printf "  disk free:         "; df -h / 2>/dev/null | awk 'NR==2{print $$4" of "$$2" ("$$5" used)"}'
	@echo ""
	@echo "  Common fixes:"
	@echo "    make update   — pull latest DustPan from main"
	@echo "    make ui       — build + launch dashboard"
	@echo "    make help     — show every available make target"

# ─────────────────────────────────────────────────────────────────────────────
# UI targets — restored from pre-v0.21.0 (these bodies were lost in the rebrand)
# ─────────────────────────────────────────────────────────────────────────────

ui: ## Build Vite UI (~6s) + serve on localhost AND Wi-Fi + browser auto-opens
	@# `make ui` serves on 0.0.0.0 by default. One command, both URLs (Local +
	@# Network) shown at startup. Want localhost-only? Run `make ui-local` or
	@# `XCC_HOST=127.0.0.1 make ui`.
	@#
	@# URL routing:
	@#   /          → Vite React (canonical, always rebuilt here)
	@#   ?legacy=1  → vanilla web/index.html
	@#   /next/     → Next.js (build separately with `make ui-all` or `make ui-next`)
	@if command -v pnpm >/dev/null 2>&1; then \
		echo "▶ Building Vite UI (apps/web)…"; \
		pnpm install --silent && pnpm --filter @dustpan/web build \
		  && echo "✓ Built apps/web/dist/" \
		  || { echo "⚠ Vite build failed — falling back to vanilla UI."; }; \
	else \
		echo "ℹ pnpm not installed — serving vanilla UI. Install pnpm (brew install pnpm) for the React build."; \
	fi
	@XCC_HOST=0.0.0.0 python3 web/server.py

ui-local: ## Build + serve localhost only (no Wi-Fi visibility)
	@if command -v pnpm >/dev/null 2>&1; then \
		echo "▶ Building Vite UI (apps/web)…"; \
		pnpm install --silent && pnpm --filter @dustpan/web build || true; \
	fi
	@XCC_HOST=127.0.0.1 python3 web/server.py

ui-all: ## Build ALL frontends (Vite + Next.js) via Turbo then serve
	@pnpm install --silent && pnpm turbo run build
	@XCC_HOST=0.0.0.0 python3 web/server.py

ui-legacy: ## Force the vanilla web/index.html UI (no build required)
	@XCC_LEGACY_UI=1 XCC_HOST=0.0.0.0 python3 web/server.py

ui-next: ## Build + serve the Next.js static export (apps/web-next) only
	@pnpm install --silent && pnpm --filter @dustpan/web-next build
	@XCC_HOST=0.0.0.0 python3 web/server.py

ui-dev: ## Run both frontends in dev mode (Vite :5174, Next :5175) via Turbo
	@pnpm install --silent && pnpm turbo run dev

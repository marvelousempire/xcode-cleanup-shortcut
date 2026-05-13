SHORTCUT_NAME := Xcode Cleanup
SCRIPT        := xcode-cleanup.applescript

.DEFAULT_GOAL := help
.PHONY: help run dry-run demo force install-shortcut uninstall-shortcut shortcut-run record-demo check size-report history install-cli uninstall-cli install-launchd uninstall-launchd install-swiftbar uninstall-swiftbar package-shortcut report ui ui-local ui-all ui-legacy ui-react ui-next ui-dev clean-docker

help: ## Show this help
	@echo "Xcode Cleanup Shortcut — Make targets"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
	@echo ""

run: ## Run the cleanup directly (no Shortcut needed)
	@osascript $(SCRIPT)

dry-run: ## Show what cleanup would free without deleting anything
	@XCODE_CLEANUP_DRY_RUN=1 osascript $(SCRIPT)

demo: ## Simulate phases (sleeps instead of deleting) — for screen recording
	@XCODE_CLEANUP_DEMO=1 osascript $(SCRIPT)

force: ## Run cleanup even if disk is healthy (skip 50 GB threshold)
	@XCODE_CLEANUP_FORCE=1 osascript $(SCRIPT)

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
	@osacompile -o /tmp/xcode-cleanup-check.scpt $(SCRIPT) \
		&& rm /tmp/xcode-cleanup-check.scpt \
		&& echo "✓ AppleScript syntax OK"

history: ## Show the run history log
	@if [ -f ~/Library/Logs/xcode-cleanup.log ]; then \
		tail -20 ~/Library/Logs/xcode-cleanup.log; \
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
	@sed "s|__SCRIPT_PATH__|$(CURDIR)/xcode-cleanup.applescript|" \
		launchd/com.marvelousempire.xcode-cleanup.plist \
		> ~/Library/LaunchAgents/com.marvelousempire.xcode-cleanup.plist
	@launchctl unload ~/Library/LaunchAgents/com.marvelousempire.xcode-cleanup.plist 2>/dev/null || true
	@launchctl load ~/Library/LaunchAgents/com.marvelousempire.xcode-cleanup.plist
	@echo "✓ Launch agent installed — runs hourly."
	@echo "  The 50 GB threshold check still applies; agent no-ops silently when disk is healthy."
	@echo "  Logs: /tmp/xcode-cleanup.{out,err}.log"

uninstall-launchd: ## Remove the launchd agent
	@launchctl unload ~/Library/LaunchAgents/com.marvelousempire.xcode-cleanup.plist 2>/dev/null || true
	@rm -f ~/Library/LaunchAgents/com.marvelousempire.xcode-cleanup.plist
	@echo "✓ Launch agent removed"

install-swiftbar: ## Install the SwiftBar menu-bar plugin
	@plugins="$$HOME/Library/Application Support/SwiftBar/Plugins"; \
		if [ ! -d "$$plugins" ]; then \
			echo "✗ SwiftBar plugin folder not found at $$plugins"; \
			echo "  Install SwiftBar first: brew install --cask swiftbar"; \
			exit 1; \
		fi; \
		ln -sfn "$(CURDIR)/swiftbar/xcode-cleanup.30m.sh" "$$plugins/xcode-cleanup.30m.sh"; \
		echo "✓ SwiftBar plugin installed (refreshes every 30 minutes)"

uninstall-swiftbar: ## Remove the SwiftBar plugin
	@rm -f "$$HOME/Library/Application Support/SwiftBar/Plugins/xcode-cleanup.30m.sh"
	@echo "✓ SwiftBar plugin removed"

package-shortcut: ## Sign an exported .shortcut bundle as 'Anyone Mode' for sharing
	@if [ ! -f dist/source.shortcut ]; then \
		echo "✗ dist/source.shortcut not found"; \
		echo ""; \
		echo "  To produce it: in Shortcuts.app, right-click the 'Xcode Cleanup' shortcut →"; \
		echo "  Share → Save File → save to dist/source.shortcut in this repo."; \
		exit 1; \
	fi
	@mkdir -p dist
	@shortcuts sign --mode anyone --input dist/source.shortcut --output dist/xcode-cleanup.shortcut
	@echo "✓ Signed bundle at dist/xcode-cleanup.shortcut"
	@echo "  Attach to the next GitHub Release for one-click install."

report: ## Sparkline of freed-GB across recent real cleanup runs
	@python3 scripts/report.py

ui: ## Build Vite UI (~6s) + serve on localhost AND Wi-Fi + browser auto-opens
	@# v0.19.1 — `make ui` now serves on 0.0.0.0 by default. One command,
	@# both URLs (Local + Network) shown at startup. Want localhost-only?
	@# Run `make ui-local` or `XCC_HOST=127.0.0.1 make ui`.
	@#
	@# URL routing:
	@#   /          → Vite React (canonical, always rebuilt here)
	@#   ?legacy=1  → vanilla web/index.html
	@#   /next/     → Next.js (build separately with `make ui-all` or `make ui-next`)
	@if command -v pnpm >/dev/null 2>&1; then \
		echo "▶ Building Vite UI (apps/web)…"; \
		pnpm install --silent && pnpm --filter @cleanup-hub/web build \
		  && echo "✓ Built apps/web/dist/" \
		  || { echo "⚠ Vite build failed — falling back to vanilla UI."; }; \
	else \
		echo "ℹ pnpm not installed — serving vanilla UI. Install pnpm to get the React build."; \
	fi
	@XCC_HOST=0.0.0.0 python3 web/server.py

ui-local: ## Build + serve localhost only (no Wi-Fi visibility)
	@if command -v pnpm >/dev/null 2>&1; then \
		echo "▶ Building Vite UI (apps/web)…"; \
		pnpm install --silent && pnpm --filter @cleanup-hub/web build || true; \
	fi
	@XCC_HOST=127.0.0.1 python3 web/server.py

ui-all: ## Build ALL frontends (Vite + Next.js) via Turbo then serve
	@pnpm install --silent && pnpm turbo run build
	@python3 web/server.py

ui-legacy: ## Force the vanilla web/index.html UI (no build required)
	@XCC_LEGACY_UI=1 python3 web/server.py

ui-next: ## Build + serve the Next.js static export (apps/web-next) only
	@pnpm install --silent && pnpm --filter @cleanup-hub/web-next build
	@python3 web/server.py

ui-dev: ## Run both frontends in dev mode (Vite :5174, Next :5175) via Turbo
	@pnpm install --silent && pnpm turbo run dev

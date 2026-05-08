SHORTCUT_NAME := Xcode Cleanup
SCRIPT        := xcode-cleanup.applescript

.DEFAULT_GOAL := help
.PHONY: help run dry-run demo force install-shortcut uninstall-shortcut shortcut-run record-demo check size-report

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

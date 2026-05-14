-- quick-rescue.applescript
-- ─────────────────────────────────────────────────────────────────────────────
-- Emergency cleanup with a native macOS progress bar — no Terminal output.
--
-- Runs the same 5 commands as the Emergency Rescue panel inside DustPan
-- (DerivedData, iOS DeviceSupport, mediaanalysisd, DocumentationIndex,
-- docker prune) one after another, updating the progress description after
-- each. Ends with a system notification showing total freed GB.
--
-- Bind to a global hotkey via Shortcuts.app for one-tap recovery when the
-- disk hits zero and you can't even open the DustPan UI.
--
-- Part of the DustPan AppleScript Library.
-- Documentation: applescripts/docs/0003-quick-rescue.md

on run
	-- Confirm first — `display alert` is the native way to ask "are you sure?"
	set confirmResult to display alert "DustPan — Quick Rescue" ¬
		message "About to run 5 disk cleanup commands:" & return & return & ¬
		"  1. Clear Xcode DerivedData" & return & ¬
		"  2. Clear Xcode iOS Device Debug Files" & return & ¬
		"  3. Clear macOS Photo Recognition Cache" & return & ¬
		"  4. Clear Xcode Documentation Index" & return & ¬
		"  5. Run Docker system prune (if Docker is installed)" & return & return & ¬
		"All of these rebuild automatically. The only cost is one slightly slower Xcode build the next time you build." ¬
		buttons {"Cancel", "Run Quick Rescue"} ¬
		default button "Run Quick Rescue" ¬
		cancel button "Cancel" ¬
		as warning

	if button returned of confirmResult is "Cancel" then return

	-- Capture before-disk so we can report freed GB at the end
	set freeBefore to my freeBytes()

	-- ── Native progress bar (Mac-style indeterminate, with phase updates) ──
	set progress total steps to 5
	set progress completed steps to 0
	set progress description to "DustPan Quick Rescue"
	set progress additional description to "Starting…"

	-- Phase 1
	set progress additional description to "① Clearing Xcode DerivedData…"
	do shell script "rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null; true"
	set progress completed steps to 1

	-- Phase 2
	set progress additional description to "② Clearing Xcode iOS Device Debug Files…"
	do shell script "rm -rf ~/Library/Developer/Xcode/'iOS DeviceSupport'/* 2>/dev/null; true"
	set progress completed steps to 2

	-- Phase 3
	set progress additional description to "③ Clearing macOS Photo Recognition Cache…"
	do shell script "rm -rf ~/Library/Containers/com.apple.mediaanalysisd/Data/Library/* 2>/dev/null; true"
	do shell script "rm -rf ~/Library/Containers/com.apple.mediaanalysisd/Data/tmp/* 2>/dev/null; true"
	set progress completed steps to 3

	-- Phase 4
	set progress additional description to "④ Clearing Xcode Documentation Index…"
	do shell script "rm -rf ~/Library/Developer/Xcode/DocumentationIndex/* 2>/dev/null; true"
	set progress completed steps to 4

	-- Phase 5 — Docker prune is gated on Docker actually being installed.
	set progress additional description to "⑤ Pruning Docker (if installed)…"
	try
		do shell script "command -v docker >/dev/null 2>&1 && docker system prune -f 2>&1 || true"
	end try
	set progress completed steps to 5

	-- ── Done — system notification with freed GB ──
	set freeAfter to my freeBytes()
	set freedGB to ((freeAfter - freeBefore) / (1024 * 1024 * 1024))
	if freedGB < 0 then set freedGB to 0
	set freedStr to my round1(freedGB) & " GB"

	-- Native notification (lives in Notification Center; honors Do Not Disturb)
	display notification "Freed " & freedStr & " of disk space. Tap to open DustPan." with title "DustPan — Quick Rescue done" subtitle freedStr & " recovered" sound name "Glass"

	-- Also show a confirmation alert in case the notification got swallowed by Do Not Disturb.
	set freeAfterPretty to do shell script "df -h / | awk 'NR==2{print $4}'"
	display alert "✅ Quick Rescue complete" ¬
		message "Freed " & freedStr & " of disk space." & return & return & ¬
		"You now have " & freeAfterPretty & " free on /." ¬
		buttons {"Done"} ¬
		default button "Done"
end run

-- ── Helpers ──────────────────────────────────────────────────────────────────

on freeBytes()
	-- Returns the free bytes on /, via df -k (KB) → bytes.
	set kbStr to do shell script "df -k / | awk 'NR==2{print $4}'"
	try
		return ((kbStr as integer) * 1024)
	on error
		return 0
	end try
end freeBytes

on round1(n)
	-- Round to 1 decimal place; AppleScript doesn't have a built-in.
	set n10 to (n * 10) as integer
	set wholePart to (n10 div 10) as text
	set decPart to (n10 mod 10) as text
	return wholePart & "." & decPart
end round1

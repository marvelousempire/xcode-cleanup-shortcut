-- quick-rescue-dry-run.applescript
-- ─────────────────────────────────────────────────────────────────────────────
-- The "what would I get back" version of quick-rescue.applescript. Same UX
-- shape — confirmation, native progress bar, completion alert — but every
-- phase only MEASURES the path with `du -sh`. Nothing is deleted.
--
-- Bind to a separate hotkey (e.g. ⌥⌘D for dry-run) so you can audit before
-- committing to the actual cleanup.
--
-- Part of the DustPan AppleScript Library.
-- Documentation: applescripts/docs/0005-quick-rescue-dry-run.md

on run
	set confirmResult to display alert "DustPan — Quick Rescue (Dry Run)" ¬
		message "About to MEASURE the size of 5 cleanup targets — nothing will be deleted." & return & return & ¬
		"  1. Xcode DerivedData" & return & ¬
		"  2. Xcode iOS Device Debug Files" & return & ¬
		"  3. macOS Photo Recognition Cache" & return & ¬
		"  4. Xcode Documentation Index" & return & ¬
		"  5. Docker images that 'docker system prune' would remove" & return & return & ¬
		"Use Quick Rescue (the non-dry-run) to actually free the space after you've reviewed the numbers." ¬
		buttons {"Cancel", "Measure"} ¬
		default button "Measure" ¬
		cancel button "Cancel"

	if button returned of confirmResult is "Cancel" then return

	set progress total steps to 5
	set progress completed steps to 0
	set progress description to "DustPan Quick Rescue — Dry Run"
	set progress additional description to "Starting…"

	-- Phase 1
	set progress additional description to "① Measuring Xcode DerivedData…"
	set s1 to my measure("~/Library/Developer/Xcode/DerivedData")
	set progress completed steps to 1

	-- Phase 2
	set progress additional description to "② Measuring Xcode iOS DeviceSupport…"
	set s2 to my measure("~/Library/Developer/Xcode/'iOS DeviceSupport'")
	set progress completed steps to 2

	-- Phase 3
	set progress additional description to "③ Measuring macOS Photo Recognition Cache…"
	set s3a to my measure("~/Library/Containers/com.apple.mediaanalysisd/Data/Library")
	set s3b to my measure("~/Library/Containers/com.apple.mediaanalysisd/Data/tmp")
	set progress completed steps to 3

	-- Phase 4
	set progress additional description to "④ Measuring Xcode Documentation Index…"
	set s4 to my measure("~/Library/Developer/Xcode/DocumentationIndex")
	set progress completed steps to 4

	-- Phase 5 — Docker dry-run (asks Docker, doesn't prune)
	set progress additional description to "⑤ Querying Docker (dry run)…"
	set dockerStr to "(Docker not installed)"
	try
		set dockerOutput to do shell script "command -v docker >/dev/null 2>&1 && docker system df --format '{{.Reclaimable}}' 2>/dev/null | head -1 || echo ''"
		if dockerOutput is not "" then set dockerStr to dockerOutput
	end try
	set progress completed steps to 5

	-- Build the summary
	set msg to "Nothing has been deleted." & return & return & ¬
		"① Xcode DerivedData:           " & s1 & return & ¬
		"② Xcode iOS DeviceSupport:     " & s2 & return & ¬
		"③ macOS Photo Cache (lib+tmp): " & s3a & " + " & s3b & return & ¬
		"④ Xcode Documentation Index:   " & s4 & return & ¬
		"⑤ Docker reclaimable:          " & dockerStr & return & return & ¬
		"Run Quick Rescue (the real one) to actually free this space."

	display alert "Quick Rescue — Dry Run complete" ¬
		message msg ¬
		buttons {"Done"} ¬
		default button "Done"
end run

-- ── Helpers ──────────────────────────────────────────────────────────────────

on measure(pathExpr)
	-- pathExpr is unexpanded with potential single-quotes (for paths with spaces).
	-- Use `du -sh` and capture just the size column.
	try
		set sizeStr to do shell script "du -sh " & pathExpr & " 2>/dev/null | cut -f1"
		if sizeStr is "" then return "0B (not present)"
		return sizeStr
	on error
		return "(unavailable)"
	end try
end measure

-- Xcode Cleanup v0.2
-- A Shortcut-friendly AppleScript that reclaims Xcode disk space with a
-- native progress bar, threshold-gated confirmation, and final notification.
--
-- Paste into a "Run AppleScript" action inside Shortcuts.app, or run directly:
--   osascript xcode-cleanup.applescript
--
-- Environment flags (set when invoking via osascript):
--   XCODE_CLEANUP_DRY_RUN=1   Measure what would be freed; delete nothing.
--   XCODE_CLEANUP_DEMO=1      Sleep instead of deleting (for screen recording).
--   XCODE_CLEANUP_FORCE=1     Skip the >50 GB free threshold check.

property kVersion : "0.2"

on run
	set dryRun to my isFlag("XCODE_CLEANUP_DRY_RUN")
	set demoMode to my isFlag("XCODE_CLEANUP_DEMO")
	set forceMode to my isFlag("XCODE_CLEANUP_FORCE")
	
	-- 1. Measure
	set beforeKB to my freeKB()
	set beforeGB to (beforeKB / 1024 / 1024)
	set freeNow to my freeHuman()
	
	-- 2. Threshold gate (skipped in dry/demo/force)
	if (not dryRun) and (not demoMode) and (not forceMode) and beforeGB > 50 then
		display notification "Plenty of space — " & freeNow & " free" with title "Xcode Cleanup" sound name "Tink"
		return "No action needed"
	end if
	
	-- 3. Confirm
	set body to "Run full Xcode cleanup? Frees DerivedData, iOS/watchOS/tvOS DeviceSupport, SwiftPM caches, unavailable simulators, and /tmp orphans."
	if dryRun then set body to "Dry run — measure what cleanup would free. No files deleted."
	if demoMode then set body to "Demo mode — simulate phases without touching files. For screen recording."
	
	set go to button returned of (display alert "Disk at " & freeNow & " free" ¬
		message body ¬
		buttons {"Cancel", "Run"} default button "Run")
	if go is "Cancel" then return "Cancelled"
	
	-- 4. Phases
	set titleSuffix to ""
	if dryRun then set titleSuffix to " (Dry Run)"
	if demoMode then set titleSuffix to " (Demo)"
	
	set progress description to "Xcode Cleanup" & titleSuffix
	set progress total steps to 4
	set progress completed steps to 0
	
	set measuredKB to 0
	
	set p1 to "~/Library/Developer/Xcode/DerivedData/* ~/Library/Developer/Xcode/iOS\\ DeviceSupport/* ~/Library/Developer/Xcode/watchOS\\ DeviceSupport/* ~/Library/Developer/Xcode/tvOS\\ DeviceSupport/* ~/Library/Caches/com.apple.dt.Xcode/*"
	set measuredKB to measuredKB + my doPhase("1/4 · DerivedData + DeviceSupport", p1, dryRun, demoMode)
	set progress completed steps to 1
	
	set p2 to "~/Library/Caches/org.swift.swiftpm/* ~/Library/org.swift.swiftpm/*"
	set measuredKB to measuredKB + my doPhase("2/4 · SwiftPM caches", p2, dryRun, demoMode)
	set progress completed steps to 2
	
	-- Phase 3 is special: simctl handles devices, we still measure caches.
	set progress additional description to "3/4 · Unavailable simulators"
	set p3Caches to "~/Library/Developer/CoreSimulator/Caches/*"
	set p3KB to my dirSizeKB(p3Caches)
	if demoMode then
		do shell script "sleep 1"
	else if not dryRun then
		do shell script "rm -rf " & p3Caches & " 2>/dev/null; xcrun simctl delete unavailable 2>/dev/null; true"
	end if
	set measuredKB to measuredKB + p3KB
	set progress completed steps to 3
	
	set p4 to "/private/tmp/redeplay-* /private/tmp/RedEPlay-* /private/tmp/sweep.mov.sb-* /private/tmp/sweep*_build.log /private/tmp/keen-euclid-*"
	set measuredKB to measuredKB + my doPhase("4/4 · /tmp orphans", p4, dryRun, demoMode)
	set progress completed steps to 4
	
	-- 5. Report
	if dryRun then
		set wouldGB to ((round ((measuredKB / 1024 / 1024) * 10)) / 10)
		display notification "Would free ~" & wouldGB & " GB" with title "Xcode Cleanup (Dry Run)" sound name "Tink"
		return "Dry run: would free ~" & wouldGB & " GB"
	else if demoMode then
		display notification "Demo complete — no files touched" with title "Xcode Cleanup (Demo)" sound name "Tink"
		return "Demo complete"
	else
		set afterKB to my freeKB()
		set freedGB to ((afterKB - beforeKB) / 1024 / 1024)
		set freedRounded to ((round (freedGB * 10)) / 10)
		set newFree to my freeHuman()
		display notification "Freed " & freedRounded & " GB · " & newFree & " free" with title "Xcode Cleanup" sound name "Glass"
		return "Freed " & freedRounded & " GB"
	end if
end run

on isFlag(envName)
	try
		set v to system attribute envName
		return (v is "1") or (v is "true") or (v is "yes")
	on error
		return false
	end try
end isFlag

on freeKB()
	return (do shell script "df -k / | awk 'NR==2 {print $4}'") as integer
end freeKB

on freeHuman()
	return do shell script "df -h / | awk 'NR==2 {print $4}'"
end freeHuman

on dirSizeKB(paths)
	try
		return (do shell script "du -sk " & paths & " 2>/dev/null | awk '{s+=$1} END {print s+0}'") as integer
	on error
		return 0
	end try
end dirSizeKB

on doPhase(label, paths, dryRun, demoMode)
	set progress additional description to label
	set sizeKB to my dirSizeKB(paths)
	if demoMode then
		do shell script "sleep 1"
	else if not dryRun then
		do shell script "rm -rf " & paths & " 2>/dev/null; true"
	end if
	return sizeKB
end doPhase

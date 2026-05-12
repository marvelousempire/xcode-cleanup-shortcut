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
--   XCODE_CLEANUP_AUTO_CONFIRM=1  Skip the confirmation alert (for scripted recording).
--   XCODE_CLEANUP_TMP_PATTERNS=...  Override /tmp orphan globs. Empty string skips phase 4.
--   XCODE_CLEANUP_NO_UPDATE_CHECK=1  Skip the daily GitHub release check.

property kVersion : "0.17.1"

-- Default /private/tmp orphan patterns. These are example patterns from
-- the maintainer's project (Red-E Play); other users should override via
-- the XCODE_CLEANUP_TMP_PATTERNS environment variable, or fork and edit.
-- Set to empty string to skip phase 4 entirely.
property kDefaultTmpPatterns : "/private/tmp/redeplay-* /private/tmp/RedEPlay-* /private/tmp/sweep.mov.sb-* /private/tmp/sweep*_build.log /private/tmp/keen-euclid-*"

-- Run history log
property kHistoryLog : "~/Library/Logs/xcode-cleanup.log"

-- CSV log for analytics (consumed by scripts/report.py)
property kCsvLog : "~/Library/Logs/xcode-cleanup-history.csv"

-- GitHub repo for the update check
property kRepo : "marvelousempire/xcode-cleanup-shortcut"
property kVersionCache : "~/Library/Caches/xcode-cleanup-version-cache"

on run
	set dryRun to my isFlag("XCODE_CLEANUP_DRY_RUN")
	set demoMode to my isFlag("XCODE_CLEANUP_DEMO")
	set forceMode to my isFlag("XCODE_CLEANUP_FORCE")
	set autoConfirm to my isFlag("XCODE_CLEANUP_AUTO_CONFIRM")
	
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
	
	if not autoConfirm then
		set go to button returned of (display alert "Disk at " & freeNow & " free" ¬
			message body ¬
			buttons {"Cancel", "Run"} default button "Run")
		if go is "Cancel" then return "Cancelled"
	end if
	
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
		display notification "3/4 · Unavailable simulators" with title "Xcode Cleanup (Demo)"
		do shell script "sleep 1"
	else if not dryRun then
		do shell script "rm -rf " & p3Caches & " 2>/dev/null; xcrun simctl delete unavailable 2>/dev/null; true"
	end if
	set measuredKB to measuredKB + p3KB
	set progress completed steps to 3
	
	set p4 to my readPatterns()
	if p4 is not "" then
		set measuredKB to measuredKB + my doPhase("4/4 · /tmp orphans", p4, dryRun, demoMode)
	else
		set progress additional description to "4/4 · /tmp orphans (skipped)"
	end if
	set progress completed steps to 4
	
	-- 5. Report
	if dryRun then
		set wouldGB to ((round ((measuredKB / 1024 / 1024) * 10)) / 10)
		display notification "Would free ~" & wouldGB & " GB" with title "Xcode Cleanup (Dry Run)" sound name "Tink"
		my logRun("dry-run", wouldGB, ((round (beforeGB * 10)) / 10), ((round (beforeGB * 10)) / 10))
		return "Dry run: would free ~" & wouldGB & " GB"
	else if demoMode then
		display notification "Demo complete — no files touched" with title "Xcode Cleanup (Demo)" sound name "Tink"
		my logRun("demo", 0, ((round (beforeGB * 10)) / 10), ((round (beforeGB * 10)) / 10))
		return "Demo complete"
	else
		set afterKB to my freeKB()
		set afterGB to (afterKB / 1024 / 1024)
		set freedGB to ((afterKB - beforeKB) / 1024 / 1024)
		set freedRounded to ((round (freedGB * 10)) / 10)
		set newFree to my freeHuman()
		display notification "Freed " & freedRounded & " GB · " & newFree & " free" with title "Xcode Cleanup" sound name "Glass"
		my logRun("real", freedRounded, ((round (beforeGB * 10)) / 10), ((round (afterGB * 10)) / 10))
		my checkForUpdate()
		return "Freed " & freedRounded & " GB"
	end if
end run

on readPatterns()
	try
		set v to system attribute "XCODE_CLEANUP_TMP_PATTERNS"
		if v is not "" then return v
	on error
	end try
	return kDefaultTmpPatterns
end readPatterns

on logRun(mode, freedOrMeasuredGB, beforeGB, afterGB)
	try
		set ts to do shell script "date '+%Y-%m-%d %H:%M:%S'"
		set logLine to ts & " | mode: " & mode & " | freed: " & freedOrMeasuredGB & " GB | before: " & beforeGB & " GB | after: " & afterGB & " GB"
		do shell script "mkdir -p \"$(dirname " & kHistoryLog & ")\" && echo " & quoted form of logLine & " >> " & kHistoryLog
		set csvLine to ts & "," & mode & "," & freedOrMeasuredGB & "," & beforeGB & "," & afterGB
		do shell script "echo " & quoted form of csvLine & " >> " & kCsvLog
	on error
	end try
end logRun

on checkForUpdate()
	-- Skipped if user opted out
	if my isFlag("XCODE_CLEANUP_NO_UPDATE_CHECK") then return
	
	-- Use a 24h cache so we don't hammer the GitHub API
	set shouldFetch to true
	try
		do shell script "[ -f " & kVersionCache & " ] && find " & kVersionCache & " -mtime -1 | grep -q . && exit 0 || exit 1"
		set shouldFetch to false
	on error
	end try
	
	if shouldFetch then
		try
			do shell script "mkdir -p \"$(dirname " & kVersionCache & ")\""
			set latest to do shell script "curl -fsSL --max-time 3 'https://api.github.com/repos/" & kRepo & "/releases/latest' 2>/dev/null | awk -F'\"' '/tag_name/{print $4; exit}'"
			if latest is not "" then
				do shell script "echo " & quoted form of latest & " > " & kVersionCache
			end if
		on error
			return
		end try
	end if
	
	try
		set latest to do shell script "cat " & kVersionCache
		if latest is not "" and latest is not ("v" & kVersion) then
			display notification (latest & " available · github.com/" & kRepo & "/releases") with title "Xcode Cleanup update"
		end if
	on error
	end try
end checkForUpdate

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
		display notification label with title "Xcode Cleanup (Demo)"
		do shell script "sleep 1"
	else if not dryRun then
		do shell script "rm -rf " & paths & " 2>/dev/null; true"
	end if
	return sizeKB
end doPhase

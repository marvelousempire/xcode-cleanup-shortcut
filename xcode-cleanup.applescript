-- Xcode Cleanup
-- A Shortcut-friendly AppleScript that reclaims Xcode disk space with a
-- native progress bar, threshold-gated confirmation, and final notification.
--
-- Paste into a "Run AppleScript" action inside Shortcuts.app.

on run
	-- 1. Measure free space
	set beforeKB to (do shell script "df -k / | awk 'NR==2 {print $4}'") as integer
	set beforeGB to beforeKB / 1024 / 1024
	set freeNow to do shell script "df -h / | awk 'NR==2 {print $4}'"
	
	-- 2. Bail if you don't actually need it
	if beforeGB > 50 then
		display notification "Plenty of space — " & freeNow & " free" with title "Xcode Cleanup" sound name "Tink"
		return "No action needed"
	end if
	
	-- 3. Confirm
	set go to button returned of (display alert "Disk at " & freeNow & " free" ¬
		message "Run full Xcode cleanup? Frees DerivedData, iOS/watchOS/tvOS DeviceSupport, SwiftPM caches, unavailable simulators, and /tmp orphans." ¬
		buttons {"Cancel", "Run"} default button "Run")
	if go is "Cancel" then return "Cancelled"
	
	-- 4. Cleanup with progress
	set progress description to "Xcode Cleanup"
	set progress total steps to 4
	set progress completed steps to 0
	
	set progress additional description to "1/4 · DerivedData + DeviceSupport"
	do shell script "rm -rf ~/Library/Developer/Xcode/DerivedData/* ~/Library/Developer/Xcode/iOS\\ DeviceSupport/* ~/Library/Developer/Xcode/watchOS\\ DeviceSupport/* ~/Library/Developer/Xcode/tvOS\\ DeviceSupport/* ~/Library/Caches/com.apple.dt.Xcode/* 2>/dev/null; true"
	set progress completed steps to 1
	
	set progress additional description to "2/4 · SwiftPM caches"
	do shell script "rm -rf ~/Library/Caches/org.swift.swiftpm/* ~/Library/org.swift.swiftpm/* 2>/dev/null; true"
	set progress completed steps to 2
	
	set progress additional description to "3/4 · Unavailable simulators"
	do shell script "rm -rf ~/Library/Developer/CoreSimulator/Caches/* 2>/dev/null; xcrun simctl delete unavailable 2>/dev/null; true"
	set progress completed steps to 3
	
	set progress additional description to "4/4 · /tmp orphans"
	do shell script "rm -rf /private/tmp/redeplay-* /private/tmp/RedEPlay-* /private/tmp/sweep.mov.sb-* /private/tmp/sweep*_build.log /private/tmp/keen-euclid-* 2>/dev/null; true"
	set progress completed steps to 4
	
	-- 5. Report
	set afterKB to (do shell script "df -k / | awk 'NR==2 {print $4}'") as integer
	set freedGB to ((afterKB - beforeKB) / 1024 / 1024)
	set freedRounded to ((round (freedGB * 10)) / 10)
	set newFree to do shell script "df -h / | awk 'NR==2 {print $4}'"
	
	display notification "Freed " & freedRounded & " GB · " & newFree & " free" with title "Xcode Cleanup" sound name "Glass"
	return "Freed " & freedRounded & " GB"
end run

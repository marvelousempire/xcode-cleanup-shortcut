-- show-disk-status.applescript
-- ─────────────────────────────────────────────────────────────────────────────
-- Native macOS dialog showing current disk status. No Terminal output — uses
-- `display dialog` with a formatted summary so it looks like a System Settings
-- pane, not a dev tool.
--
-- Designed to be bound to a global hotkey via Shortcuts.app or invoked from
-- the menu bar via SwiftBar / Stream Deck.
--
-- Part of the DustPan AppleScript Library.
-- Documentation: applescripts/docs/0002-show-disk-status.md

on run
	-- Measure the root volume with df -h /
	set diskInfo to do shell script "df -h / | awk 'NR==2{printf \"%s|%s|%s|%s\", $2, $3, $4, $5}'"

	set AppleScript's text item delimiters to "|"
	set diskParts to text items of diskInfo
	set diskTotal to item 1 of diskParts
	set diskUsed to item 2 of diskParts
	set diskFree to item 3 of diskParts
	set diskPct to item 4 of diskParts
	set AppleScript's text item delimiters to ""

	-- Pick an emoji + alert style based on how full the disk is.
	set pctNum to my parsePercent(diskPct)
	if pctNum ≥ 95 then
		set healthEmoji to "🚨"
		set healthLine to "Critical — disk almost full"
	else if pctNum ≥ 85 then
		set healthEmoji to "⚠️"
		set healthLine to "Running low"
	else if pctNum ≥ 70 then
		set healthEmoji to "🟡"
		set healthLine to "Getting full"
	else
		set healthEmoji to "✅"
		set healthLine to "Healthy"
	end if

	-- v0.27 enhancement: when the DustPan dashboard is running, fetch the doctor
	-- report and inline the top 3 quick-wins so the dialog tells you what to
	-- clean, not just how full the disk is.
	set quickWinsBlock to ""
	try
		set doctorJSON to do shell script "curl -s --max-time 2 http://127.0.0.1:8765/api/doctor"
		if doctorJSON is not "" and doctorJSON does not start with "<" then
			-- crude top-3 extraction without a JSON parser: pull the first three "label" / "size_gb" pairs
			set top3 to do shell script "echo " & quoted form of doctorJSON & " | /usr/bin/python3 -c 'import sys,json; d=json.loads(sys.stdin.read()); rows=d.get(\"quick_wins\",[])[:3]; print(\"\\n\".join(f\"  • {r[\\\"size_gb\\\"]:.1f} GB  {r[\\\"label\\\"]}\" for r in rows))' 2>/dev/null"
			if top3 is not "" then
				set quickWinsBlock to return & return & "Top reclaims (live from dashboard):" & return & top3
			end if
		end if
	end try

	set msgBody to healthEmoji & "  " & healthLine & return & return & ¬
		"Free:    " & diskFree & return & ¬
		"Used:    " & diskUsed & "  (" & diskPct & ")" & return & ¬
		"Total:   " & diskTotal & quickWinsBlock & return & return & ¬
		"Tap 'Open DustPan' to launch the cleanup dashboard, or 'Run Quick Rescue' to free space without opening the dashboard."

	set userChoice to display dialog msgBody ¬
		with title "DustPan — Disk Status" ¬
		buttons {"Done", "Run Quick Rescue", "Open DustPan"} ¬
		default button "Done" ¬
		with icon note

	if button returned of userChoice is "Open DustPan" then
		-- Try to open the running dashboard. If port 8765 is responding, open the URL;
		-- otherwise fall back to running `make ui` in the repo (if findable).
		try
			do shell script "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8765 | grep -q 200"
			do shell script "open http://127.0.0.1:8765"
		on error
			-- DustPan not running — open a notification telling the user to start it.
			display notification "DustPan dashboard isn't running. Open Terminal and run `make ui` from the repo folder." with title "DustPan" sound name "Funk"
		end try
	else if button returned of userChoice is "Run Quick Rescue" then
		-- Launch the quick-rescue script (lives next to this file)
		set scriptDir to my scriptFolder()
		set rescuePath to scriptDir & "quick-rescue.applescript"
		try
			do shell script "osascript " & quoted form of rescuePath & " &"
		on error errMsg
			display alert "Couldn't launch Quick Rescue" message errMsg as warning
		end try
	end if
end run

-- ── Helpers ──────────────────────────────────────────────────────────────────

on parsePercent(pctStr)
	-- "94%" → 94
	set AppleScript's text item delimiters to "%"
	set n to text item 1 of pctStr
	set AppleScript's text item delimiters to ""
	try
		return (n as integer)
	on error
		return 0
	end try
end parsePercent

on scriptFolder()
	-- Return the folder this script lives in, with trailing slash.
	tell application "Finder"
		set thisFile to (path to me) as alias
		set parentFolder to (container of thisFile) as alias
	end tell
	return POSIX path of parentFolder
end scriptFolder

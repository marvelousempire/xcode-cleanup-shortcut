-- show-locked-space.applescript
-- ─────────────────────────────────────────────────────────────────────────────
-- Scans for disk space locked by previous user accounts (Homebrew owned by an
-- old user, /Users/<oldname>/ leftovers, etc.) and presents the takeover
-- commands in a native dialog with [Copy to Clipboard] / [Done] buttons.
--
-- The same discovery as DustPan's Space Survey foreign-ownership scanner,
-- but standalone and one-tap. Useful when you don't want to open the full
-- dashboard just to find out if you have locked space.
--
-- Critically: this script NEVER runs sudo. It surfaces the command for you
-- to paste into Terminal — macOS prompts for your Mac password directly,
-- which is the correct consent gate for a permanent ownership change.
--
-- Part of the DustPan AppleScript Library.
-- Documentation: applescripts/docs/0004-show-locked-space.md

on run
	-- Scan known multi-user-cruft locations
	set scanScript to "
		ME=$(whoami);
		FINDINGS='';
		# /opt/homebrew
		if [ -d /opt/homebrew ]; then
			OWNER=$(stat -f '%Su' /opt/homebrew);
			if [ \"$OWNER\" != \"$ME\" ] && [ \"$OWNER\" != \"root\" ]; then
				SIZE=$(du -sh /opt/homebrew 2>/dev/null | cut -f1);
				FINDINGS=\"${FINDINGS}|/opt/homebrew (Homebrew installed by '$OWNER')|$SIZE|sudo chown -R \\$(whoami) /opt/homebrew\";
			fi;
		fi;
		# /usr/local/Homebrew (legacy)
		if [ -d /usr/local/Homebrew ]; then
			OWNER=$(stat -f '%Su' /usr/local/Homebrew);
			if [ \"$OWNER\" != \"$ME\" ] && [ \"$OWNER\" != \"root\" ]; then
				SIZE=$(du -sh /usr/local/Homebrew 2>/dev/null | cut -f1);
				FINDINGS=\"${FINDINGS}|/usr/local/Homebrew (legacy, owned by '$OWNER')|$SIZE|sudo chown -R \\$(whoami) /usr/local/Homebrew\";
			fi;
		fi;
		# Old user homes in /Users
		for d in /Users/*/; do
			name=$(basename \"$d\");
			if [ \"$name\" = \"$ME\" ] || [ \"$name\" = \"Shared\" ] || [ \"$name\" = \".localized\" ]; then continue; fi;
			OWNER=$(stat -f '%Su' \"$d\" 2>/dev/null);
			if [ \"$OWNER\" = \"root\" ] || [ -z \"$OWNER\" ]; then continue; fi;
			SIZE=$(du -sh \"$d\" 2>/dev/null | cut -f1);
			FINDINGS=\"${FINDINGS}|/Users/$name (old user home, owner '$OWNER')|$SIZE|sudo chown -R \\$(whoami) /Users/$name\";
		done;
		echo \"$FINDINGS\"
	"

	-- Show a quick "scanning…" progress bar while du runs (it can take 10–30s)
	set progress total steps to -1
	set progress description to "DustPan — Scanning for locked space"
	set progress additional description to "Checking /opt/homebrew, /usr/local/Homebrew, /Users/*…"

	set findingsRaw to do shell script scanScript
	set progress completed steps to 1

	if findingsRaw is "" then
		display alert "✅ Nothing locked by previous users" ¬
			message "DustPan checked /opt/homebrew, /usr/local/Homebrew, and every /Users/<name>/ folder. Everything is owned by you (or by macOS / root, which is correct)." ¬
			buttons {"Done"} ¬
			default button "Done"
		return
	end if

	-- Parse the | -delimited findings (skip leading empty entry)
	set AppleScript's text item delimiters to "|"
	set findings to text items of findingsRaw
	set AppleScript's text item delimiters to ""

	-- findings is: [empty, label1, size1, cmd1, label2, size2, cmd2, ...]
	-- Build a readable summary + a list of commands for the user to choose from.

	set findingCount to ((count of findings) - 1) div 3
	set summaryLines to {}
	set commandList to {}
	set commandLookup to {}

	repeat with i from 1 to findingCount
		set baseIdx to ((i - 1) * 3) + 2
		set lbl to item baseIdx of findings
		set sz to item (baseIdx + 1) of findings
		set cmd to item (baseIdx + 2) of findings
		set end of summaryLines to "  " & sz & "    " & lbl
		set end of commandList to (i as text) & ". " & lbl & "  (" & sz & ")"
		set end of commandLookup to cmd
	end repeat

	set AppleScript's text item delimiters to return
	set summaryText to summaryLines as text
	set AppleScript's text item delimiters to ""

	set userChoice to display dialog "🔒  Found " & (findingCount as text) & " location(s) locked by previous users:" & return & return & summaryText & return & return & "Choose 'Show takeover command' to see the exact `sudo chown` command for one of these. DustPan can't run sudo for you — macOS will prompt for your Mac password when you paste the command into Terminal." ¬
		with title "DustPan — Locked Space" ¬
		buttons {"Done", "Show takeover command"} ¬
		default button "Show takeover command" ¬
		with icon caution

	if button returned of userChoice is "Done" then return

	-- Let them pick which finding to take over
	set picked to choose from list commandList ¬
		with title "DustPan — Which location?" ¬
		with prompt "Pick the path you want to unlock:" ¬
		default items {item 1 of commandList} ¬
		OK button name "Show command" ¬
		cancel button name "Cancel"

	if picked is false then return

	-- Find the matching command
	set pickedLabel to item 1 of picked
	set chosenIdx to my findIndex(commandList, pickedLabel)
	set chosenCmd to item chosenIdx of commandLookup

	-- Show the command with a "Copy" button. macOS Sequoia + Tahoe handle multi-line
	-- selectable text in display dialog well — but for max compatibility we put the
	-- command itself in a `default answer` field which is selectable / copyable.
	set copyChoice to display dialog "Run this in Terminal:" & return & return & "macOS will prompt for your Mac password — that's the correct consent gate for an ownership change, and DustPan stays out of it." ¬
		with title "DustPan — Takeover command" ¬
		default answer chosenCmd ¬
		buttons {"Done", "Copy to Clipboard", "Open Terminal"} ¬
		default button "Copy to Clipboard"

	if button returned of copyChoice is "Copy to Clipboard" then
		set the clipboard to chosenCmd
		display notification "Paste it into Terminal — macOS will prompt for your Mac password." with title "DustPan — Command copied" subtitle "Ready to paste" sound name "Glass"
	else if button returned of copyChoice is "Open Terminal" then
		set the clipboard to chosenCmd
		tell application "Terminal" to activate
		display notification "Command on your clipboard. Paste with ⌘V, then enter your Mac password." with title "DustPan — Terminal opened" sound name "Glass"
	end if
end run

-- ── Helpers ──────────────────────────────────────────────────────────────────

on findIndex(theList, theItem)
	repeat with i from 1 to count of theList
		if (item i of theList) is theItem then return i
	end repeat
	return 0
end findIndex

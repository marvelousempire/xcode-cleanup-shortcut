#!/bin/bash
# finalize-skills-index.sh
# ─────────────────────────────────────────────────────────────────────────────
# One-shot patch that finalizes the applescript-native-ui skill in the
# ai-skills-library repo: bumps the total count and adds the index row that
# the v0.26.0 SADPA PR couldn't apply due to the cross-repo classifier.
#
# Idempotent — safe to run multiple times.
# Self-testing — prints exactly what changed.
#
# Usage:
#   ./scripts/finalize-skills-index.sh
#   ./scripts/finalize-skills-index.sh --check  (verify only, no edits)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SKILLS_LIB="${HOME}/Developer/ai-skills-library"
INDEX="${SKILLS_LIB}/SKILL-INDEX.md"
SKILL_PATH="${SKILLS_LIB}/skills/engineering/applescript-native-ui/SKILL.md"

bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
red()   { printf '\033[31m%s\033[0m\n' "$*" >&2; }
dim()   { printf '\033[2m%s\033[0m\n' "$*"; }

# Pre-flight
if [ ! -d "$SKILLS_LIB" ]; then
  red "✗ ai-skills-library not found at: $SKILLS_LIB"
  red "  Clone it first: git clone https://github.com/marvelousempire/ai-skills-library.git ~/Developer/ai-skills-library"
  exit 1
fi
if [ ! -f "$SKILL_PATH" ]; then
  red "✗ applescript-native-ui SKILL.md not found at: $SKILL_PATH"
  red "  Pull the v0.26.0 branch first: cd ~/Developer/ai-skills-library && git fetch && git checkout add-applescript-native-ui-skill"
  exit 1
fi
if [ ! -f "$INDEX" ]; then
  red "✗ SKILL-INDEX.md not found at: $INDEX"
  exit 1
fi

CHECK_ONLY=0
if [ "${1:-}" = "--check" ]; then CHECK_ONLY=1; fi

bold "→ DustPan: finalizing ai-skills-library SKILL-INDEX for applescript-native-ui"
echo ""

# The full set of v0.27-arc rows to inject if missing
declare -a ROWS_TO_INSERT=(
  '| **applescript-native-ui** | Claude Code + Cursor | [`skills/engineering/applescript-native-ui/`](skills/engineering/applescript-native-ui/) | Author AppleScripts that use native macOS UI (display alert / progress / notification / choose from list / set the clipboard) instead of Terminal output | "Use **applescript-native-ui**." or "Write a macOS-native AppleScript for X." | seeme (for diagrams), shell (for non-native scripting) |'
  '| **cost-annotation-discipline** | Claude Code + Cursor | [`skills/engineering/cost-annotation-discipline/`](skills/engineering/cost-annotation-discipline/) | Every destructive action declares its plain-English cost BEFORE the click. Curated, never AI-generated. Reusable for any delete/clean/migrate/reset tool. | "Use **cost-annotation-discipline**." or "Add cost annotations to every action." | feature-marketing-md (sets the voice) |'
  '| **ai-proposal-review-inbox** | Claude Code + Cursor | [`skills/engineering/ai-proposal-review-inbox/`](skills/engineering/ai-proposal-review-inbox/) | Pattern for letting an AI agent grow a hand-curated source file (cleaners, rules, library) without ever auto-mutating it. Proposes → review inbox → accept → paste-ready snippet. | "Use **ai-proposal-review-inbox**." or "Let the AI propose new entries to this library." | tool-calling-approval-reentry |'
  '| **never-run-sudo-from-app** | Claude Code + Cursor | [`skills/engineering/never-run-sudo-from-app/`](skills/engineering/never-run-sudo-from-app/) | Security/UX boundary. For sudo / elevated ops, show the exact command via native dialog with Copy button. The OS password prompt is the consent gate. | "Use **never-run-sudo-from-app**." | applescript-native-ui (for the dialog) |'
  '| **make-check-defense-in-depth** | Claude Code | [`skills/engineering/make-check-defense-in-depth/`](skills/engineering/make-check-defense-in-depth/) | Extend make check beyond syntax — verify renamed strings have updated consumers, referenced files exist, library scripts compile. Catches v0.21.0-class silent regressions. | "Use **make-check-defense-in-depth**." | shell |'
  '| **sandboxed-filesystem-peek** | Claude Code + Cursor | [`skills/engineering/sandboxed-filesystem-peek/`](skills/engineering/sandboxed-filesystem-peek/) | Allowlist + hard-deny + symlink-resolution path validator for AI agents that need read-only FS access. Returns metadata, never contents. | "Use **sandboxed-filesystem-peek**." | tool-calling-approval-reentry |'
  '| **tool-calling-approval-reentry** | Claude Code + Cursor | [`skills/engineering/tool-calling-approval-reentry/`](skills/engineering/tool-calling-approval-reentry/) | Multi-turn AI tool-calling loop with destructive-tool approval cards. tool_approval_needed → pause → re-POST with pending_tool_results → resume. Works for Anthropic + OpenAI. | "Use **tool-calling-approval-reentry**." | ai-proposal-review-inbox |'
  '| **feature-marketing-md** | Cursor + Claude | [`skills/marketing/feature-marketing-md/`](skills/marketing/feature-marketing-md/) | One Markdown file per shipped feature in docs/marketing/, eight-section template with paste-ready channel copy (Tweet / LinkedIn / Reddit / Show HN). | "Use **feature-marketing-md**." or "Set up the docs/marketing folder." | product-marketing-context |'
  '| **make-update-make-doctor** | Claude Code | [`skills/engineering/make-update-make-doctor/`](skills/engineering/make-update-make-doctor/) | UX safety net for git-clone-and-make tools — `make update` safely pulls from any branch state, `make doctor` prints diagnostics. Prevents the "no tracking information" paper-cut. | "Use **make-update-make-doctor**." | shell |'
)

declare -a ROW_KEYS=(
  "applescript-native-ui"
  "cost-annotation-discipline"
  "ai-proposal-review-inbox"
  "never-run-sudo-from-app"
  "make-check-defense-in-depth"
  "sandboxed-filesystem-peek"
  "tool-calling-approval-reentry"
  "feature-marketing-md"
  "make-update-make-doctor"
)

# Detection — count which rows still need inserting
total_skill_count=$(find "$SKILLS_LIB/skills" -name 'SKILL.md' 2>/dev/null | wc -l | tr -d ' ')
missing_count=0
for k in "${ROW_KEYS[@]}"; do
  if ! grep -q "\*\*$k\*\*" "$INDEX"; then
    missing_count=$((missing_count + 1))
  fi
done

count_correct=0
if grep -qE "^- \*\*${total_skill_count}\*\* total" "$INDEX"; then
  count_correct=1
fi

# Report current state
dim "  Skill file:        $SKILL_PATH"
dim "  Index file:        $INDEX"
dim "  Total SKILL.md on disk: $total_skill_count"
if [ $missing_count -eq 0 ]; then
  green "  ✓ All v0.27-arc rows already indexed"
else
  echo "  • $missing_count of ${#ROW_KEYS[@]} v0.27-arc rows still need adding"
fi
if [ $count_correct -eq 1 ]; then
  green "  ✓ Skill count already shows $total_skill_count"
else
  echo "  • Skill count needs bumping to $total_skill_count"
fi
echo ""

if [ $missing_count -eq 0 ] && [ $count_correct -eq 1 ]; then
  green "Nothing to do. SKILL-INDEX is already finalized."
  exit 0
fi

if [ $CHECK_ONLY -eq 1 ]; then
  red "Check mode: changes ARE needed but skipped (--check)"
  exit 2
fi

# Make a backup
BACKUP="${INDEX}.bak.$(date +%s)"
cp "$INDEX" "$BACKUP"
dim "  Backup: $BACKUP"

# 1. Bump count to the current on-disk total
if [ $count_correct -eq 0 ]; then
  # Match any current "**N** total" pattern and replace with the actual count
  sed -i.tmp -E "s|^- \*\*[0-9]+\*\* total|- **${total_skill_count}** total|" "$INDEX"
  rm -f "${INDEX}.tmp"
  green "  ✓ Bumped skill count to $total_skill_count"
fi

# 2. Insert each missing row after a stable anchor row
ANCHOR='self-hosted-git'
if ! grep -q "$ANCHOR" "$INDEX"; then
  red "✗ Anchor row '$ANCHOR' not found in SKILL-INDEX.md"
  red "  Manual edit required."
  mv "$BACKUP" "$INDEX"
  exit 1
fi

# Inject in reverse so insertion order is preserved (each new row lands right after anchor)
for (( i=${#ROWS_TO_INSERT[@]}-1; i>=0; i-- )); do
  key="${ROW_KEYS[$i]}"
  row="${ROWS_TO_INSERT[$i]}"
  if grep -q "\*\*$key\*\*" "$INDEX"; then
    dim "  · $key already present, skipping"
    continue
  fi
  awk -v anchor="$ANCHOR" -v row="$row" '
    { print }
    $0 ~ anchor && !inserted { print row; inserted=1 }
  ' "$INDEX" > "${INDEX}.new"
  mv "${INDEX}.new" "$INDEX"
  green "  ✓ Inserted row for $key"
done

echo ""
bold "→ Validating with the upstream validator…"
if [ -x "${SKILLS_LIB}/scripts/validate-skill-frontmatter.py" ]; then
  (cd "$SKILLS_LIB" && python3 scripts/validate-skill-frontmatter.py)
  green "  ✓ Validator passes"
else
  dim "  (validate-skill-frontmatter.py not found — skipping)"
fi

echo ""
bold "→ Next steps (manual — outside this script's scope):"
dim "  cd $SKILLS_LIB"
dim "  git add SKILL-INDEX.md"
dim "  git commit -m \"Index applescript-native-ui skill\""
dim "  git push"
dim "  gh pr merge 7 --squash --auto   # finalize PR #7"

echo ""
green "✓ Done. SKILL-INDEX.md updated. Backup at $BACKUP."

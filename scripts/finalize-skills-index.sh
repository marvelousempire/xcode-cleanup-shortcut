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

# Detection
already_indexed=0
if grep -q '\*\*applescript-native-ui\*\*' "$INDEX"; then
  already_indexed=1
fi

count_correct=0
if grep -qE '^- \*\*7[2-9]\*\* total' "$INDEX"; then
  count_correct=1
fi

# Report current state
dim "  Skill file:        $SKILL_PATH"
dim "  Index file:        $INDEX"
if [ $already_indexed -eq 1 ]; then
  green "  ✓ Index row already present"
else
  echo "  • Index row missing — will add it"
fi
if [ $count_correct -eq 1 ]; then
  green "  ✓ Skill count already ≥72"
else
  echo "  • Count needs bumping 71 → 72"
fi
echo ""

if [ $already_indexed -eq 1 ] && [ $count_correct -eq 1 ]; then
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

# 1. Bump count if needed
if [ $count_correct -eq 0 ]; then
  sed -i.tmp 's|^- \*\*71\*\* total|- **72** total|' "$INDEX"
  rm -f "${INDEX}.tmp"
  green "  ✓ Bumped skill count to 72"
fi

# 2. Insert index row after the console row (recognizable anchor)
if [ $already_indexed -eq 0 ]; then
  # We insert after the existing "self-hosted-git" row (a known stable anchor)
  ANCHOR='self-hosted-git'
  ROW='| **applescript-native-ui** | Claude Code + Cursor | [`skills/engineering/applescript-native-ui/`](skills/engineering/applescript-native-ui/) | Author AppleScripts that use native macOS UI (display alert / progress / notification / choose from list / set the clipboard) instead of Terminal output | "Use **applescript-native-ui**." or "Write a macOS-native AppleScript for X." | seeme (for diagrams), shell (for non-native scripting) |'

  if grep -q "$ANCHOR" "$INDEX"; then
    # Append the new row right after the anchor line
    awk -v anchor="$ANCHOR" -v row="$ROW" '
      { print }
      $0 ~ anchor && !inserted { print row; inserted=1 }
    ' "$INDEX" > "${INDEX}.new"
    mv "${INDEX}.new" "$INDEX"
    green "  ✓ Inserted index row for applescript-native-ui"
  else
    red "✗ Anchor row '$ANCHOR' not found in SKILL-INDEX.md"
    red "  Manual edit required — see PR #7 body in ai-skills-library"
    mv "$BACKUP" "$INDEX"
    exit 1
  fi
fi

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

#!/bin/bash
# finalize-skills-index.sh — MOVED to ai-skills-library
# ─────────────────────────────────────────────────────────────────────────────
# This script now lives in the ai-skills-library repo where it belongs.
# Run it from there:
#
#   cd ~/Developer/ai-skills-library
#   ./scripts/finalize-skills-index.sh
#
# The script auto-detects all SKILL.md files, inserts missing SKILL-INDEX.md
# rows, and bumps the total count. Idempotent + self-validating.
# ─────────────────────────────────────────────────────────────────────────────

SKILLS_LIB="${HOME}/Developer/ai-skills-library"

if [ ! -d "$SKILLS_LIB" ]; then
  echo "✗ ai-skills-library not found at: $SKILLS_LIB" >&2
  echo "  Clone it first or check the path." >&2
  exit 1
fi

exec "$SKILLS_LIB/scripts/finalize-skills-index.sh" "$@"

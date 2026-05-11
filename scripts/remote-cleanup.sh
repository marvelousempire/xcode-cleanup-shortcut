#!/bin/bash
# Xcode Cleanup — pure shell version for SSH / headless / non-interactive contexts.
# Writes only to stdout; no `display alert`, no `display notification`, no progress bar.
#
# Usage (local):
#   bash scripts/remote-cleanup.sh [--dry-run] [--force]
#
# Usage (over SSH, paste into Shortcuts "Run Script Over SSH"):
#   bash <(curl -fsSL https://raw.githubusercontent.com/marvelousempire/xcode-cleanup-shortcut/main/scripts/remote-cleanup.sh)
#
# Environment overrides:
#   XCODE_CLEANUP_DRY_RUN=1       Measure only; don't delete
#   XCODE_CLEANUP_FORCE=1         Skip the >50 GB threshold gate
#   XCODE_CLEANUP_TMP_PATTERNS    Override the /tmp orphan globs (default empty for safety)

set -u

# Parse flags
DRY_RUN=${XCODE_CLEANUP_DRY_RUN:-0}
FORCE=${FORCE:-${XCODE_CLEANUP_FORCE:-0}}
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --force) FORCE=1 ;;
    --help|-h) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown flag: $arg" >&2; exit 1 ;;
  esac
done

# Threshold check (skipped if --force or --dry-run)
free_kb=$(df -k / | awk 'NR==2 {print $4}')
free_gb=$((free_kb / 1024 / 1024))
free_human=$(df -h / | awk 'NR==2 {print $4}')
host=$(hostname -s)

if [ "$FORCE" != "1" ] && [ "$DRY_RUN" != "1" ] && [ "$free_gb" -gt 50 ]; then
  echo "[$host] OK · ${free_human} free · no cleanup needed (>50 GB threshold)"
  exit 0
fi

if [ "$DRY_RUN" = "1" ]; then
  echo "[$host] DRY RUN · measuring (no deletion) · current: ${free_human} free"
else
  echo "[$host] Cleaning · current: ${free_human} free"
fi

# Phase paths — each line is a phase
PHASES=(
  "DerivedData + DeviceSupport|$HOME/Library/Developer/Xcode/DerivedData $HOME/Library/Developer/Xcode/iOS\\ DeviceSupport $HOME/Library/Developer/Xcode/watchOS\\ DeviceSupport $HOME/Library/Developer/Xcode/tvOS\\ DeviceSupport $HOME/Library/Caches/com.apple.dt.Xcode"
  "SwiftPM caches|$HOME/Library/Caches/org.swift.swiftpm $HOME/Library/org.swift.swiftpm"
  "Simulator caches|$HOME/Library/Developer/CoreSimulator/Caches"
)

total_measured_kb=0

human_size() {
  local kb=$1
  if [ "$kb" -gt 1048576 ]; then
    awk "BEGIN { printf \"%.1f GB\", $kb / 1048576 }"
  elif [ "$kb" -gt 1024 ]; then
    awk "BEGIN { printf \"%.1f MB\", $kb / 1024 }"
  else
    echo "${kb} KB"
  fi
}

for entry in "${PHASES[@]}"; do
  label="${entry%%|*}"
  paths="${entry#*|}"
  size_kb=$(eval "du -sk $paths 2>/dev/null" | awk '{s+=$1} END {print s+0}')
  total_measured_kb=$((total_measured_kb + size_kb))
  size_human=$(human_size "$size_kb")

  if [ "$DRY_RUN" = "1" ]; then
    printf "  [measure] %-30s %s\n" "$label" "$size_human"
  else
    printf "  [clean]   %-30s %s … " "$label" "$size_human"
    eval "rm -rf $paths/* 2>/dev/null" || true
    printf "done\n"
  fi
done

# Simulator devices for runtimes you no longer have (skipped in dry-run)
if [ "$DRY_RUN" != "1" ]; then
  printf "  [clean]   %-30s … " "Unavailable simulators"
  xcrun simctl delete unavailable >/dev/null 2>&1 || true
  printf "done\n"
fi

# Optional /tmp patterns
if [ -n "${XCODE_CLEANUP_TMP_PATTERNS:-}" ]; then
  size_kb=$(eval "du -sk $XCODE_CLEANUP_TMP_PATTERNS 2>/dev/null" | awk '{s+=$1} END {print s+0}')
  total_measured_kb=$((total_measured_kb + size_kb))
  if [ "$DRY_RUN" = "1" ]; then
    printf "  [measure] %-30s %s\n" "/tmp orphans" "${size_kb} KB"
  else
    printf "  [clean]   %-30s … " "/tmp orphans"
    eval "rm -rf $XCODE_CLEANUP_TMP_PATTERNS 2>/dev/null" || true
    printf "done\n"
  fi
fi

# Final report
if [ "$DRY_RUN" = "1" ]; then
  would_gb=$(awk "BEGIN { printf \"%.1f\", $total_measured_kb / 1024 / 1024 }")
  echo "[$host] DRY RUN · would free ~${would_gb} GB"
else
  after_kb=$(df -k / | awk 'NR==2 {print $4}')
  freed_kb=$((after_kb - free_kb))
  freed_gb=$(awk "BEGIN { printf \"%.1f\", $freed_kb / 1024 / 1024 }")
  new_free=$(df -h / | awk 'NR==2 {print $4}')
  echo "[$host] Freed ${freed_gb} GB · ${new_free} free"

  # Append to CSV history if dir exists
  if [ -d "$HOME/Library/Logs" ]; then
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    before_gb=$(awk "BEGIN { printf \"%.1f\", $free_kb / 1024 / 1024 }")
    after_gb=$(awk "BEGIN { printf \"%.1f\", $after_kb / 1024 / 1024 }")
    echo "${ts},real-ssh,${freed_gb},${before_gb},${after_gb}" \
      >> "$HOME/Library/Logs/xcode-cleanup-history.csv"
  fi
fi

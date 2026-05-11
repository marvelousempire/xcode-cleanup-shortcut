#!/bin/bash
# Xcode Cleanup — SwiftBar / xbar plugin
# Shows free disk space in the menu bar; click for cleanup actions.
#
# Install:
#   1. brew install --cask swiftbar
#   2. Set SwiftBar plugin folder to ~/Library/Application Support/SwiftBar/Plugins
#   3. From this repo: make install-swiftbar
#
# Refresh interval: 30 minutes (filename suffix).

REPO_DIR="$(cd "$(dirname "$(readlink "$0" 2>/dev/null || echo "$0")")/.." && pwd)"
SCRIPT="$REPO_DIR/xcode-cleanup.applescript"

free_gb=$(df -k / | awk 'NR==2 {printf "%d", $4/1024/1024}')
total_gb=$(df -k / | awk 'NR==2 {printf "%d", $2/1024/1024}')
pct_used=$(df -h / | awk 'NR==2 {print $5}')

# Color the menu bar text based on disk pressure
if [ "$free_gb" -lt 20 ]; then
  color="#FF453A"   # red
  emoji="🚨"
elif [ "$free_gb" -lt 50 ]; then
  color="#FF9F0A"   # orange
  emoji="🧹"
else
  color="#30D158"   # green
  emoji="✨"
fi

# Menu bar text
echo "${emoji} ${free_gb}GB | color=${color} size=12"

# Dropdown
echo "---"
echo "Disk: ${free_gb} GB free of ${total_gb} GB (${pct_used} used) | color=${color}"
echo "---"
echo "▶ Run cleanup | bash=/usr/bin/osascript param1=${SCRIPT} terminal=false"
echo "📊 Dry run | bash=/usr/bin/env param1=XCODE_CLEANUP_DRY_RUN=1 param2=XCODE_CLEANUP_AUTO_CONFIRM=1 param3=/usr/bin/osascript param4=${SCRIPT} terminal=false"
echo "⚡ Force run | bash=/usr/bin/env param1=XCODE_CLEANUP_FORCE=1 param2=/usr/bin/osascript param3=${SCRIPT} terminal=false"
echo "---"
echo "📂 Show history | bash=/usr/bin/tail param1=-20 param2=${HOME}/Library/Logs/xcode-cleanup.log terminal=true"
echo "📈 Report | bash=/usr/bin/python3 param1=${REPO_DIR}/scripts/report.py terminal=true"
echo "🌐 GitHub | href=https://github.com/marvelousempire/xcode-cleanup-shortcut"
echo "---"
echo "↻ Refresh | refresh=true"

#!/bin/bash
# ═══════════════════════════════════════════════
#  K10 Media Broadcaster — Rebuild All Dashboards
# ═══════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "═══════════════════════════════════════════════"
echo " K10 Media Broadcaster — Rebuild All Dashboards"
echo "═══════════════════════════════════════════════"
echo ""

echo "── React Dashboard ──────────────────────────"
bash "$SCRIPT_DIR/rebuild-react.command"

echo ""
echo "── Vanilla TS Dashboard ─────────────────────"
bash "$SCRIPT_DIR/rebuild-vanilla.command"

echo ""
echo "═══════════════════════════════════════════════"
echo " All dashboard builds complete."
echo "═══════════════════════════════════════════════"
echo ""
read -p "Press Enter to close..."

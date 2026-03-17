#!/bin/bash
# ═══════════════════════════════════════════════
#  K10 Media Broadcaster — Rebuild Vanilla TS Dashboard
# ═══════════════════════════════════════════════

# Navigate to app root (K10 Media Broadcaster/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/../.."
cd "$APP_DIR"

echo "═══════════════════════════════════════════════"
echo " K10 Media Broadcaster — Rebuild Vanilla TS Dashboard"
echo "═══════════════════════════════════════════════"
echo ""

# Check for npm
if ! command -v npm &>/dev/null; then
    echo "ERROR: npm not found."
    echo ""
    echo "Install Node.js from https://nodejs.org"
    echo "  or:  brew install node"
    echo ""
    read -p "Press Enter to close..."
    exit 1
fi

SRC_VANILLA_DIR="$APP_DIR/../src-vanilla"
if [ ! -f "$SRC_VANILLA_DIR/package.json" ]; then
    echo "ERROR: Vanilla TS source directory not found at ../src-vanilla"
    read -p "Press Enter to close..."
    exit 1
fi

echo "[1/3] Installing vanilla TS dependencies..."
cd "$SRC_VANILLA_DIR"
npm install
if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: npm install failed."
    read -p "Press Enter to close..."
    exit 1
fi

echo ""
echo "[2/3] Building vanilla TS dashboard..."
npm run build
if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Build failed."
    read -p "Press Enter to close..."
    exit 1
fi

cd "$APP_DIR"

echo ""
echo "[3/3] Verifying build output..."
if [ -f "dashboard-build.html" ]; then
    echo "  dashboard-build.html OK"
else
    echo "  WARNING: dashboard-build.html not found"
fi

echo ""
echo "Done! Vanilla TS dashboard rebuilt successfully."
echo ""
read -p "Press Enter to close..."

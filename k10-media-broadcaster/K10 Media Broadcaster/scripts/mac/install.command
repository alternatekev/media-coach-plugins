#!/bin/bash
# ═══════════════════════════════════════════════
#  K10 Media Broadcaster — Install Dependencies
# ═══════════════════════════════════════════════

# Navigate to app root (K10 Media Broadcaster/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/../.."
cd "$APP_DIR"

echo "═══════════════════════════════════════════════"
echo " K10 Media Broadcaster — Install Dependencies"
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

echo "[1/7] Cleaning previous install (fixes code-signature issues)..."
rm -rf node_modules package-lock.json

echo ""
echo "[2/7] Installing Electron dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: npm install failed."
    read -p "Press Enter to close..."
    exit 1
fi

# Fix macOS code signature — required on Apple Silicon after fresh install
echo ""
echo "  Fixing Electron code signature..."
xattr -cr node_modules/electron/dist/Electron.app 2>/dev/null
codesign --force --deep --sign - node_modules/electron/dist/Electron.app 2>/dev/null

echo ""
echo "[3/7] Installing React dashboard dependencies..."
SRC_DIR="$APP_DIR/../src"
if [ ! -f "$SRC_DIR/package.json" ]; then
    echo "WARNING: React source directory not found — skipping React build."
else
    cd "$SRC_DIR"
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "ERROR: React dependency install failed."
        read -p "Press Enter to close..."
        exit 1
    fi

    echo ""
    echo "[4/7] Building React dashboard..."
    npx vite build
    if [ $? -ne 0 ]; then
        echo ""
        echo "ERROR: React dashboard build failed."
        read -p "Press Enter to close..."
        exit 1
    fi
    cd "$APP_DIR"
fi

echo ""
echo "[5/7] Installing vanilla TS dashboard dependencies..."
SRC_VANILLA_DIR="$APP_DIR/../src-vanilla"
if [ ! -f "$SRC_VANILLA_DIR/package.json" ]; then
    echo "WARNING: Vanilla TS source directory not found — skipping vanilla build."
else
    cd "$SRC_VANILLA_DIR"
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "ERROR: Vanilla TS dependency install failed."
        read -p "Press Enter to close..."
        exit 1
    fi

    echo ""
    echo "[6/7] Building vanilla TS dashboard..."
    npm run build
    if [ $? -ne 0 ]; then
        echo ""
        echo "ERROR: Vanilla TS dashboard build failed."
        read -p "Press Enter to close..."
        exit 1
    fi
    cd "$APP_DIR"
fi

echo ""
echo "[7/7] Verifying build output..."
if [ -f "$APP_DIR/dashboard-react.html" ]; then
    echo "  dashboard-react.html OK"
else
    echo "  WARNING: dashboard-react.html not found"
fi
if [ -f "$APP_DIR/dashboard-build.html" ]; then
    echo "  dashboard-build.html OK"
else
    echo "  WARNING: dashboard-build.html not found"
fi

echo ""
echo "Done! Double-click 'K10 Media Broadcaster.command' to launch the overlay."
echo ""
read -p "Press Enter to close..."

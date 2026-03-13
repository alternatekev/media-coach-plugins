#!/bin/bash
# ═══════════════════════════════════════════════
#  K10 Media Broadcast — Overlay Launcher (macOS)
# ═══════════════════════════════════════════════

cd "$(dirname "$0")"

echo "═══════════════════════════════════════════════"
echo " K10 Media Broadcast — Starting Overlay"
echo "═══════════════════════════════════════════════"
echo ""
echo "Hotkeys:"
echo "  Cmd+Shift+H   Toggle overlay visibility"
echo "  Cmd+Shift+S   Toggle settings mode (interact with overlay)"
echo "  Cmd+Shift+R   Reset to fullscreen"
echo "  Cmd+Shift+Q   Quit overlay"
echo ""

# Check for npm/npx
if ! command -v npx &>/dev/null; then
    echo "ERROR: Node.js not found."
    echo ""
    echo "Install it from https://nodejs.org"
    echo "  or:  brew install node"
    echo ""
    read -p "Press Enter to close..."
    exit 1
fi

# Auto-install if node_modules missing or Electron binary not executable
if [ ! -d "node_modules" ] || [ ! -x "node_modules/.bin/electron" ]; then
    echo "Installing dependencies..."
    echo ""
    # Clean reinstall to get correct platform binaries
    rm -rf node_modules package-lock.json
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "ERROR: npm install failed."
        read -p "Press Enter to close..."
        exit 1
    fi
    echo ""
    echo "Dependencies installed. Launching overlay..."
    echo ""
fi

# Ensure all bin stubs are executable (may lose +x via cross-platform sync)
chmod +x node_modules/.bin/* 2>/dev/null

# Launch Electron overlay (detach so Terminal can close)
nohup npx electron . >/dev/null 2>&1 &
disown

#!/bin/bash
# ═══════════════════════════════════════════════
#  K10 Media Broadcast — Install Dependencies
# ═══════════════════════════════════════════════

cd "$(dirname "$0")"

echo "═══════════════════════════════════════════════"
echo " K10 Media Broadcast — Install Dependencies"
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

echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: npm install failed."
    read -p "Press Enter to close..."
    exit 1
fi

echo ""
echo "Done! Double-click 'K10 Media Broadcast.command' to launch the overlay."
echo ""
read -p "Press Enter to close..."

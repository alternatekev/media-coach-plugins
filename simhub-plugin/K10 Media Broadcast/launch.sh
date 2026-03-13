#!/bin/bash
# K10 Media Broadcast — Silent Launcher
# Runs the Electron overlay without keeping a terminal window open.
cd "$(dirname "$0")"

# Auto-install if needed
if [ ! -d "node_modules" ] || [ ! -x "node_modules/.bin/electron" ]; then
    rm -rf node_modules package-lock.json
    npm install 2>&1 | tail -5
fi
chmod +x node_modules/.bin/* 2>/dev/null

# Launch Electron (nohup + disown to fully detach)
nohup npx electron . >/dev/null 2>&1 &
disown

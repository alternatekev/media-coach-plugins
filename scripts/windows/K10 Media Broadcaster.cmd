@echo off
title K10 Motorsports

:: Navigate to the Electron app root (dashboard-overlay/)
cd /d "%~dp0..\..\dashboard-overlay"

echo ═══════════════════════════════════════════════
echo  K10 Motorsports — Starting Overlay
echo ═══════════════════════════════════════════════
echo.
echo Hotkeys:
echo   Ctrl+Shift+S   Toggle settings mode (clickable)
echo   Ctrl+Shift+H   Toggle overlay visibility
echo   Ctrl+Shift+G   Toggle green-screen mode (restarts)
echo   Ctrl+Shift+R   Reset window position/size
echo   Ctrl+Shift+D   Restart demo sequence
echo   Ctrl+Shift+M   Reset track map
echo   Ctrl+Shift+Q   Quit overlay
echo.

:: Check Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js not found. Please install from https://nodejs.org
    pause
    exit /b 1
)

:: Auto-install on first run
if not exist "node_modules" (
    echo First run — installing dependencies...
    call "%~dp0install.bat"
    if %ERRORLEVEL% NEQ 0 (
        echo Install failed.
        pause
        exit /b 1
    )
    echo.
)

:: Launch overlay
npx electron .

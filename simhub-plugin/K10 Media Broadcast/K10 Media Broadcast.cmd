@echo off
title K10 Media Broadcast
cd /d "%~dp0"

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
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Install failed.
        pause
        exit /b 1
    )
    echo.
)

:: Launch overlay
echo Starting K10 Media Broadcast overlay...
echo.
echo   Ctrl+Shift+H   Show / Hide
echo   Ctrl+Shift+S   Settings mode
echo   Ctrl+Shift+Q   Quit
echo.
npx electron .

@echo off
echo ═══════════════════════════════════════════════
echo  K10 Media Broadcast — Starting Overlay
echo ═══════════════════════════════════════════════
echo.
echo Hotkeys:
echo   Ctrl+Shift+H   Toggle overlay visibility
echo   Ctrl+Shift+S   Toggle settings mode (clickable)
echo   Ctrl+Shift+Q   Quit overlay
echo.

if not exist "node_modules" (
    echo node_modules not found. Running install first...
    call install.bat
    if %ERRORLEVEL% NEQ 0 exit /b 1
)

npx electron .

@echo off
title K10 Media Broadcaster

:: Navigate to app root (K10 Media Broadcaster/)
cd /d "%~dp0..\.."

echo ═══════════════════════════════════════════════
echo  K10 Media Broadcaster — Starting Overlay
echo ═══════════════════════════════════════════════
echo.
echo Hotkeys:
echo   Ctrl+Shift+S   Toggle settings mode (clickable)
echo   Ctrl+Shift+H   Toggle overlay visibility
echo   Ctrl+Shift+G   Toggle green-screen mode (restarts)
echo   Ctrl+Shift+T   Cycle dashboard (Original / React / Build)
echo   Ctrl+Shift+R   Reset window position/size
echo   Ctrl+Shift+D   Restart demo sequence
echo   Ctrl+Shift+Q   Quit overlay
echo.

if not exist "node_modules" (
    echo node_modules not found. Running install first...
    call "%~dp0install.bat"
    if %ERRORLEVEL% NEQ 0 exit /b 1
)

:: Rebuild dashboards if source is available but output is missing
if exist "%~dp0..\..\..\src\package.json" (
    if not exist "dashboard-react.html" (
        echo React dashboard not built. Building...
        pushd "%~dp0..\..\..\src"
        call npx vite build
        popd
    )
)

if exist "%~dp0..\..\..\src-vanilla\package.json" (
    if not exist "dashboard-build.html" (
        echo Vanilla TS dashboard not built. Building...
        pushd "%~dp0..\..\..\src-vanilla"
        call npm run build
        popd
    )
)

npx electron .

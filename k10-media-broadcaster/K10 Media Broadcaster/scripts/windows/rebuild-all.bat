@echo off
echo ═══════════════════════════════════════════════
echo  K10 Media Broadcaster — Rebuild All Dashboards
echo ═══════════════════════════════════════════════
echo.

:: Navigate to app root (K10 Media Broadcaster/)
cd /d "%~dp0..\.."

echo ── React Dashboard ──────────────────────────
call "%~dp0rebuild-react.bat"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: React build failed, continuing...
)

echo.
echo ── Vanilla TS Dashboard ─────────────────────
call "%~dp0rebuild-vanilla.bat"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: Vanilla TS build failed, continuing...
)

echo.
echo ═══════════════════════════════════════════════
echo  All dashboard builds complete.
echo ═══════════════════════════════════════════════
echo.
pause

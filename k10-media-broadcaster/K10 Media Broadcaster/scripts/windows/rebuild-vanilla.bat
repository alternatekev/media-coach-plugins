@echo off
echo ═══════════════════════════════════════════════
echo  K10 Media Broadcaster — Rebuild Vanilla TS Dashboard
echo ═══════════════════════════════════════════════
echo.

:: Navigate to app root (K10 Media Broadcaster/)
cd /d "%~dp0..\.."

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm not found. Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0..\..\..\src-vanilla\package.json" (
    echo ERROR: Vanilla TS source directory not found at ..\..\..\src-vanilla
    pause
    exit /b 1
)

echo [1/3] Installing vanilla TS dependencies...
pushd "%~dp0..\..\..\src-vanilla"
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: npm install failed.
    popd
    pause
    exit /b 1
)

echo.
echo [2/3] Building vanilla TS dashboard...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Build failed.
    popd
    pause
    exit /b 1
)
popd

cd /d "%~dp0..\.."
echo.
echo [3/3] Verifying build output...
if exist "dashboard-build.html" (
    echo   dashboard-build.html OK
) else (
    echo   WARNING: dashboard-build.html not found
)

echo.
echo Done! Vanilla TS dashboard rebuilt successfully.
echo.
pause

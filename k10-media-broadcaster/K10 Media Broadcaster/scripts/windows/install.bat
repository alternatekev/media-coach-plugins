@echo off
echo ═══════════════════════════════════════════════
echo  K10 Media Broadcaster — Install Dependencies
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

echo [1/4] Installing Electron dependencies...
npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: npm install failed.
    pause
    exit /b 1
)

echo.
echo [2/4] Installing dashboard dependencies...
pushd "%~dp0..\..\..\src-vanilla"
if not exist "package.json" (
    echo WARNING: src-vanilla directory not found — skipping build.
    popd
    goto :verify
)
npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Dashboard dependency install failed.
    popd
    pause
    exit /b 1
)

echo.
echo [3/4] Building dashboard...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Dashboard build failed.
    popd
    pause
    exit /b 1
)
popd

:verify
cd /d "%~dp0..\.."
echo.
echo [4/4] Verifying build output...
if exist "dashboard-build.html" (
    echo   dashboard-build.html OK
) else (
    echo   ERROR: dashboard-build.html not found!
    pause
    exit /b 1
)

echo.
echo Done! Run scripts\windows\start.bat to launch the overlay.
echo.
pause

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

echo [1/7] Installing Electron dependencies...
npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: npm install failed.
    pause
    exit /b 1
)

echo.
echo [2/7] Installing React dashboard dependencies...
pushd "%~dp0..\..\..\src"
if not exist "package.json" (
    echo WARNING: React source directory not found — skipping React build.
    popd
    goto :vanilla
)
npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: React dependency install failed.
    popd
    pause
    exit /b 1
)

echo.
echo [3/7] Building React dashboard...
call npx vite build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: React dashboard build failed.
    popd
    pause
    exit /b 1
)
popd

:vanilla
echo.
echo [4/7] Installing vanilla TypeScript dashboard dependencies...
pushd "%~dp0..\..\..\src-vanilla"
if not exist "package.json" (
    echo WARNING: Vanilla TS source directory not found — skipping vanilla build.
    popd
    goto :verify
)
npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Vanilla TS dependency install failed.
    popd
    pause
    exit /b 1
)

echo.
echo [5/7] Building vanilla TypeScript dashboard...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Vanilla TS dashboard build failed.
    popd
    pause
    exit /b 1
)
popd

:verify
cd /d "%~dp0..\.."
echo.
echo [6/7] Verifying build output...
if exist "dashboard-react.html" (
    echo   dashboard-react.html OK
) else (
    echo   WARNING: dashboard-react.html not found
)
if exist "dashboard-build.html" (
    echo   dashboard-build.html OK
) else (
    echo   WARNING: dashboard-build.html not found
)

echo.
echo [7/7] Done!
echo Run scripts\windows\start.bat to launch the overlay.
echo.
pause

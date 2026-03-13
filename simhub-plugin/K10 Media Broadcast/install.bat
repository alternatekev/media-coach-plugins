@echo off
echo ═══════════════════════════════════════════════
echo  K10 Media Broadcast — Install Dependencies
echo ═══════════════════════════════════════════════
echo.

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm not found. Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo Installing dependencies...
npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: npm install failed.
    pause
    exit /b 1
)

echo.
echo Done! Run start.bat to launch the overlay.
echo.
pause

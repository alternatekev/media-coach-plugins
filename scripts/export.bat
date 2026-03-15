@echo off
setlocal enabledelayedexpansion

title K10 Media Coach - Export Built Files to Repo

echo.
echo  ============================================
echo   K10 Media Coach - Export Built Files to Repo
echo  ============================================
echo.
echo  Copies the built DLL, PDB, and dashboard
echo  templates from your SimHub directory back
echo  into this repository for commit.
echo.

:: -------------------------------------------------------------------
:: 1. Find SimHub installation
:: -------------------------------------------------------------------

set "SIMHUB_DIR="

if exist "C:\Program Files (x86)\SimHub\SimHubWPF.exe" (
    set "SIMHUB_DIR=C:\Program Files (x86)\SimHub"
)
if exist "C:\Program Files\SimHub\SimHubWPF.exe" (
    set "SIMHUB_DIR=C:\Program Files\SimHub"
)

if defined SIMHUB_PATH (
    if exist "!SIMHUB_PATH!\SimHubWPF.exe" (
        set "SIMHUB_DIR=!SIMHUB_PATH!"
    )
)

if not defined SIMHUB_DIR (
    echo  SimHub was not found in the default location.
    echo  Enter your SimHub installation folder:
    echo.
    set /p "SIMHUB_DIR=  Path: "
    if not exist "!SIMHUB_DIR!\SimHubWPF.exe" (
        echo.
        echo  ERROR: SimHubWPF.exe not found in "!SIMHUB_DIR!"
        echo.
        pause
        exit /b 1
    )
)

echo  SimHub directory: %SIMHUB_DIR%
echo.

:: -------------------------------------------------------------------
:: 2. Determine repo root (this .bat lives in plugin-tools\)
:: -------------------------------------------------------------------

set "TOOLS_DIR=%~dp0"
if "%TOOLS_DIR:~-1%"=="\" set "TOOLS_DIR=%TOOLS_DIR:~0,-1%"
for %%I in ("%TOOLS_DIR%\..") do set "REPO_DIR=%%~fI"
set "PLUGIN_DIR=%REPO_DIR%\simhub-plugin"

:: -------------------------------------------------------------------
:: 3. Export DLL + PDB
:: -------------------------------------------------------------------

echo  [1/3] Exporting plugin binaries...

if exist "%SIMHUB_DIR%\K10MediaCoach.Plugin.dll" (
    copy /Y "%SIMHUB_DIR%\K10MediaCoach.Plugin.dll" "%PLUGIN_DIR%\K10MediaCoach.Plugin.dll" >NUL
    if !ERRORLEVEL! NEQ 0 (
        echo        FAILED - could not copy DLL. Is SimHub running?
        goto :error
    )
    echo        OK - K10MediaCoach.Plugin.dll
) else (
    echo        SKIPPED - K10MediaCoach.Plugin.dll not found in SimHub directory.
    echo        Build the plugin first (dotnet build).
    goto :error
)

if exist "%SIMHUB_DIR%\K10MediaCoach.Plugin.pdb" (
    copy /Y "%SIMHUB_DIR%\K10MediaCoach.Plugin.pdb" "%PLUGIN_DIR%\K10MediaCoach.Plugin.pdb" >NUL
    echo        OK - K10MediaCoach.Plugin.pdb
) else (
    echo        SKIPPED - K10MediaCoach.Plugin.pdb not found (Release build?)
)

:: -------------------------------------------------------------------
:: 4. Export "k10 media coach" dashboard (excluding _Backups)
:: -------------------------------------------------------------------

echo  [2/3] Exporting k10 media coach dashboard...

set "DASH1_SRC=%SIMHUB_DIR%\DashTemplates\k10 media coach"
set "DASH1_DST=%PLUGIN_DIR%\DashTemplates\k10 media coach"

if exist "%DASH1_SRC%" (
    if not exist "%DASH1_DST%" mkdir "%DASH1_DST%"

    :: Core dashboard files
    for %%F in (
        "k10 media coach.djson"
        "k10 media coach.djson.png"
        "k10 media coach.djson.00.png"
        "k10 media coach.djson.metadata"
        "k10 media coach.djson.carclasses"
        "k10 media coach.html"
    ) do (
        if exist "%DASH1_SRC%\%%~F" (
            copy /Y "%DASH1_SRC%\%%~F" "%DASH1_DST%\%%~F" >NUL
        )
    )

    :: JavascriptExtensions subfolder
    if exist "%DASH1_SRC%\JavascriptExtensions" (
        if not exist "%DASH1_DST%\JavascriptExtensions" mkdir "%DASH1_DST%\JavascriptExtensions"
        xcopy /E /Y /Q "%DASH1_SRC%\JavascriptExtensions" "%DASH1_DST%\JavascriptExtensions" >NUL
    )

    echo        OK - DashTemplates\k10 media coach\
    echo        NOTE: _Backups directory was excluded (SimHub-local only)
) else (
    echo        SKIPPED - k10 media coach dashboard not found in SimHub.
)

:: -------------------------------------------------------------------
:: 5. Export "k10 media broadcast" dashboard (excluding _Backups)
:: -------------------------------------------------------------------

echo  [3/3] Exporting k10 media broadcast dashboard...

set "DASH2_SRC=%SIMHUB_DIR%\DashTemplates\k10 media broadcast"
set "DASH2_DST=%PLUGIN_DIR%\DashTemplates\k10 media broadcast"

if exist "%DASH2_SRC%" (
    if not exist "%DASH2_DST%" mkdir "%DASH2_DST%"

    :: Core dashboard files
    for %%F in (
        "k10 media broadcast.djson"
        "k10 media broadcast.djson.metadata"
        "k10 media broadcast.html"
    ) do (
        if exist "%DASH2_SRC%\%%~F" (
            copy /Y "%DASH2_SRC%\%%~F" "%DASH2_DST%\%%~F" >NUL
        )
    )

    :: JavascriptExtensions subfolder
    if exist "%DASH2_SRC%\JavascriptExtensions" (
        if not exist "%DASH2_DST%\JavascriptExtensions" mkdir "%DASH2_DST%\JavascriptExtensions"
        xcopy /E /Y /Q "%DASH2_SRC%\JavascriptExtensions" "%DASH2_DST%\JavascriptExtensions" >NUL
    )

    echo        OK - DashTemplates\k10 media broadcast\

    :: Also update the Electron overlay's local copy
    set "ELECTRON_DIR=%PLUGIN_DIR%\K10 Media Broadcast"
    if exist "!ELECTRON_DIR!" (
        if exist "%DASH2_SRC%\k10 media broadcast.html" (
            copy /Y "%DASH2_SRC%\k10 media broadcast.html" "!ELECTRON_DIR!\dashboard.html" >NUL
            echo        OK - K10 Media Broadcast\dashboard.html (synced)
        )
    )
) else (
    echo        SKIPPED - k10 media broadcast dashboard not found in SimHub.
)

:: -------------------------------------------------------------------
:: 6. Summary
:: -------------------------------------------------------------------

echo.
echo  ============================================
echo   Export complete.
echo  ============================================
echo.
echo  Exported files:
echo    %PLUGIN_DIR%\K10MediaCoach.Plugin.dll
if exist "%PLUGIN_DIR%\K10MediaCoach.Plugin.pdb" (
    echo    %PLUGIN_DIR%\K10MediaCoach.Plugin.pdb
)
echo    %PLUGIN_DIR%\DashTemplates\k10 media coach\
echo    %PLUGIN_DIR%\DashTemplates\k10 media broadcast\
echo.
echo  NOTE: Dataset files are NOT exported from SimHub.
echo  The dataset/ folder in the repo is the source of
echo  truth. Edit dataset files in the repo, then use
echo  install.bat or rebuild to push them to SimHub.
echo.
echo  Ready to commit. Run:
echo    git add simhub-plugin/
echo    git commit -m "Update built plugin and dashboards"
echo.
pause
exit /b 0

:error
echo.
echo  Export failed. See errors above.
echo.
pause
exit /b 1

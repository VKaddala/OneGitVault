@echo off
rem ============================================================
rem  Build OneGitVault installer using Inno Setup
rem  Run this AFTER: npm run build && npm run package
rem ============================================================

set "PROJECT_DIR=C:\Users\javku\Desktop\gemini\OneGitVault"
set "ISS_FILE=%PROJECT_DIR%\OneGitVault.iss"

rem Common Inno Setup install locations
set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" set "ISCC=C:\Program Files\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" set "ISCC=C:\Program Files (x86)\Inno Setup 5\ISCC.exe"

if not exist "%ISCC%" (
    echo.
    echo [ERROR] Inno Setup not found!
    echo Please download and install it from: https://jrsoftware.org/isdl.php
    echo Then run this bat again.
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Building OneGitVault Setup installer...
echo ============================================================
echo.

cd /d "%PROJECT_DIR%"

rem Step 1 — Build web app
echo [1/3] Building React web app...
call npm.cmd run build
if errorlevel 1 (
    echo [ERROR] Web build failed.
    pause
    exit /b 1
)

rem Step 2 — Package with electron-builder (dir only, skip NSIS)
echo.
echo [2/3] Packaging Electron app (directory)...
call npx.cmd electron-builder --win --dir --x64
if errorlevel 1 (
    echo [WARNING] electron-builder exited with error but win-unpacked may still be valid.
    echo Checking for win-unpacked...
    if not exist "%PROJECT_DIR%\release\installer\win-unpacked\OneGitVault.exe" (
        echo [ERROR] win-unpacked not found. Aborting.
        pause
        exit /b 1
    )
    echo win-unpacked exists — continuing.
)

rem Step 3 — Compile Inno Setup installer
echo.
echo [3/3] Compiling Inno Setup installer...
mkdir "%PROJECT_DIR%\release\setup" 2>nul
"%ISCC%" "%ISS_FILE%"
if errorlevel 1 (
    echo [ERROR] Inno Setup compilation failed.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  SUCCESS! Installer created at:
echo  %PROJECT_DIR%\release\setup\OneGitVault-Setup-1.0.0.exe
echo ============================================================
echo.
pause

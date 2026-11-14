@echo off
rem ============================================================
rem  OneGitVault Installer Builder
rem  Auto-increments version, packages Electron, & builds Inno Setup
rem ============================================================

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
set "ISS_FILE=%PROJECT_DIR%\OneGitVault.iss"

rem Locate Inno Setup compiler
set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" set "ISCC=C:\Program Files\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" set "ISCC=C:\Program Files (x86)\Inno Setup 5\ISCC.exe"

if not exist "%ISCC%" (
    echo.
    echo [ERROR] Inno Setup compiler not found!
    echo Please install Inno Setup 6 from: https://jrsoftware.org/isdl.php
    echo.
    pause
    exit /b 1
)

cd /d "%PROJECT_DIR%"

echo.
echo ============================================================
echo  1/4  Auto-incrementing Build Version...
echo ============================================================
for /f "delims=" %%v in ('node scripts\bump-version.cjs') do set "APP_VERSION=%%v"

if "%APP_VERSION%"=="" (
    echo [ERROR] Could not bump version. Falling back to package.json.
    set "APP_VERSION=1.0.1"
)
echo New Build Version: v%APP_VERSION%

echo.
echo ============================================================
echo  2/4  Compiling React Production Bundle (Vite)...
echo ============================================================
call npm.cmd run build
if errorlevel 1 (
    echo [ERROR] React build failed.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  3/4  Packaging Standalone Electron Binary (v%APP_VERSION%)...
echo ============================================================
taskkill /F /IM OneGitVault.exe 2>nul
call npx.cmd electron-packager . OneGitVault --platform=win32 --arch=x64 --icon=assets/icons/onegitvault.ico --app-version=%APP_VERSION% --build-version=%APP_VERSION% --out=release --overwrite --prune=true
if errorlevel 1 (
    echo [ERROR] Electron packaging failed.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  4/4  Compiling Inno Setup Installer...
echo ============================================================
mkdir "%PROJECT_DIR%\release\setup" 2>nul
"%ISCC%" "/DAppVersion=%APP_VERSION%" "%ISS_FILE%"
if errorlevel 1 (
    echo [ERROR] Inno Setup compilation failed.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  SUCCESS!
echo  Portable App:  %PROJECT_DIR%\release\OneGitVault-win32-x64\OneGitVault.exe
echo  Setup Package: %PROJECT_DIR%\release\setup\OneGitVault-Setup-%APP_VERSION%.exe
echo ============================================================
echo.
pause

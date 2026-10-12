@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo       SMART XEROX - WINDOWS PRINTER CONNECTOR SETUP
echo ========================================================
echo.
echo This wizard configures direct printing for this shop computer.
echo.

:: 1. Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found on this computer.
    echo Please install Node.js (v18 or newer) from https://nodejs.org
    echo and re-run this setup script.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js runtime detected.
echo.

:: 2. Prompt for Pairing Code
echo Step 1: Shop Pairing
echo Open your Owner Dashboard in the browser:
echo 1. Go to "Printer Setup" (or Setup Wizard Step 3)
echo 2. Click "Pair Windows PC" to generate a 6-digit code.
echo.
set /p PAIR_CODE="Enter the 6-digit Pairing Code: "

if "%PAIR_CODE%"=="" (
    echo [ERROR] No code entered. Aborting setup.
    pause
    exit /b 1
)

echo.
echo Pairing this Windows PC with your Smart Xerox shop...
node src\connector.js --pair %PAIR_CODE%

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Pairing failed. Please verify the code and try again.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo Step 2: Auto-Start on Windows Boot (Optional)
echo ========================================================
set /p AUTO_START="Do you want the connector to start automatically when Windows starts? (Y/N): "

if /i "%AUTO_START%"=="Y" (
    echo Creating startup shortcut...
    set SCRIPT_DIR=%~dp0
    set VBS_FILE=%TEMP%\create_shortcut.vbs
    
    echo Set oWS = WScript.CreateObject("WScript.Shell") > "!VBS_FILE!"
    echo sLinkFile = oWS.SpecialFolders("Startup") ^& "\SmartXeroxConnector.lnk" >> "!VBS_FILE!"
    echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "!VBS_FILE!"
    echo oLink.TargetPath = "!SCRIPT_DIR!start.bat" >> "!VBS_FILE!"
    echo oLink.WorkingDirectory = "!SCRIPT_DIR!" >> "!VBS_FILE!"
    echo oLink.WindowStyle = 7 >> "!VBS_FILE!"
    echo oLink.Description = "Smart Xerox Direct Printing Desktop Connector" >> "!VBS_FILE!"
    echo oLink.Save >> "!VBS_FILE!"
    
    cscript //nologo "!VBS_FILE!"
    del "!VBS_FILE!"
    echo [OK] Auto-start shortcut added to your Windows Startup folder.
)

echo.
echo ========================================================
echo SETUP COMPLETE!
echo Starting Smart Xerox Connector now...
echo ========================================================
start "" "%~dp0start.bat"
echo Connector is now running in the background.
pause

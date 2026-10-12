@echo off
setlocal

echo ========================================================
echo     SMART XEROX - CONNECTOR UNINSTALLER
echo ========================================================
echo.

set STARTUP_LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SmartXeroxConnector.lnk
if exist "%STARTUP_LNK%" (
    del "%STARTUP_LNK%"
    echo [OK] Removed auto-start shortcut from Windows Startup folder.
) else (
    echo [INFO] No startup shortcut was found.
)

:: Reset config credentials
echo Resetting local credentials...
if exist "%~dp0config.json" (
    del "%~dp0config.json"
    echo [OK] Cleared saved connector tokens and configuration.
)

echo.
echo ========================================================
echo Uninstallation completed successfully.
echo ========================================================
pause

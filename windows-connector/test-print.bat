@echo off
cd /d "%~dp0"

echo ========================================================
echo     SMART XEROX - HARDWARE TEST PRINT TOOL
echo ========================================================
echo.
set /p TARGET_PRINTER="Enter exact printer name (or press Enter for 'Microsoft Print to PDF'): "

if "%TARGET_PRINTER%"=="" (
    set TARGET_PRINTER=Microsoft Print to PDF
)

echo.
echo Sending test page to "%TARGET_PRINTER%"...
node src\connector.js --test-print "%TARGET_PRINTER%"

echo.
pause

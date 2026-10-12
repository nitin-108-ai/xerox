@echo off
title Smart Xerox Direct Print Connector
cd /d "%~dp0"

echo ========================================================
echo     SMART XEROX - DIRECT PRINT CONNECTOR RUNNER
echo ========================================================
echo.
echo Starting direct printing monitoring daemon...
node src\connector.js

if %errorlevel% neq 0 (
    echo.
    echo Connector stopped with an error code.
    pause
)

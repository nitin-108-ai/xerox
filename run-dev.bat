@echo off
echo ========================================================
echo Starting Smart Xerox Platform (Full-Stack Unified Server)
echo ========================================================
set NODE_PATH=C:\Users\nitin\smart_xerox_build\backend\node_modules
cd backend
"C:\Users\nitin\smart_xerox_build\backend\node_modules\.bin\tsx.cmd" src/server.ts
pause

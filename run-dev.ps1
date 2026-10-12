# Smart Xerox PowerShell Development Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting Smart Xerox Platform (Full-Stack Unified Server)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

$env:NODE_PATH = "C:\Users\nitin\smart_xerox_build\backend\node_modules"
Set-Location "$PSScriptRoot\backend"
& "C:\Users\nitin\smart_xerox_build\backend\node_modules\.bin\tsx.cmd" src/server.ts

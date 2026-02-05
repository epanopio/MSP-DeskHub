@echo off
setlocal

REM Run DeskHub backend from repo root (this BAT can be moved with the repo)
set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%deskhub-backend"

if not exist "%BACKEND_DIR%\server.js" (
  echo ERROR: Could not find "%BACKEND_DIR%\server.js"
  pause
  exit /b 1
)

cd /d "%BACKEND_DIR%"
echo Starting DeskHub server on http://localhost:4051 ...

REM Open login page shortly after server starts
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:4051/login.html'"

node server.js

pause

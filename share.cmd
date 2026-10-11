@echo off
rem Double-click to share a private, temporary preview link with a friend.
rem Optional: share.cmd 4   (keeps the link open for 4 hours; default is 2, maximum 24)
rem Close this window or press Ctrl+C to stop sharing.

cd /d "%~dp0"
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\cloudflared;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Ask Claude to install it, or get it from https://nodejs.org/
  pause
  exit /b 1
)

if not exist node_modules (
  echo First run: installing Eleventy. This takes a minute...
  call npm ci
)

if "%~1"=="" (
  node scripts\share.mjs
) else (
  node scripts\share.mjs --hours %~1
)
echo.
pause

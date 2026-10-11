@echo off
rem Double-click to preview the site on this computer at http://localhost:8080/
rem It rebuilds automatically when a file changes. Close this window to stop.

cd /d "%~dp0"
set "PATH=%ProgramFiles%\nodejs;%PATH%"

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

start "" "http://localhost:8080/52weeks/index.html"
call npx eleventy --serve --port=8080
pause

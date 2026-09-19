@echo off
setlocal

set "ROOT=%~dp0"
set "FRONTEND=%ROOT%cyber-attack-map"
set "BACKEND=%ROOT%cyber-attack-map-server"

echo Starting Jagra Baya Maya...
echo   Backend : http://localhost:3000
echo   Frontend: http://localhost:5173
echo.

start "Jagra Backend" cmd /k "cd /d "%BACKEND%" && pnpm start"
start "Jagra Frontend" cmd /k "cd /d "%FRONTEND%" && pnpm dev"

echo Both servers launched in separate windows.
echo Close those windows to stop them.
endlocal

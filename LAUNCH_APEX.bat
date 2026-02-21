@echo off
title APEX Launcher
echo ================================================
echo   APEX EduAI Vault - Automatic Launcher
echo ================================================
echo.

:: Kill processes by name to be sure
echo [*] Cleaning up existing APEX processes...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM uvicorn.exe /T >nul 2>&1

:: Double check ports 8000 and 5173
echo [*] Clearing ports 8000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 2 /nobreak >nul

:: Start Backend in new window
echo [*] Starting Backend (http://127.0.0.1:8000)...
start "APEX Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && uvicorn app.main:app --host 127.0.0.1 --port 8000"

:: Wait for backend to come up
echo [*] Waiting for backend to start...
timeout /t 8 /nobreak >nul

:: Start Frontend in new window
echo [*] Starting Frontend (http://127.0.0.1:5173)...
start "APEX Frontend" cmd /k "cd /d %~dp0frontend && npm run dev -- --host 127.0.0.1"

echo.
echo ================================================
echo   Both servers launching in separate windows!
echo   Backend  : http://127.0.0.1:8000
echo   Frontend : http://127.0.0.1:5173
echo ================================================
echo.
echo [*] Opening browser in 10 seconds...
timeout /t 10 /nobreak >nul
start "" "http://127.0.0.1:5173"


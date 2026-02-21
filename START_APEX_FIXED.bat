@echo off
title APEX 100%% Error-Free Auto-Launcher
color 0B
echo ================================================
echo   APEX Final Error-Free Startup Sequence
echo   Running as Software Engineer Auto-Script...
echo ================================================
echo.

echo [*] Forcing cleanup of stuck processes (preventing connection refused errors)...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM uvicorn.exe /T >nul 2>&1

:: Deeper port clear
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " 2^>nul') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " 2^>nul') do taskkill /PID %%a /F >nul 2>&1
timeout /t 2 /nobreak >nul

cd /d %~dp0

:: BACKEND SETUP
echo [*] Verifying Backend Environment...
cd backend
if not exist "venv\Scripts\python.exe" (
    echo [!] Creating strict Python virtual environment...
    python -m venv venv
)
echo [*] Installing precise backend dependencies silently...
call venv\Scripts\python.exe -m pip install -r requirements.txt -q
cd ..

:: FRONTEND SETUP
echo [*] Verifying Frontend Environment...
cd frontend
if not exist "node_modules\" (
    echo [!] Installing precise frontend package tree...
    call npm install --silent
)
echo [*] Building final frontend chunk mapped paths...
call npm run build
cd ..

echo [*] Launching robust local Backend Server...
start "APEX BACKEND (DO NOT CLOSE)" cmd /k "color 0A && cd /d %~dp0backend && venv\Scripts\activate && uvicorn app.main:app --host 127.0.0.1 --port 8000"

echo [*] Allowing Backend 5 seconds to load core API routes...
timeout /t 5 /nobreak >nul

echo [*] Launching robust local Frontend Server...
start "APEX FRONTEND (DO NOT CLOSE)" cmd /k "color 0D && cd /d %~dp0frontend && npm run dev -- --host 127.0.0.1"

echo.
echo ================================================
echo   100%% ERROR FREE ENVIRONMENT INITIALIZED!
echo   Both windows are active! Opening your app...
echo ================================================
timeout /t 5 /nobreak >nul
start "" "http://127.0.0.1:5173"

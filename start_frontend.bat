@echo off
echo =========================================
echo   APEX EduAI Vault - Frontend Startup
echo =========================================
cd /d %~dp0frontend

echo [1/2] Installing dependencies (if needed)...
call npm install --silent

echo [2/2] Starting Vite dev server on http://localhost:5173
echo Press Ctrl+C to stop.
npm run dev

@echo off
echo =========================================
echo   APEX EduAI Vault - Backend Startup
echo =========================================
cd /d %~dp0backend

echo [1/3] Checking virtual environment...
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

echo [2/3] Activating environment and installing dependencies...
call venv\Scripts\activate

echo     Installing packages (first run may take a while for PyTorch ~200MB)...
pip install -r requirements.txt --quiet

echo [3/3] Starting FastAPI server on http://127.0.0.1:8000
echo Press Ctrl+C to stop.
echo.
echo NOTE: The local AI model (Flan-T5) will download on first use (~1GB).
echo       While it loads, the system uses a built-in Smart Mock engine.
echo       Set APEX_AI_MODEL=google/flan-t5-small in your .env for low-RAM machines.
echo.

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

if errorlevel 1 (
    echo.
    echo ERROR: Server failed to start. Check the output above.
    pause
)

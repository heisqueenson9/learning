@echo off
cd backend
start /b venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000
cd ..\frontend
npm run dev

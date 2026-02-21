# APEX - EduAI Vault

## System Overview
APEX is an AI-powered quiz, exam, and IA generation system designed for tertiary institutions.
It uses self-hosted AI models (Mistral/LLaMA) to generate content from uploaded materials or topics.

## Requirements
- Python 3.8+
- Node.js 16+
- PostgreSQL (ensure running on localhost:5432, user: postgres, pass: password, db: apex_db)

## Setup & Run

### 1. Database
Ensure PostgreSQL is running and create a database named `apex_db`.
Adjust `backend/app/core/config.py` if your credentials differ.

### 2. Backend
Run `start_backend.bat`. This will:
- Create a virtual environment `venv`
- Install dependencies (FastAPI, PyTorch, Transformers, etc.)
- Start the server at `http://localhost:8000`

### 3. Frontend
Run `start_frontend.bat`. This will:
- Install NPM packages
- Start the React app at `http://localhost:5173`

### 4. AI Engine
The system attempts to load `mistralai/Mistral-7B-Instruct-v0.1` from HuggingFace.
First run will download ~15GB. Ensure stable internet.
If download fails or no GPU, it runs in **DEMO MODE** (mock generation).

## Usage
1. Open Frontend.
2. Login with Phone Number and Transaction ID (Demo: Use TXN ID `DEMO123` for instant access).
3. Dashboard shows expiry.
4. "Generate Exam": Upload PDF or Enter Topic.
5. Download generated exam.


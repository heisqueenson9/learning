"""
APEX — Local launcher
Starts backend (uvicorn) and frontend (npm run dev) and writes status to run_status.txt
Run with: python run_all.py
"""
import subprocess
import sys
import os
import time
import threading

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, "backend")
FRONTEND = os.path.join(ROOT, "frontend")
VENV_PYTHON = os.path.join(BACKEND, "venv", "Scripts", "python.exe")
VENV_UVICORN = os.path.join(BACKEND, "venv", "Scripts", "uvicorn.exe")
NPM = "npm"

STATUS_FILE = os.path.join(ROOT, "run_status.txt")


def write_status(msg):
    with open(STATUS_FILE, "a", encoding="utf-8") as f:
        f.write(msg + "\n")
    print(msg)


def tail_proc(proc, label, logfile):
    with open(logfile, "w", encoding="utf-8") as f:
        for line in iter(proc.stdout.readline, b""):
            decoded = line.decode("utf-8", errors="replace").rstrip()
            f.write(decoded + "\n")
            f.flush()
            print(f"[{label}] {decoded}")


def main():
    open(STATUS_FILE, "w").close()  # reset
    write_status("=== APEX Local Launcher ===")

    # ── 1. Install backend deps ─────────────────────────────────────────────
    write_status("[1/4] Installing backend dependencies...")
    r = subprocess.run(
        [VENV_PYTHON, "-m", "pip", "install", "-r", "requirements.txt", "-q"],
        cwd=BACKEND,
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        write_status(f"  pip error: {r.stderr[:500]}")
    else:
        write_status("  Backend deps OK.")

    # ── 2. Install frontend deps ────────────────────────────────────────────
    write_status("[2/4] Installing frontend dependencies (npm install)...")
    r2 = subprocess.run(
        [NPM, "install", "--silent"],
        cwd=FRONTEND,
        capture_output=True,
        text=True,
        shell=True,
    )
    if r2.returncode != 0:
        write_status(f"  npm install error: {r2.stderr[:500]}")
    else:
        write_status("  Frontend deps OK.")

    # ── 3. Start backend ────────────────────────────────────────────────────
    write_status("[3/4] Starting backend on http://127.0.0.1:8000 ...")
    backend_log = os.path.join(ROOT, "backend_output.log")
    backend_proc = subprocess.Popen(
        [VENV_UVICORN, "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    t1 = threading.Thread(target=tail_proc, args=(backend_proc, "BACKEND", backend_log), daemon=True)
    t1.start()
    time.sleep(4)
    if backend_proc.poll() is not None:
        write_status(f"  BACKEND CRASHED (exit {backend_proc.returncode}). Check backend_output.log")
    else:
        write_status(f"  Backend running (PID {backend_proc.pid}) → http://127.0.0.1:8000")

    # ── 4. Start frontend ───────────────────────────────────────────────────
    write_status("[4/4] Starting frontend on http://localhost:5173 ...")
    frontend_log = os.path.join(ROOT, "frontend_output.log")
    frontend_proc = subprocess.Popen(
        [NPM, "run", "dev"],
        cwd=FRONTEND,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        shell=True,
    )
    t2 = threading.Thread(target=tail_proc, args=(frontend_proc, "FRONTEND", frontend_log), daemon=True)
    t2.start()
    time.sleep(6)
    if frontend_proc.poll() is not None:
        write_status(f"  FRONTEND CRASHED (exit {frontend_proc.returncode}). Check frontend_output.log")
    else:
        write_status(f"  Frontend running (PID {frontend_proc.pid}) → http://localhost:5173")

    write_status("\n✅ Both servers started. Open http://localhost:5173 in your browser.")
    write_status("   Press Ctrl+C here to stop both servers.\n")

    try:
        backend_proc.wait()
    except KeyboardInterrupt:
        write_status("Shutting down...")
        backend_proc.terminate()
        frontend_proc.terminate()


if __name__ == "__main__":
    main()

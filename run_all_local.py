import subprocess
import time
import os
import sys

# Paths
base_dir = r"c:\Users\USER\Desktop\APEX"
backend_dir = os.path.join(base_dir, "backend")
frontend_dir = os.path.join(base_dir, "frontend")

# python path
python_exe = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
# npm path
npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"

print("Starting APEX Servers...")

try:
    # Open log files
    be_out = open(os.path.join(base_dir, "backend.log"), "w")
    fe_out = open(os.path.join(base_dir, "frontend.log"), "w")

    # Start backend
    be_proc = subprocess.Popen(
        [python_exe, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=backend_dir,
        stdout=be_out,
        stderr=subprocess.STDOUT
    )
    print(f"Backend started PID: {be_proc.pid}")

    # Start frontend
    fe_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir,
        stdout=fe_out,
        stderr=subprocess.STDOUT
    )
    print(f"Frontend started PID: {fe_proc.pid}")

    print("Both servers started! Keeping python script alive so they keep running...")
    
    # Keep the script running to keep child processes alive
    while True:
        time.sleep(10)
        
except KeyboardInterrupt:
    print("Stopping servers...")
    be_proc.terminate()
    fe_proc.terminate()
    be_out.close()
    fe_out.close()
    sys.exit(0)

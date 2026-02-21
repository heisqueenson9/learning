import subprocess
import os
import sys
import time

frontend_dir = r"c:\Users\USER\Desktop\APEX\frontend"
vite_cmd = r"node_modules\.bin\vite.cmd"

try:
    with open("vite_log.txt", "w") as f:
        # Start dev server
        proc = subprocess.Popen([vite_cmd, "dev", "--host", "127.0.0.1"], cwd=frontend_dir, stdout=f, stderr=subprocess.STDOUT)
        print("Vite Dev Server spawned. Waiting 5s...")
        time.sleep(5)
        # Check if process is still running
        if proc.poll() is not None:
            print("Vite process died with code:", proc.poll())
        else:
            print("Vite is running.")
except Exception as e:
    print("Error:", e)

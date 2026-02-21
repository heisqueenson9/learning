import subprocess
import os
import sys
import time

base = r"c:\Users\USER\Desktop\APEX"

with open(r"c:\Users\USER\Desktop\APEX\frontend.log", "w") as f_out:
    subprocess.Popen("npm.cmd run dev", cwd=os.path.join(base, "frontend"), shell=True, stdout=f_out, stderr=f_out)

with open(r"c:\Users\USER\Desktop\APEX\backend.log", "w") as b_out:
    cmd = r"venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
    subprocess.Popen(cmd, cwd=os.path.join(base, "backend"), shell=True, stdout=b_out, stderr=b_out)

print("Servers started.")
time.sleep(5)

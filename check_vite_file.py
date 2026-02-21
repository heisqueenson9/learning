import subprocess
import os

with open(r"c:\Users\USER\Desktop\APEX\check_vite_output.txt", "w") as f:
    f.write("Starting build check...\n")
    try:
        res = subprocess.run("npx.cmd vite build", cwd=r"c:\Users\USER\Desktop\APEX\frontend", shell=True, capture_output=True, text=True, timeout=30)
        f.write("STDOUT:\n" + res.stdout + "\n")
        f.write("STDERR:\n" + res.stderr + "\n")
        f.write("EXIT CODE: " + str(res.returncode) + "\n")
    except Exception as e:
        f.write(f"Exception: {e}\n")

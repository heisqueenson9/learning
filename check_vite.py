import subprocess
import os

print("Running Vite Build Check...")
res = subprocess.run("npx.cmd vite build", cwd=r"c:\Users\USER\Desktop\APEX\frontend", shell=True, capture_output=True, text=True)
print("STDOUT:", res.stdout)
print("STDERR:", res.stderr)
print("EXIT CODE:", res.returncode)

import subprocess
import time

try:
    with open("c:\\Users\\USER\\Desktop\\APEX\\frontend\\vite_log.txt", "w", encoding="utf-8") as f:
        print("Starting vite...", file=f)
        f.flush()
        process = subprocess.Popen(
            ["npx.cmd", "vite", "--port", "5173", "--host"],
            cwd="c:\\Users\\USER\\Desktop\\APEX\\frontend",
            stdout=f,
            stderr=subprocess.STDOUT
        )
        print("Waiting for process...", file=f)
        f.flush()
        time.sleep(10) # let it run and capture 10 secs
        print("Done waiting.", file=f)
        f.flush()
except Exception as e:
    with open("c:\\Users\\USER\\Desktop\\APEX\\frontend\\vite_err.txt", "w") as f2:
        f2.write(str(e))

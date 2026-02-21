import subprocess

try:
    with open("c:\\Users\\USER\\Desktop\\APEX\\frontend\\dev_capture.log", "w") as f:
        process = subprocess.Popen(
            ["npm.cmd", "run", "dev"],
            cwd="c:\\Users\\USER\\Desktop\\APEX\\frontend",
            stdout=f,
            stderr=subprocess.STDOUT
        )
        print(f"Spawned npm (PID: {process.pid})")
except Exception as e:
    print(f"Failed to spawn npm: {e}")

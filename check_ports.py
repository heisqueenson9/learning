import urllib.request
def check_port(port):
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{port}", timeout=2)
        print(f"Port {port} is OPEN & RESPONDING")
    except Exception as e:
        print(f"Port {port} error: {e}")

check_port(8000)
check_port(5173)

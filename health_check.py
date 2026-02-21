import urllib.request
try:
    print(urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3).read().decode('utf-8'))
except Exception as e:
    print(e)

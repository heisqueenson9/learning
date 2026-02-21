import http.server
import socketserver
import os

PORT = 5173
DIRECTORY = "dist"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    # SPA Routing: if a file isn't found, return index.html
    def do_GET(self):
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            self.path = "/index.html"
        return super().do_GET()

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at port {PORT}")
        httpd.serve_forever()
except Exception as e:
    print(f"Server error: {e}")

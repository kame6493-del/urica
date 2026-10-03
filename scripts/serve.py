# -*- coding: utf-8 -*-
"""dist を配るだけの小さなサーバー。Windows の http.server は .js を text/plain で返し、
ブラウザがモジュールを読まず真っ白になるため、型を明示する。 python scripts/serve.py <フォルダ> <ポート>"""
import functools
import http.server
import sys

class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
                      ".svg": "image/svg+xml", ".json": "application/json", ".html": "text/html"}
    def log_message(self, *a):
        pass

if __name__ == "__main__":
    folder, port = sys.argv[1], int(sys.argv[2])
    http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(H, directory=folder)).serve_forever()

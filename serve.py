#!/usr/bin/env python3
"""本地预览产品目录:  python3 serve.py   →  http://localhost:4173

products.json 要用 fetch 读取，所以请用 http 打开，不要直接双击 index.html。
"""

import functools
import http.server
import os
import socketserver

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "4173"))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 开发时不缓存，改完 products.json 刷新就能看到
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("127.0.0.1", PORT), functools.partial(Handler, directory=ROOT)) as httpd:
    print("产品目录 http://localhost:%d" % PORT)
    httpd.serve_forever()

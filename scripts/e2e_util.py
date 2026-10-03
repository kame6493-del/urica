# -*- coding: utf-8 -*-
"""E2E と画面写真で共通: ビルドしたフォルダを空いているポートで配る。
固定ポートは並行して動いている別のアプリとぶつかった(別のアプリの画面を撮っていた)ので、中身も確かめる。"""
import os
import socket
import subprocess
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def free_port():
    with socket.socket() as so:
        so.bind(("127.0.0.1", 0))
        return so.getsockname()[1]


def serve(folder):
    port = free_port()
    p = subprocess.Popen([sys.executable, os.path.join(ROOT, "scripts", "serve.py"), os.path.join(ROOT, folder), str(port)],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            html = urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=1).read().decode("utf-8")
        except Exception:
            time.sleep(0.2)
            continue
        if "<title>ウリカ手帳</title>" not in html:
            p.terminate()
            raise RuntimeError("別のアプリが応答した")
        return p, f"http://127.0.0.1:{port}/"
    p.terminate()
    raise RuntimeError("server did not start")

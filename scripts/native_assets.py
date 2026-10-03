# -*- coding: utf-8 -*-
"""Android / iOS のアイコンと起動画面を、アプリのロゴから作って差し替える(Capacitor の既定の絵を残さない)。
npx cap add の後に1回流す。  python scripts/native_assets.py"""
import glob
import os

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
IOS = os.path.join(ROOT, "ios", "App", "App", "Assets.xcassets")
BLUE = "#2c6e9b"
PAPER = (246, 244, 239)

DROP = """<path d="M50 18 C 64 38, 74 50, 74 63 a24 24 0 0 1 -48 0 C26 50, 36 38, 50 18 Z" fill="#e3eef6"/>
<path d="M36 66 l9 -10 l8 7 l11 -14" fill="none" stroke="#2c6e9b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="64" cy="49" r="4.5" fill="#d0533c"/>"""


def render(pw, svg_inner, size, view="0 0 100 100"):
    page = pw.new_page(viewport={"width": size, "height": size})
    page.set_content(f"<html><body style='margin:0;background:transparent'><svg xmlns='http://www.w3.org/2000/svg' viewBox='{view}' width='{size}' height='{size}'>{svg_inner}</svg></body></html>")
    path = os.path.join(ROOT, "scripts", "e2e_out", f"_tmp_{size}.png")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    page.screenshot(path=path, omit_background=True)
    page.close()
    return Image.open(path).convert("RGBA")


def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        square = render(b, f"<rect width='100' height='100' rx='18' fill='{BLUE}'/>{DROP}", 1024)
        rounded = render(b, f"<circle cx='50' cy='50' r='50' fill='{BLUE}'/><g transform='translate(8 6) scale(.84)'>{DROP}</g>", 1024)
        # 適応アイコンの前景: 108dp のうち中央 66dp が必ず見える範囲。しずくをその中に収める
        fg = render(b, f"<g transform='translate(27 26) scale(.54)'>{DROP}</g>", 1024)
        full = render(b, f"<rect width='100' height='100' fill='{BLUE}'/>{DROP}", 1024)
        b.close()

    sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for d, s in sizes.items():
        square.resize((s, s), Image.LANCZOS).save(os.path.join(RES, f"mipmap-{d}", "ic_launcher.png"))
        rounded.resize((s, s), Image.LANCZOS).save(os.path.join(RES, f"mipmap-{d}", "ic_launcher_round.png"))
        fs = int(s * 108 / 48)
        fg.resize((fs, fs), Image.LANCZOS).save(os.path.join(RES, f"mipmap-{d}", "ic_launcher_foreground.png"))
    with open(os.path.join(RES, "values", "ic_launcher_background.xml"), "w", encoding="utf-8") as f:
        f.write(f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{BLUE.upper()}</color>\n</resources>\n')

    def splash(w, h):
        im = Image.new("RGB", (w, h), PAPER)
        s = int(min(w, h) * 0.28)
        logo = square.resize((s, s), Image.LANCZOS)
        im.paste(logo, ((w - s) // 2, (h - s) // 2), logo)
        return im

    for f in glob.glob(os.path.join(RES, "drawable*", "splash.png")):
        w, h = Image.open(f).size
        splash(w, h).save(f)

    # iOS: アイコンは透明なしの 1024 1枚。起動画面は 2732 角3枚
    full.convert("RGB").save(os.path.join(IOS, "AppIcon.appiconset", "AppIcon-512@2x.png"))
    for f in glob.glob(os.path.join(IOS, "Splash.imageset", "*.png")):
        splash(2732, 2732).save(f)
    for f in glob.glob(os.path.join(ROOT, "scripts", "e2e_out", "_tmp_*.png")):
        os.remove(f)
    print("ok")


if __name__ == "__main__":
    main()

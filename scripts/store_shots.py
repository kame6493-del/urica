# -*- coding: utf-8 -*-
"""ストア用の素材を作る。先に npm run build:e2e を済ませておく。  python scripts/store_shots.py
- store/icon-1024.png(App Store)/ store/play-icon-512.png / store/play-feature-1024x500.png
- store/ios/shot_N.png(1290x2796)/ store/play/shot_N.png(1080x1920)
画面は見本の記録(架空)で撮る。上に一言の見出しを付ける。"""
import os
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE = os.path.join(ROOT, "store")
for d in ["ios", "play"]:
    os.makedirs(os.path.join(STORE, d), exist_ok=True)

sys.path.insert(0, os.path.join(ROOT, "scripts"))
from e2e_util import serve  # noqa: E402

LOGO = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="{s}" height="{s}">
<rect width="100" height="100" rx="{rx}" fill="#2c6e9b"/>
<path d="M50 18 C 64 38, 74 50, 74 63 a24 24 0 0 1 -48 0 C26 50, 36 38, 50 18 Z" fill="#e3eef6"/>
<path d="M36 66 l9 -10 l8 7 l11 -14" fill="none" stroke="#2c6e9b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="64" cy="49" r="4.5" fill="#d0533c"/></svg>"""

FONT = '"Hiragino Sans","Noto Sans JP","Yu Gothic UI","Meiryo",sans-serif'

SHOTS = [
    ("today", "毎日の記録は、押すだけ。", "お薬・水分・お酒・プリン体を1画面で"),
    ("uric", "尿酸値の変化が、ひと目で。", "目標の線と発作の日も一緒にグラフへ"),
    ("attack", "痛む場所を、足の図で。", "いつ・どこが・どれくらい痛んだか"),
    ("report", "診察で、数か月をそのまま。", "受診用のまとめ・CSV で書き出し"),
    ("notify", "飲む時刻に、お知らせ。", "記録は端末の中だけ。アカウント不要・広告なし"),
]


def frame_html(url, w, h, title, sub, app_w):
    cap_h = int(h * 0.17)
    scale = w / app_w * 0.86
    app_h = int((h - cap_h) / scale)
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;width:{w}px;height:{h}px;overflow:hidden;background:linear-gradient(170deg,#2c6e9b 0%,#244f6e 100%);font-family:{FONT}}}
.cap{{height:{cap_h}px;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#fff;text-align:center;padding:0 {int(w*0.06)}px}}
.cap b{{font-size:{int(w*0.062)}px;letter-spacing:.02em;line-height:1.3}}
.cap span{{font-size:{int(w*0.033)}px;opacity:.85;margin-top:{int(w*0.012)}px}}
.phone{{position:absolute;left:{int(w*0.07)}px;top:{cap_h}px;width:{app_w}px;height:{app_h}px;transform:scale({scale});transform-origin:0 0;border-radius:28px 28px 0 0;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.25)}}
iframe{{border:0;width:{app_w}px;height:{app_h}px;background:#f6f4ef}}
</style></head><body><div class="cap"><b>{title}</b><span>{sub}</span></div>
<div class="phone"><iframe id="app" src="{url}"></iframe></div></body></html>"""


def drive(frame, kind):
    """iframe の中のアプリを、撮りたい画面まで進める"""
    frame.wait_for_selector(".today")
    tab = lambda name: frame.locator("nav.tabs button", has_text=name).click()
    if kind == "uric":
        tab("尿酸値")
        frame.locator(".chip", has_text="全期間").click()
    elif kind == "attack":
        tab("発作")
        frame.click("button:has-text('発作を記録する')")
        frame.locator(".feet .spot[aria-label='右足の親指']").click()
        frame.locator(".feet .spot[aria-label='右足の甲']").click()
        frame.locator(".pain button", has_text="7").first.click()
    elif kind == "report":
        tab("その他")
        frame.click(".menu button:has-text('受診用のまとめ')")
        frame.locator(".chip", has_text="1年").click()
    elif kind == "notify":
        tab("その他")
        frame.click(".menu button:has-text('通知')")
    frame.evaluate("window.scrollTo(0, 0)")
    frame.wait_for_timeout(400)


def main():
    proc, base = serve("dist-e2e")
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch()
            # アイコン(角は OS が丸めるので四角で塗りきる)
            pg = b.new_page(viewport={"width": 1024, "height": 1024})
            pg.set_content(f"<html><body style='margin:0'>{LOGO.format(s=1024, rx=0)}</body></html>")
            pg.screenshot(path=os.path.join(STORE, "icon-1024.png"))
            pg.set_viewport_size({"width": 512, "height": 512})
            pg.set_content(f"<html><body style='margin:0'>{LOGO.format(s=512, rx=0)}</body></html>")
            pg.screenshot(path=os.path.join(STORE, "play-icon-512.png"))
            # Play のフィーチャー画像
            pg.set_viewport_size({"width": 1024, "height": 500})
            # style 属性の中に FONT の二重引用符を入れると属性が切れるので、style 要素に書く
            pg.set_content(f"""<html><head><style>
body{{margin:0;width:1024px;height:500px;background:linear-gradient(160deg,#2c6e9b,#1f4c6b);font-family:{FONT};color:#fff;display:flex;align-items:center;gap:48px;padding:0 72px;box-sizing:border-box}}
.t{{font-size:64px;font-weight:700;letter-spacing:.04em}} .s{{font-size:30px;margin-top:8px;opacity:.95}} .f{{font-size:22px;margin-top:22px;opacity:.8}}
</style></head><body>{LOGO.format(s=200, rx=24)}
<div><div class="t">ウリカ手帳</div><div class="s">尿酸値と痛風の、毎日の記録帳</div>
<div class="f">尿酸値のグラフ・お薬・水分・お酒・発作・受診用のまとめ</div></div></body></html>""")
            pg.screenshot(path=os.path.join(STORE, "play-feature-1024x500.png"))
            pg.close()

            for target, (w, h, dpr, app_w) in {"ios": (430, 932, 3, 390), "play": (360, 640, 3, 390)}.items():
                for i, (kind, title, sub) in enumerate(SHOTS, 1):
                    ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr, locale="ja-JP")
                    page = ctx.new_page()
                    page.set_content(frame_html(base + "?demo=1&premium=1", w, h, title, sub, app_w))
                    frame = page.frames[1]
                    frame.wait_for_load_state()
                    drive(frame, kind)
                    page.screenshot(path=os.path.join(STORE, target, f"shot_{i}.png"))
                    ctx.close()
                    print("saved", target, i, kind)
            b.close()
    finally:
        proc.terminate()


if __name__ == "__main__":
    main()

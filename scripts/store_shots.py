# -*- coding: utf-8 -*-
"""Play のストア素材を作る(v1.1 の見た目)。先に npm run build:e2e と python scripts/icon_assets.py を済ませておく。
python scripts/store_shots.py
- store/play/screenshots/shot_1〜5.png(1080x1920)
- store/play/feature_1024x500.png
アイコン(store/icon-1024.png・store/play/icon_512.png)は icon_assets.py が作る。
iOS はこの版では出し直さないので store/ios/ は作り直さない。
画面は見本の記録(架空)で撮る。値段と「無料」の文字は写さない(写っていたら止まる)。"""
import base64
import os
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE = os.path.join(ROOT, "store")
ART = os.path.join(ROOT, "src", "assets", "art")
os.makedirs(os.path.join(STORE, "play", "screenshots"), exist_ok=True)

sys.path.insert(0, os.path.join(ROOT, "scripts"))
from e2e_util import serve  # noqa: E402

FONT = '"Hiragino Sans","Noto Sans JP","Yu Gothic UI","Meiryo",sans-serif'


def data_uri(name):
    with open(os.path.join(ART, name), "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


SHOTS = [
    ("home", "尿酸値と毎日を、<em>ひと目で。</em>", "最新の値と今日の記録が、ホームにまとまる"),
    ("graph", "尿酸値の変化を、<em>グラフで。</em>", "目標の線・7.0の線・発作の日も一緒に"),
    ("attack", "痛む場所を、<em>足の図で。</em>", "いつ・どこが・どれくらい痛んだか"),
    ("record", "毎日の記録は、<em>押すだけ。</em>", "お薬・水分・お酒。さかのぼって記録も"),
    ("report", "受診のときに、<em>そのまま。</em>", "受診用まとめ・文章とCSVで書き出し"),
]


def frame_html(url, w, h, title, sub, app_w):
    cap_h = int(h * 0.19)
    scale = w / app_w * 0.80
    app_h = int((h - cap_h) / scale) + 40
    left = int((w - app_w * scale) / 2)
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;width:{w}px;height:{h}px;overflow:hidden;font-family:{FONT};
 background:radial-gradient(120% 60% at 50% 0%,#dff4f2 0,#eef6f8 55%,#f3f7f9 100%)}}
.cap{{height:{cap_h}px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 {int(w*0.05)}px;color:#16263a}}
.cap b{{font-size:{int(w*0.066)}px;letter-spacing:.02em;line-height:1.3;font-weight:800}}
.cap b em{{font-style:normal;color:#0b8184}}
.cap span{{font-size:{int(w*0.034)}px;color:#4b5563;margin-top:{int(w*0.014)}px}}
.phone{{position:absolute;left:{left}px;top:{cap_h}px;width:{app_w}px;height:{app_h}px;transform:scale({scale});transform-origin:0 0;
 border-radius:44px 44px 0 0;overflow:hidden;background:#f3f7f9;border:10px solid #16263a;border-bottom:0;box-shadow:0 20px 50px rgba(22,38,58,.22)}}
iframe{{border:0;width:{app_w}px;height:{app_h}px;background:#f3f7f9}}
</style></head><body><div class="cap"><b>{title}</b><span>{sub}</span></div>
<div class="phone"><iframe id="app" src="{url}"></iframe></div></body></html>"""


def drive(frame, kind):
    """iframe の中のアプリを、撮りたい画面まで進める"""
    frame.wait_for_selector(".home")
    tab = lambda name: frame.locator("nav.tabs button", has_text=name).click()
    if kind == "graph":
        tab("グラフ")
        frame.locator(".seg-btn", has_text="全期間").click()
    elif kind == "attack":
        tab("記録")
        frame.click("#card-attack button:has-text('発作を記録')")
        frame.locator(".feet .spot[aria-label='右足の親指']").click()
        frame.locator(".feet .spot[aria-label='右足の甲']").click()
        frame.locator(".pain button", has_text="7").first.click()
        frame.evaluate("window.scrollTo(0, document.querySelector('.feet').getBoundingClientRect().top + window.scrollY - 120)")
        frame.wait_for_timeout(300)
        return
    elif kind == "record":
        tab("記録")
    elif kind == "report":
        tab("まとめ")
        frame.locator(".seg-btn", has_text="1年").click()
    frame.evaluate("window.scrollTo(0, 0)")
    frame.wait_for_timeout(400)


def main():
    proc, base = serve("dist-e2e")
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch()
            # Play のフィーチャー画像(1024x500)。絵は見本から切り出した物
            pg = b.new_page(viewport={"width": 1024, "height": 500})
            pg.set_content(f"""<html><head><style>
body{{margin:0;width:1024px;height:500px;overflow:hidden;font-family:{FONT};color:#16263a;
 background:radial-gradient(90% 120% at 15% 10%,#e3f6f4 0,#f3f8fa 60%,#eaf3f6 100%);position:relative}}
.l{{position:absolute;left:64px;top:70px;width:640px}}
.logo{{width:116px;height:116px;border-radius:26px;box-shadow:0 10px 24px rgba(11,129,132,.25)}}
.t{{font-size:66px;font-weight:800;letter-spacing:.05em;margin-top:18px;line-height:1.1}}
.s{{font-size:28px;color:#0b8184;font-weight:700;margin-top:10px}}
.f{{display:flex;gap:12px;margin-top:30px}}
.f div{{white-space:nowrap;display:flex;align-items:center;gap:8px;background:#fff;border-radius:16px;padding:8px 14px 8px 8px;font-size:19px;font-weight:700;box-shadow:0 4px 12px rgba(22,38,58,.08)}}
.f img{{width:40px;height:40px}}
.p{{position:absolute;right:40px;bottom:0;width:330px}}
.c{{position:absolute;right:300px;top:46px;width:120px;opacity:.95}}
</style></head><body>
<div class="l"><img class="logo" src="{data_uri('logo.png')}"><div class="t">ウリカ手帳</div><div class="s">尿酸値・痛風の記録</div>
<div class="f"><div><img src="{data_uri('f_chart.png')}">尿酸値</div><div><img src="{data_uri('empty_pills.png')}">お薬</div><div><img src="{data_uri('empty_foot.png')}">発作</div><div><img src="{data_uri('f_doc.png')}">受診用まとめ</div></div></div>
<img class="p" src="{data_uri('person.png')}">
</body></html>""")
            pg.wait_for_timeout(300)
            pg.screenshot(path=os.path.join(STORE, "play", "feature_1024x500.png"))
            pg.close()

            w, h, dpr, app_w = 360, 640, 3, 390
            for i, (kind, title, sub) in enumerate(SHOTS, 1):
                ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr, locale="ja-JP")
                page = ctx.new_page()
                page.set_content(frame_html(base + "?demo=1&premium=1", w, h, title, sub, app_w))
                frame = page.frames[1]
                frame.wait_for_load_state()
                drive(frame, kind)
                # 写る範囲に値段や「無料」が無いこと
                txt = frame.evaluate("document.body.innerText") + page.evaluate("document.body.innerText")
                if "無料" in txt or "¥" in txt or "円" in txt:
                    raise SystemExit(f"shot {i} ({kind}) に値段か「無料」が写っています")
                page.screenshot(path=os.path.join(STORE, "play", "screenshots", f"shot_{i}.png"))
                ctx.close()
                print("saved play", i, kind)
            b.close()
    finally:
        proc.terminate()


if __name__ == "__main__":
    main()

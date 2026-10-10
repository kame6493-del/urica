# -*- coding: utf-8 -*-
"""アイコン一式を見本の絵(design/ref/urica_ref_9_1254x1254.png。ChatGPT に作らせた案)から作る。
python scripts/icon_assets.py

やること
1. 元絵の角丸の青緑の地を、なめらかな色の変化(2次式)として見積もり、地と違う所=ノートの絵を切り出す(透明つき)
2. 切り出したノートを、見積もった地の色の変化の上に置き直して、次を書き出す
   - iOS AppIcon 1024(不透明・角は OS が丸める)
   - Android 適応アイコン: 前景=ノート(透明)、背景=単色。安全域(108dp の中央 66dp の円)に収める
   - Android 旧形式の四角・丸のアイコン、起動画面
   - ストア: store/icon-1024.png・store/play/icon_512.png
   - アプリの中: public/icon.png(タブの絵)・src/assets/art/logo.png
3. 安全域と丸く切ったときの見え方の確認画像 scripts/e2e_out/icon_check.png
"""
import glob
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "design", "ref", "urica_ref_9_1254x1254.png")
if not os.path.exists(SRC):
    SRC = os.path.join(os.path.expanduser("~"), "Downloads", "urica_ref_9_1254x1254.png")
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
IOS = os.path.join(ROOT, "ios", "App", "App", "Assets.xcassets")
OUT = os.path.join(ROOT, "scripts", "e2e_out")
os.makedirs(OUT, exist_ok=True)

# 元絵の角丸の地(実測): x 167..1085, y 162..1065
RX0, RX1, RY0, RY1, RAD = 167, 1085, 162, 1065, 205
BG_SOLID = (10, 150, 178)  # 適応アイコンの背景。地の真ん中あたりの色
SPLASH_BG = (245, 249, 251)


def rounded_mask(w, h, box, r):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle(box, radius=r, fill=255)
    return m


def fit_gradient(a, sel):
    """選んだ画素の色を x, y の2次式で近似する(チャンネルごと)"""
    ys, xs = np.nonzero(sel)
    X = xs / 1254.0
    Y = ys / 1254.0
    A = np.stack([np.ones_like(X), X, Y, X * X, X * Y, Y * Y], 1)
    coefs = [np.linalg.lstsq(A, a[ys, xs, c], rcond=None)[0] for c in range(3)]
    return coefs


def eval_gradient(coefs, w, h, x0=0.0, y0=0.0, sx=1.0, sy=1.0):
    """(x0 + i*sx, y0 + j*sy) を元絵の座標として地の色を出す"""
    xs = (x0 + np.arange(w) * sx) / 1254.0
    ys = (y0 + np.arange(h) * sy) / 1254.0
    X, Y = np.meshgrid(xs, ys)
    out = np.zeros((h, w, 3))
    for c in range(3):
        k = coefs[c]
        out[:, :, c] = k[0] + k[1] * X + k[2] * Y + k[3] * X * X + k[4] * X * Y + k[5] * Y * Y
    return np.clip(out, 0, 255)


def cut_notebook():
    im = Image.open(SRC).convert("RGB")
    a = np.asarray(im).astype(float)
    inside = np.asarray(rounded_mask(1254, 1254, (RX0, RY0, RX1, RY1), RAD)) > 0
    inner = np.asarray(rounded_mask(1254, 1254, (RX0 + 14, RY0 + 14, RX1 - 14, RY1 - 14), RAD - 14)) > 0
    yy, xx = np.mgrid[0:1254, 0:1254]
    band = inner & ((xx < 250) | (xx > 1000) | (yy < 238) | (yy > 995))
    coefs = fit_gradient(a, band)
    bg = eval_gradient(coefs, 1254, 1254)
    diff = np.sqrt(((a - bg) ** 2).sum(2))
    # ノートの本体(地との差が大きい所)。内側の穴(しずくや線の中)は埋める
    core = (diff > 60) & inner
    m = Image.fromarray((~core).astype(np.uint8) * 255).copy()  # 配列から作った画像は書き込めないので複製する
    for seed in [(RX0 + 40, (RY0 + RY1) // 2), ((RX0 + RX1) // 2, RY0 + 30), ((RX0 + RX1) // 2, RY1 - 30), (RX1 - 30, (RY0 + RY1) // 2)]:
        ImageDraw.floodfill(m, seed, 128)
    box = (xx >= 255) & (xx <= 1005) & (yy >= 232) & (yy <= 1000)
    filled = (np.asarray(m) != 128) & box
    # 本体のまわりの淡い光・影は半透明で残す。枠の縁の照り返しは絵ではないので、外へ向けてぼかして消す
    soft = np.clip((diff - 10) / 40, 0, 1)
    fx = np.clip(np.minimum(xx - 215, 1045 - xx) / 40, 0, 1)
    fy = np.clip(np.minimum(yy - 192, 1040 - yy) / 40, 0, 1)
    alpha = np.maximum(soft * fx * fy * inner, filled.astype(float))
    # 半透明の縁は地の色が混ざっているので、地を引いて色を戻す(白っぽい縁が出ないように)
    al = np.maximum(alpha, 1e-3)[:, :, None]
    fg = np.clip((a - bg * (1 - al)) / al, 0, 255)
    rgba = np.dstack([fg, alpha * 255]).astype(np.uint8)
    nb = Image.fromarray(rgba)
    bbox = nb.getbbox()
    return nb.crop(bbox), bbox, coefs


def gradient_square(coefs, size, box=(RX0, RY0, RX1, RY1)):
    """元の地の色の変化を、正方形いっぱいに広げて描く"""
    x0, y0, x1, y1 = box
    g = eval_gradient(coefs, size, size, x0, y0, (x1 - x0) / size, (y1 - y0) / size)
    return Image.fromarray(g.astype(np.uint8))


def place(base, nb, nb_bbox, scale_to_rect):
    """元絵と同じ位置関係でノートを置く(scale_to_rect=1 で元絵どおり)"""
    size = base.size[0]
    rw = RX1 - RX0
    k = size / rw * scale_to_rect
    w, h = int(nb.width * k), int(nb.height * k)
    n = nb.resize((w, h), Image.LANCZOS)
    cx_src = (nb_bbox[0] + nb_bbox[2]) / 2 - (RX0 + RX1) / 2
    cy_src = (nb_bbox[1] + nb_bbox[3]) / 2 - (RY0 + RY1) / 2
    cx = size / 2 + cx_src * k
    cy = size / 2 + cy_src * k
    out = base.convert("RGBA")
    out.alpha_composite(n, (int(cx - w / 2), int(cy - h / 2)))
    return out


def max_radius(img):
    """中心から、見えている画素までのいちばん遠い距離(画像の幅に対する割合)"""
    a = np.asarray(img)[:, :, 3]
    ys, xs = np.nonzero(a > 40)
    c = img.size[0] / 2
    return float(np.sqrt((xs - c) ** 2 + (ys - c) ** 2).max() / img.size[0])


def main():
    nb, bbox, coefs = cut_notebook()
    nb.save(os.path.join(OUT, "icon_notebook_cut.png"))

    # iOS / ストア: 地を正方形いっぱいに広げ、ノートは元絵と同じ大きさの割合
    full = place(gradient_square(coefs, 1024), nb, bbox, 1.0).convert("RGB")
    full.save(os.path.join(IOS, "AppIcon.appiconset", "AppIcon-512@2x.png"))
    full.save(os.path.join(ROOT, "store", "icon-1024.png"))
    full.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, "store", "play", "icon_512.png"))
    os.makedirs(os.path.join(ROOT, "src", "assets", "art"), exist_ok=True)
    full.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, "src", "assets", "art", "logo.png"))
    rnd = full.resize((192, 192), Image.LANCZOS).convert("RGBA")
    rnd.putalpha(rounded_mask(192, 192, (0, 0, 191, 191), 42))
    rnd.save(os.path.join(ROOT, "public", "icon.png"))

    # Android 適応アイコンの前景: 108 の中央 66 の円(半径 33/108 = 0.3056)に収める
    fg_size = 432
    k = 1.0
    for _ in range(40):
        fg = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        fg = place(fg, nb, bbox, k * 0.62)
        if max_radius(fg) <= 0.300:
            break
        k *= 0.98
    print("foreground max radius", round(max_radius(fg), 4), "(safe 0.3056)")
    sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for d, s in sizes.items():
        fs = int(s * 108 / 48)
        fg.resize((fs, fs), Image.LANCZOS).save(os.path.join(RES, f"mipmap-{d}", "ic_launcher_foreground.png"))
        # 旧形式(Android 7 以前): 四角は元絵と同じ角丸、丸は円で切る
        sq = place(gradient_square(coefs, 512), nb, bbox, 0.86)
        sq.putalpha(rounded_mask(512, 512, (8, 8, 503, 503), 96))
        sq.resize((s, s), Image.LANCZOS).save(os.path.join(RES, f"mipmap-{d}", "ic_launcher.png"))
        rd = place(gradient_square(coefs, 512), nb, bbox, 0.80)
        circ = Image.new("L", (512, 512), 0)
        ImageDraw.Draw(circ).ellipse((8, 8, 503, 503), fill=255)
        rd.putalpha(circ)
        rd.resize((s, s), Image.LANCZOS).save(os.path.join(RES, f"mipmap-{d}", "ic_launcher_round.png"))
    hexbg = "#%02X%02X%02X" % BG_SOLID
    with open(os.path.join(RES, "values", "ic_launcher_background.xml"), "w", encoding="utf-8") as f:
        f.write(f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{hexbg}</color>\n</resources>\n')

    # 起動画面: 明るい地の真ん中にアイコン(角丸)
    logo = full.convert("RGBA")

    def splash(w, h):
        im = Image.new("RGB", (w, h), SPLASH_BG)
        s = int(min(w, h) * 0.30)
        lg = logo.resize((s, s), Image.LANCZOS)
        lg.putalpha(rounded_mask(s, s, (0, 0, s - 1, s - 1), int(s * 0.22)))
        im.paste(lg, ((w - s) // 2, (h - s) // 2), lg)
        return im

    for f in glob.glob(os.path.join(RES, "drawable*", "splash.png")):
        w, h = Image.open(f).size
        splash(w, h).save(f)
    for f in glob.glob(os.path.join(IOS, "Splash.imageset", "*.png")):
        splash(2732, 2732).save(f)

    # 確かめる絵: 前景+背景を、四角(角丸)・丸・しずく形・安全域の線で並べる
    S = 324
    layer = Image.new("RGBA", (S, S), BG_SOLID + (255,))
    layer.alpha_composite(fg.resize((S, S), Image.LANCZOS))
    sheet = Image.new("RGB", (S * 5 + 60, S + 80), (255, 255, 255))
    d = ImageDraw.Draw(sheet)
    vis = int(S * 72 / 108)
    off = (S - vis) // 2
    crop = layer.crop((off, off, off + vis, off + vis)).resize((S, S), Image.LANCZOS)
    shapes = []
    m1 = Image.new("L", (S, S), 0); ImageDraw.Draw(m1).ellipse((0, 0, S - 1, S - 1), fill=255); shapes.append(("丸", m1))
    m2 = rounded_mask(S, S, (0, 0, S - 1, S - 1), int(S * 0.22)); shapes.append(("角丸", m2))
    m3 = Image.new("L", (S, S), 0); ImageDraw.Draw(m3).rounded_rectangle((0, 0, S - 1, S - 1), radius=S // 2, fill=255)
    ImageDraw.Draw(m3).rectangle((S // 2, S // 2, S - 1, S - 1), fill=255); shapes.append(("しずく", m3))
    full_layer = layer.copy()
    dd = ImageDraw.Draw(full_layer)
    r = S * 33 / 108
    dd.ellipse((S / 2 - r, S / 2 - r, S / 2 + r, S / 2 + r), outline=(255, 60, 60, 255), width=2)
    dd.rectangle((off, off, off + vis, off + vis), outline=(255, 220, 0, 255), width=2)
    sheet.paste(full_layer.convert("RGB"), (10, 40))
    for i, (_, mk) in enumerate(shapes, 1):
        sheet.paste(crop.convert("RGB"), (10 + i * (S + 10), 40), mk)
    ios = full.resize((S, S), Image.LANCZOS)
    sheet.paste(ios, (10 + 4 * (S + 10), 40), rounded_mask(S, S, (0, 0, S - 1, S - 1), int(S * 0.2237)))
    d.text((12, 10), "108dp layer (red=66dp safe circle, yellow=72dp visible) / circle / squircle / teardrop / iOS", fill=(0, 0, 0))
    sheet.save(os.path.join(OUT, "icon_check.png"))
    print("ok")


if __name__ == "__main__":
    main()

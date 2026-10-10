# -*- coding: utf-8 -*-
"""画面で使う絵を、見本の画像(design/ref/urica_ref_N_941x1672.png。ChatGPT に作らせた案)から切り出す。
python scripts/ref_art.py  → src/assets/art/*.png(透明つき)と確認用 scripts/e2e_out/art_check.png

- 切り出した所のまわりの白っぽい地を、縁からつながっている所だけ透明にする(絵の中の白は残す)
- 見本は 941px 幅で小さいので 3 倍に拡大して保存する(画面では 1/3 前後の大きさで出す)
- 見本に無い物は描かない。足の右側は左足の絵を左右反転して使う
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(ROOT, "design", "ref")
if not os.path.exists(os.path.join(REF, "urica_ref_1_941x1672.png")):
    REF = os.path.join(os.path.expanduser("~"), "Downloads")
OUT = os.path.join(ROOT, "src", "assets", "art")
os.makedirs(OUT, exist_ok=True)

# 名前: (見本の番号, 切り出す枠, 地とみなす色の差, 拡大率)
ART = {
    # 人物・場面
    "person": (8, (40, 325, 193, 470), 16, 3),          # はじめての案内の人物
    "doctor": (6, (345, 1060, 455, 1212), 12, 3),       # 受診用まとめの医師
    "foot_l": (1, (745, 298, 813, 441), 10, 4),         # 発作の記録の足(左足)。右足はこれを反転
    # 空の状態
    "empty_chart": (8, (628, 1345, 690, 1408), 8, 3),
    "empty_pills": (8, (732, 1354, 795, 1406), 8, 3),
    "empty_foot": (8, (838, 1345, 898, 1408), 8, 3),
    # お酒の器
    "beer": (4, (266, 434, 316, 486), 10, 3),
    "highball": (4, (338, 434, 378, 486), 10, 3),
    "sake": (4, (408, 434, 450, 486), 10, 3),
    "wine": (4, (270, 526, 308, 578), 10, 3),
    "shochu": (4, (336, 530, 380, 576), 10, 3),
    "beer_big": (4, (676, 1100, 740, 1165), 8, 3),
    # 完全版・購入
    "crown": (7, (318, 280, 392, 350), 8, 3),
    "crown_party": (7, (722, 250, 910, 380), 8, 3),
    "pw_tag": (7, (40, 1190, 110, 1258), 8, 3),
    "pw_noad": (7, (260, 1190, 335, 1258), 8, 3),
    "pw_user": (7, (485, 1190, 555, 1258), 8, 3),
    "pw_shield": (7, (705, 1190, 775, 1258), 8, 3),
    "f_chart": (7, (35, 1375, 95, 1430), 8, 3),
    "f_doc": (7, (232, 1375, 292, 1430), 8, 3),
    "f_export": (7, (428, 1375, 488, 1430), 8, 3),
    "f_fork": (7, (35, 1490, 95, 1545), 8, 3),
    "f_bell": (7, (232, 1490, 292, 1545), 8, 3),
    "f_cal": (7, (428, 1490, 488, 1545), 8, 3),
    # 設定・案内
    "priv_lock": (8, (597, 1117, 668, 1186), 8, 3),
    "no_diag": (8, (598, 1205, 668, 1280), 8, 3),
    "drop": (4, (688, 16, 750, 76), 8, 3),
    "calendar": (8, (40, 1135, 105, 1200), 8, 3),
}


def cut(idx, box, thr, scale):
    im = Image.open(os.path.join(REF, f"urica_ref_{idx}_941x1672.png")).convert("RGB").crop(box)
    im = im.resize((im.width * scale, im.height * scale), Image.LANCZOS)
    a = np.asarray(im).astype(float)
    h, w = a.shape[:2]
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bgc = np.median(border, 0)
    dist = np.sqrt(((a - bgc) ** 2).sum(2))
    near = dist < thr
    m = Image.fromarray(near.astype(np.uint8) * 255).copy()
    px = m.load()
    for x in range(w):
        for y in (0, h - 1):
            if px[x, y] == 255:
                ImageDraw.floodfill(m, (x, y), 128)
    for y in range(h):
        for x in (0, w - 1):
            if px[x, y] == 255:
                ImageDraw.floodfill(m, (x, y), 128)
    bgmask = np.asarray(m) == 128
    soft = np.clip((dist - 2) / max(1, thr - 2), 0, 1)
    alpha = np.where(bgmask, soft * 0.0, 1.0)
    # 境目はなめらかに(地とつながる所の縁だけ、色の差で半透明)
    edge = np.asarray(Image.fromarray((~bgmask).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3))) > 0
    alpha = np.where(bgmask & edge, soft, alpha)
    al = np.maximum(alpha, 1e-3)[:, :, None]
    fg = np.clip((a - bgc * (1 - al)) / al, 0, 255)
    out = Image.fromarray(np.dstack([fg, alpha * 255]).astype(np.uint8))
    bb = out.getbbox()
    if bb:
        pad = 2 * scale
        bb = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(w, bb[2] + pad), min(h, bb[3] + pad))
        out = out.crop(bb)
    return out


def main():
    made = {}
    for name, (idx, box, thr, scale) in ART.items():
        im = cut(idx, box, thr, scale)
        im.save(os.path.join(OUT, f"{name}.png"), optimize=True)
        made[name] = im
    # 人物は背景の雲と一体なので、まわりを楕円にぼかして地になじませる
    pr = made["person"]
    w, h = pr.size
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h * 0.45) / (h * 0.62)) ** 2)
    fade = np.clip((1.0 - r) / 0.18, 0, 1)
    pa = np.asarray(pr).astype(float)
    pa[:, :, 3] = pa[:, :, 3] * fade
    made["person"] = Image.fromarray(pa.astype(np.uint8))
    made["person"].save(os.path.join(OUT, "person.png"), optimize=True)
    made["foot_r"] = made["foot_l"].transpose(Image.FLIP_LEFT_RIGHT)
    made["foot_r"].save(os.path.join(OUT, "foot_r.png"), optimize=True)

    # 確かめる絵: 灰色と白の地に並べる(透明の抜け・白い縁が無いか)
    W = 1400
    sheet = Image.new("RGB", (W, 4000), (255, 255, 255))
    d = ImageDraw.Draw(sheet)
    x = y = 10
    rowh = 0
    for name, im in made.items():
        t = im
        if t.height > 300:
            t = t.resize((int(t.width * 300 / t.height), 300), Image.LANCZOS)
        cw = t.width * 2 + 30
        if x + cw > W:
            x = 10
            y += rowh + 26
            rowh = 0
        d.text((x, y), name, fill=(200, 0, 0))
        for k, col in enumerate([(150, 160, 170), (255, 255, 255)]):
            bgim = Image.new("RGB", t.size, col)
            sheet.paste(bgim, (x + k * (t.width + 6), y + 14))
            sheet.paste(t, (x + k * (t.width + 6), y + 14), t)
        x += cw
        rowh = max(rowh, t.height + 14)
    sheet = sheet.crop((0, 0, W, y + rowh + 30))
    sheet.save(os.path.join(ROOT, "scripts", "e2e_out", "art_check.png"))
    print(len(made), "art files")


if __name__ == "__main__":
    main()

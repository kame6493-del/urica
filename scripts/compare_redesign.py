# -*- coding: utf-8 -*-
"""見本(design/ref)と作り直した画面(scripts/e2e_out/w375)を並べた比較画像を作る。
先に python scripts/e2e.py を流しておく。  python scripts/compare_redesign.py
→ docs/compare_redesign_1〜8.png と docs/compare_redesign_all.png"""
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(ROOT, "design", "ref")
SHOT = os.path.join(ROOT, "scripts", "e2e_out", "w375")
OUT = os.path.join(ROOT, "docs")
os.makedirs(OUT, exist_ok=True)
FB = ImageFont.truetype("C:/Windows/Fonts/YuGothB.ttc", 30)
FM = ImageFont.truetype("C:/Windows/Fonts/YuGothM.ttc", 21)
FS = ImageFont.truetype("C:/Windows/Fonts/YuGothM.ttc", 18)

# 見本ごとに: 題・並べる画面(ファイル名, 上から何割の所から切るか)・見本と違えた所
PAIRS = [
    ("ホーム・グラフ・記録・発作の記録",
     [("30_demo_home", 0), ("35_demo_graph_all", 0), ("31_demo_record", 0), ("33_demo_attack_edit", 0.12)],
     ["見本の「やや高め・高め・要注意」の段階は出典が無いので使わず、出典のある 7.0 と主治医と決めた目標だけで印を付けた",
      "下のタブは見本どおり ホーム・記録・グラフ・まとめ・設定。発作の一覧は「記録」の中の切り替え",
      "腫れ・熱感のスイッチは記録の項目が無いので出さない"]),
    ("検査値の履歴・入力",
     [("34_demo_graph", 0.38), ("36_demo_lab_form", 0), ("06_graph_free", 0), ("02b_home_filled", 0)],
     ["検査値の詳細画面とカレンダー画面は今無い機能なので作らない",
      "見本の「参考: 正常範囲 3.0-7.0」は 3.0 の出典が無いので、出典つきの 7.0 だけを示す",
      "数字のキーパッドは端末のキーボードを使う(入力欄+−0.1 ボタン)"]),
    ("お薬・通知",
     [("39_demo_meds", 0), ("04_meds", 0), ("41_demo_notify", 0), ("31_demo_record", 0)],
     ["服薬率の輪(この30日)とオン/オフの切り替えは見本どおり。中身は今までの記録から数える",
      "朝食後などのタイミング・色分け・15分後に再通知・飲まなかった は今無い機能なので作らない"]),
    ("水分・お酒・プリン体",
     [("31_demo_record", 0.2), ("31_demo_record", 0.48), ("05_record_free", 0.3), ("30_demo_home", 0.3)],
     ["お酒は見本の器の絵で押すだけ。休肝日は今までどおり「この7日の休肝日」(連続日数は数えない)",
      "プリン体は食品ごとの量を収録しない方針なので、レバー等の食品の絵は出さず、自分で登録した物だけ",
      "水分の時刻ごとの記録・週グラフ・継続バッジは今無いので作らない"]),
    ("発作の一覧・記録(足の図)",
     [("32_demo_attacks", 0), ("33_demo_attack_edit", 0.12), ("11_attacks", 0), ("10_attack_form", 0.1)],
     ["足の絵は見本から切り出し(右足は左足の反転)。押す点と赤い印は見本どおり",
      "発作のカレンダー・時間帯・きっかけの分析は記録の項目が無いので作らない"]),
    ("受診用まとめ・書き出し",
     [("37_demo_report", 0), ("37_demo_report", 0.32), ("37_demo_report", 0.7), ("12_report_locked", 0)],
     ["印刷用レイアウト(PDF)は今無いので出さない。Excel・Google ドキュメントに似た書類の絵は使わない",
      "医師の絵は見本から切り出し。まとめの中身(数え方)は今までと同じ"]),
    ("完全版・買い切り",
     [("20_paywall", 0), ("20_paywall", 0.38), ("03_record_empty", 0.55), ("21_thanks", 0)],
     ["見本の値段(1,800円)は使わない。ボタンにはストアから取った実際の値段を出す(今までどおり)",
      "比較の中身・商品ID・買い切り1つの課金は変えていない"]),
    ("はじめての案内・設定・空の状態",
     [("01_welcome", 0), ("38_demo_settings", 0), ("14_settings_free", 0), ("02_home_empty", 0)],
     ["パスコードロック・目標の設定手順・ウィジェットは今無い機能なので作らない",
      "案内の最後に「診断・治療の判断はしない・主治医と薬剤師の指示に従う」の注意を残し、読んでから始める"]),
]


def tile(name, top, w=400, h=820):
    im = Image.open(os.path.join(SHOT, name + ".png")).convert("RGB")
    k = w / im.width
    im = im.resize((w, int(im.height * k)), Image.LANCZOS)
    y = int(im.height * top)
    y = max(0, min(y, im.height - h)) if im.height > h else 0
    t = Image.new("RGB", (w, h), (243, 247, 249))
    t.paste(im.crop((0, y, w, min(im.height, y + h))), (0, 0))
    return t


def main():
    pages = []
    for i, (title, shots, notes) in enumerate(PAIRS, 1):
        ref = Image.open(os.path.join(REF, f"urica_ref_{i}_941x1672.png")).convert("RGB")
        ref = ref.resize((int(ref.width * 1700 / ref.height), 1700), Image.LANCZOS)
        W = ref.width + 40 + 2 * 410 + 30
        H = 90 + 1700 + 40 + 30 * len(notes) + 30
        c = Image.new("RGB", (W, H), (255, 255, 255))
        d = ImageDraw.Draw(c)
        d.text((20, 20), f"見本 {i}: {title}", font=FB, fill=(22, 38, 58))
        d.text((ref.width + 60, 28), "作り直した画面(375幅・見本の記録)", font=FM, fill=(11, 129, 132))
        c.paste(ref, (20, 80))
        for k, (n, top) in enumerate(shots):
            t = tile(n, top)
            x = ref.width + 60 + (k % 2) * 410
            y = 80 + (k // 2) * 850
            c.paste(t, (x, y))
            d.rectangle((x - 1, y - 1, x + t.width, y + t.height), outline=(207, 219, 225))
            d.text((x + 4, y + t.height + 4), n, font=FS, fill=(107, 114, 128))
        y = 80 + 1700 + 30
        d.text((20, y), "見本と違えた所と理由", font=FM, fill=(220, 38, 38))
        for k, s in enumerate(notes):
            d.text((40, y + 32 + k * 30), "・" + s, font=FM, fill=(31, 41, 55))
        c = c.crop((0, 0, W, y + 32 + len(notes) * 30 + 20))
        p = os.path.join(OUT, f"compare_redesign_{i}.png")
        c.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(p, optimize=True)  # 軽くする
        pages.append(c)
        print(p, c.size)
    # 一覧: 2列×4段に縮めて並べる
    tw = 1000
    th = max(int(p.height * tw / p.width) for p in pages)
    allc = Image.new("RGB", (tw * 2 + 30, th * 4 + 50), (255, 255, 255))
    for k, p in enumerate(pages):
        s = p.resize((tw, int(p.height * tw / p.width)), Image.LANCZOS)
        allc.paste(s, (10 + (k % 2) * (tw + 10), 10 + (k // 2) * (th + 10)))
    allc.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(os.path.join(OUT, "compare_redesign_all.png"), optimize=True)
    print("all", allc.size)


if __name__ == "__main__":
    main()

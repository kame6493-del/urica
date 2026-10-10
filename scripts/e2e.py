# -*- coding: utf-8 -*-
"""ビルドした物(dist と dist-e2e)をブラウザで開いて、主な流れを押して回る確認。
先に npm run build と npm run build:e2e を済ませておく。  python scripts/e2e.py [幅 ...](既定 375 430)
- dist      : 製品ビルド。課金キーが空なので「購入の準備中です」が出ること
- dist-e2e  : 疑似購入が入ったビルド。完全版の機能を確かめる
画面写真は幅ごとに scripts/e2e_out/w<幅>/ に置く(全部の画面を撮る)。"""
import json
import os
import sys
from datetime import date, timedelta

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WIDTHS = [int(x) for x in sys.argv[1:]] or [375, 430]
fails, errors = [], []
TODAY = date.today()
D = lambda n: (TODAY + timedelta(days=n)).isoformat()
W = None
OUT = None


def check(cond, msg):
    print(("OK  " if cond else "NG  ") + f"[{W}] " + msg, flush=True)
    if not cond:
        fails.append(f"[{W}] {msg}")


sys.path.insert(0, os.path.join(ROOT, "scripts"))
from e2e_util import serve  # noqa: E402


def shot(page, name):
    page.wait_for_timeout(150)
    page.screenshot(path=os.path.join(OUT, name + ".png"), full_page=True)


def no_hscroll(page, name):
    sw = page.evaluate("document.documentElement.scrollWidth")
    check(sw <= W, f"{name}: 横にはみ出さない (scrollWidth {sw})")


def new_page(browser):
    ctx = browser.new_context(viewport={"width": W, "height": 844 if W < 400 else 932}, device_scale_factor=2, locale="ja-JP", accept_downloads=True)
    page = ctx.new_page()
    page.on("console", lambda m: errors.append(f"{page.url} {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("dialog", lambda d: d.accept())
    return ctx, page


def tab(page, name):
    page.locator("nav.tabs button", has_text=name).click()


def seg(page, name):
    page.locator(".seg-btn", has_text=name).first.click()


def back(page):
    page.click("button[aria-label='もどる']")


def add_lab(page, day, val, note=""):
    page.click("button:has-text('検査値を入力する')")
    page.wait_for_selector(".lab-form")
    page.fill("#ua-form input[type=date]", day)
    page.fill("#ua-form input[placeholder='例 6.4']", val)
    if note:
        page.fill("#ua-form textarea", note)
    page.click("#ua-form button:has-text('この内容で保存する')")


def run(b, PROD, E2E):
    # ===== 製品ビルド =====
    ctx, page = new_page(b)
    page.goto(PROD)
    page.wait_for_selector(".welcome")
    shot(page, "01_welcome")
    no_hscroll(page, "はじめての案内")
    check(page.locator("text=診断・治療の判断はしません").count() == 1, "初回に医療判断をしない旨が出る")
    page.click("text=注意を読みました。はじめる")
    page.wait_for_selector(".home")
    shot(page, "02_home_empty")
    check(page.locator(".home .empty", has_text="まだ記録がありません").count() == 1, "ホーム: 尿酸値が無いときは空の案内")
    tab(page, "記録")
    page.wait_for_selector(".today")
    shot(page, "03_record_empty")
    check(page.locator("#card-purine").count() == 0 and page.locator(".locked-card", has_text="プリン体の記録").count() == 1, "無料ではプリン体の記録は完全版の案内")

    # 薬を登録して飲んだ印
    page.click("text=薬を登録する")
    page.fill("input[placeholder='お薬手帳の名前どおりに']", "テスト薬A")
    page.locator("input[type=time]").fill("20:00")
    page.click("text=時刻を足す")
    page.click(".meds button:has-text('登録する')")
    check(page.locator(".card.med h2", has_text="テスト薬A").count() == 1, "薬が登録される")
    shot(page, "04_meds")
    no_hscroll(page, "お薬の登録")
    back(page)
    page.wait_for_selector(".dose")
    check(page.locator(".dose").count() == 2, "今日飲む分が時刻ごとに2つ出る(08:00 と 20:00)")
    page.locator(".dose").first.click()
    check(page.locator(".dose.done").count() == 1 and page.locator("#card-meds .tag", has_text="1/2").count() == 1, "飲んだ印がつく 1/2")

    # 水分・お酒
    page.click("text=+200 mL")
    page.click("text=+500 mL")
    check(page.locator("#card-water .big-num").inner_text().startswith("700"), "水分 200+500=700")
    page.locator("#card-drink .drink").first.click()
    check(page.locator("#card-drink .list li").count() == 2 and "350 mL" in page.locator("#card-drink .list").inner_text(), "お酒の記録(ビール 350)")
    # 前の日にさかのぼって記録
    page.click("button[aria-label='前の日']")
    check("きのう" in page.locator(".pagehead").inner_text(), "前の日に移れる")
    page.click("text=+200 mL")
    check(page.locator("#card-water .big-num").inner_text().startswith("200"), "前の日の水分は別に数える")
    page.click("button[aria-label='次の日']")
    check(page.locator("#card-water .big-num").inner_text().startswith("700"), "今日に戻ると 700")
    check(page.locator("button[aria-label='次の日']").is_disabled(), "今日より先へは進めない")
    shot(page, "05_record_free")
    no_hscroll(page, "今日の記録")
    tab(page, "ホーム")
    check("1/2 飲んだ" in page.locator(".tiles").inner_text() and "700" in page.locator(".tiles").inner_text(), "ホームの今日の記録に薬と水分が出る")

    # 尿酸値
    tab(page, "グラフ")
    page.wait_for_selector(".uric")
    add_lab(page, D(-200), "7.8")
    page.wait_for_selector(".uric")
    add_lab(page, D(-20), "6.9", "朝いち")
    page.wait_for_selector(".uric")
    check(page.locator("text=検査値を保存しました").count() == 1, "保存のお知らせが出る")
    check(page.locator(".stat3.boxes").inner_text().count("6.9") >= 1, "最新の尿酸値 6.9")
    check("-0.9" in page.locator(".stat3.boxes").inner_text(), "前回との差 -0.9")
    check(page.locator("svg.chart circle[r='4.2']").count() == 2, "グラフに2点")
    check(page.locator(".labs li").count() == 2 and page.locator(".labs .badge.warn", has_text="7.0 を超えています").count() == 1, "履歴に2件・7.8 は 7.0 超えの印")
    page.click("button:has-text('検査値を入力する')")
    page.fill("#ua-form input[placeholder='例 6.4']", "99")
    page.click("#ua-form button:has-text('この内容で保存する')")
    check(page.locator("#ua-form .err").count() == 1, "ありえない値は弾く")
    page.fill("#ua-form input[placeholder='例 6.4']", "")
    page.click("button[aria-label='0.1 上げる']")
    check(page.locator("#ua-form input[placeholder='例 6.4']").input_value() == "7.0", "＋で前回の値から 0.1 上がる(6.9→7.0)")
    page.fill("#ua-form input[placeholder='例 6.4']", "")
    shot(page, "07_lab_form")
    no_hscroll(page, "検査値の入力")
    back(page)
    shot(page, "06_graph_free")
    no_hscroll(page, "尿酸値のグラフ")
    seg(page, "全期間")
    page.wait_for_selector(".paywall")
    check(page.locator("button:has-text('購入の準備中です')").count() == 1, "製品ビルドで課金キーが空なら「購入の準備中です」")
    shot(page, "08_paywall_prod")
    no_hscroll(page, "完全版")
    back(page)
    tab(page, "ホーム")
    check(page.locator(".ua-card .big-num").inner_text().startswith("6.9"), "ホームに最新の尿酸値")
    shot(page, "02b_home_filled")

    # 目標の線
    tab(page, "グラフ")
    page.click("text=主治医と決めた目標の線を引く")
    page.fill("input[placeholder='主治医と決めた値']", "6.0")
    page.click("button:has-text('保存する')")
    check(page.locator(".ok-text", has_text="保存しました").count() == 1, "目標を保存")
    shot(page, "09_target")
    back(page)
    check(page.locator(".legend", has_text="目標 6.0").count() == 1, "グラフに目標の線の凡例")

    # 発作
    tab(page, "記録")
    page.click("#card-attack button:has-text('発作を記録')")
    page.wait_for_selector(".attack-form")
    page.locator(".feet .spot[aria-label='右足の親指']").click()
    check(page.locator(".chip.on", has_text="右足の親指").count() == 1, "足の図で押すと場所が選ばれる")
    page.locator(".pain button", has_text="8").first.click()
    check("強い痛み" in page.locator(".pain-now").inner_text(), "痛み 8 は「強い痛み」と出る")
    shot(page, "10_attack_form")
    no_hscroll(page, "発作の記録")
    page.click(".attack-form button:has-text('この内容で記録する')")
    page.wait_for_selector(".attacks .attack")
    check("右足の親指" in page.locator(".attack").first.inner_text(), "発作の一覧に出る")
    check(page.locator(".stat3", has_text="続いている").count() == 1, "続いている発作")
    page.click("text=今日おさまった")
    check(page.locator(".attack.done").count() == 1, "おさまった日を入れられる")
    shot(page, "11_attacks")
    no_hscroll(page, "発作の一覧")
    tab(page, "ホーム")
    check("前の発作から" in page.locator(".tiles").inner_text(), "ホームの発作の札")

    # まとめは完全版、通知の細かい設定も完全版、バックアップは無料
    tab(page, "まとめ")
    check(page.locator(".locked-card", has_text="受診用まとめ").count() == 1, "無料では受診用のまとめは完全版の案内")
    shot(page, "12_report_locked")
    tab(page, "設定")
    shot(page, "14_settings_free")
    no_hscroll(page, "設定")
    page.click(".menu button:has-text('通知')")
    check(page.locator(".locked-card", has_text="細かい設定").count() == 1, "無料では通知の細かい設定は完全版")
    page.locator("label.check-line", has_text="お薬のお知らせを受け取る").locator("input").check()
    shot(page, "13_notify_free")
    back(page)
    page.click(".menu button:has-text('よく食べる物の登録')")
    check(page.locator(".locked-card").count() == 1 and page.locator("text=食品ごとのプリン体の量は入っていません").count() == 1, "無料ではよく食べる物は完全版。収録していない旨")
    shot(page, "17_foods_locked")
    back(page)
    page.click(".menu button:has-text('バックアップ')")
    with page.expect_download() as dl:
        page.click("text=バックアップを書き出す")
    path = os.path.join(OUT, "backup.json")
    dl.value.save_as(path)
    bk = json.load(open(path, encoding="utf-8"))
    check(bk["app"] == "urica" and len(bk["data"]["labs"]) == 2 and len(bk["data"]["attacks"]) == 1, "バックアップに尿酸値2件・発作1件")
    shot(page, "15_backup")
    back(page)

    # 再読み込みしても残る
    page.reload()
    tab(page, "グラフ")
    check(page.locator(".labs li").count() == 2, "再読み込み後も記録が残る")

    # 全部消して、バックアップから戻す
    tab(page, "設定")
    page.click(".menu button:has-text('このアプリについて')")
    check(page.locator("text=食品ごとのプリン体の量は収録していません").count() == 1, "収録していない旨と出典を示す")
    check(page.locator(".source").count() == 3, "出典が3つ出る")
    shot(page, "16_about")
    page.click("button:has-text('すべて消す')")
    page.wait_for_selector(".home")
    tab(page, "記録")
    check(page.locator(".dose").count() == 0, "すべて消すと薬も消える")
    tab(page, "設定")
    page.click(".menu button:has-text('バックアップ')")
    page.set_input_files("[data-testid=backup-file]", path)
    page.wait_for_selector("text=読み込みました")
    back(page)
    tab(page, "グラフ")
    check(page.locator(".labs li").count() == 2, "バックアップから戻る")
    bad = os.path.join(OUT, "bad.json")
    open(bad, "w", encoding="utf-8").write('{"hello":1}')
    tab(page, "設定")
    page.click(".menu button:has-text('バックアップ')")
    page.set_input_files("[data-testid=backup-file]", bad)
    page.wait_for_selector("text=ウリカ手帳のバックアップではありません")
    check(True, "別のファイルは読み込まない")
    ctx.close()

    # ===== 疑似購入ビルド =====
    ctx, page = new_page(b)
    page.goto(E2E)
    page.click("text=注意を読みました。はじめる")
    tab(page, "設定")
    page.click("text=くわしく見る")
    page.wait_for_selector(".paywall")
    shot(page, "20_paywall")
    page.click("button:has-text('で買う')")
    page.wait_for_selector("text=完全版になりました")
    shot(page, "21_thanks")
    no_hscroll(page, "購入完了")
    page.click("text=さっそく使ってみる")
    tab(page, "設定")
    check(page.locator(".pagehead .tag.full").count() == 1 and page.locator("text=完全版をご利用中です").count() == 1, "購入後に完全版の印")
    shot(page, "22_settings_full")
    tab(page, "記録")
    check(page.locator("#card-purine").count() == 1, "完全版でプリン体の記録が出る")
    page.fill("input[aria-label='食品の名前']", "焼き鳥")
    page.fill("input[aria-label='プリン体の量']", "150.5")
    page.click("text=この日に足す")
    page.fill("input[aria-label='食品の名前']", "みそ汁")
    page.fill("input[aria-label='プリン体の量']", "abc")
    page.click("text=この日に足す")
    check(page.locator("#card-purine .err").count() == 1, "数でない量は弾く")
    page.fill("input[aria-label='プリン体の量']", "300")
    page.click("text=この日に足す")
    check(page.locator("#card-purine .big-num").inner_text().startswith("450.5"), "プリン体の合計 150.5+300")
    check(page.locator("#card-purine .meter.over").count() == 1, "目安400を超えたら色が変わる")
    page.click("text=よく食べる物を登録")
    page.fill("input[placeholder='例 いつもの朝ごはん']", "朝定食")
    page.locator(".foods .two input").first.fill("90")
    page.click(".foods button:has-text('登録する')")
    back(page)
    page.locator("#card-purine .chip", has_text="朝定食").click()
    check(page.locator("#card-purine .big-num").inner_text().startswith("540.5"), "登録した食品を1回押しで足す")
    tab(page, "グラフ")
    add_lab(page, D(0), "6.1")
    page.wait_for_selector(".uric")
    seg(page, "全期間")
    check(page.locator(".paywall").count() == 0 and page.locator(".seg-btn.on", has_text="全期間").count() == 1, "完全版は全期間のグラフ")
    tab(page, "設定")
    page.click(".menu button:has-text('通知')")
    check(page.locator("text=薬ごとに登録した時刻に知らせる").count() == 1, "完全版は通知の細かい設定")
    back(page)
    tab(page, "まとめ")
    page.wait_for_selector(".report .stat-grid")
    check("6.1" in page.locator(".report").first.inner_text(), "まとめに尿酸値")
    with page.expect_download() as dl:
        page.click("text=CSVで書き出す")
    csvp = os.path.join(OUT, "export.csv")
    dl.value.save_as(csvp)
    csv = open(csvp, encoding="utf-8-sig").read()
    check(csv.startswith("種類,日付,値,単位,メモ") and "尿酸値" in csv and "焼き鳥" in csv, "CSV に尿酸値と食品")
    with page.expect_download() as dl:
        page.click("text=文章で書き出す")
    txtp = os.path.join(OUT, "report.txt")
    dl.value.save_as(txtp)
    txt = open(txtp, encoding="utf-8").read()
    check("受診用のまとめ" in txt and "診断・治療の判断をしません" in txt, "文章のまとめに注意書き")
    ctx.close()

    # ===== 見本の記録で全画面を撮る(目で確かめる用) =====
    ctx, page = new_page(b)
    page.goto(E2E + "?demo=1&premium=1")
    page.wait_for_selector(".home")
    shot(page, "30_demo_home")
    no_hscroll(page, "ホーム(見本)")
    tab(page, "記録")
    shot(page, "31_demo_record")
    no_hscroll(page, "記録(見本)")
    seg(page, "発作")
    shot(page, "32_demo_attacks")
    page.locator(".attack button:has-text('直す')").first.click()
    shot(page, "33_demo_attack_edit")
    back(page)
    tab(page, "グラフ")
    shot(page, "34_demo_graph")
    seg(page, "全期間")
    shot(page, "35_demo_graph_all")
    page.click("button:has-text('検査値を入力する')")
    shot(page, "36_demo_lab_form")
    back(page)
    tab(page, "まとめ")
    seg(page, "1年")
    shot(page, "37_demo_report")
    no_hscroll(page, "まとめ(見本)")
    tab(page, "設定")
    shot(page, "38_demo_settings")
    for name, f in [("お薬の登録", "39_demo_meds"), ("目標と目安", "40_demo_target"), ("通知", "41_demo_notify"), ("よく食べる物の登録", "42_demo_foods"), ("バックアップ", "43_demo_backup")]:
        page.click(f".menu button:has-text('{name}')")
        shot(page, f)
        no_hscroll(page, name + "(見本)")
        back(page)
    ctx.close()


(p1, PROD), (p2, E2E) = serve("dist"), serve("dist-e2e")
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        for W in WIDTHS:
            OUT = os.path.join(ROOT, "scripts", "e2e_out", f"w{W}")
            os.makedirs(OUT, exist_ok=True)
            run(b, PROD, E2E)
        b.close()
finally:
    p1.terminate()
    p2.terminate()

real_errors = [e for e in errors if "favicon" not in e]
W = "all"
check(not real_errors, f"console error 0 件 ({len(real_errors)})")
for e in real_errors[:10]:
    print("   ", e)
print(f"\n{'ALL PASS' if not fails else f'{len(fails)} FAILED'}")
sys.exit(1 if fails else 0)

# -*- coding: utf-8 -*-
"""ビルドした物(dist と dist-e2e)をブラウザで開いて、主な流れを押して回る確認。
先に npm run build と npm run build:e2e を済ませておく。  python scripts/e2e.py
- dist      : 製品ビルド。課金キーが空なので「購入の準備中です」が出ること
- dist-e2e  : 疑似購入が入ったビルド。完全版の機能を確かめる
画面写真は scripts/e2e_out/ に置く。"""
import json
import os
import sys
from datetime import date, timedelta

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "scripts", "e2e_out")
os.makedirs(OUT, exist_ok=True)
fails, errors = [], []
TODAY = date.today()
D = lambda n: (TODAY + timedelta(days=n)).isoformat()


def check(cond, msg):
    print(("OK  " if cond else "NG  ") + msg, flush=True)
    if not cond:
        fails.append(msg)


sys.path.insert(0, os.path.join(ROOT, "scripts"))
from e2e_util import serve  # noqa: E402


def shot(page, name):
    page.screenshot(path=os.path.join(OUT, name + ".png"), full_page=True)


def new_page(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, locale="ja-JP", accept_downloads=True)
    page = ctx.new_page()
    page.on("console", lambda m: errors.append(f"{page.url} {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("dialog", lambda d: d.accept())
    return ctx, page


def tab(page, name):
    page.locator("nav.tabs button", has_text=name).click()


(p1, PROD), (p2, E2E) = serve("dist"), serve("dist-e2e")
servers = [p1, p2]
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch()

        # ===== 製品ビルド =====
        ctx, page = new_page(b)
        page.goto(PROD)
        page.wait_for_selector(".welcome")
        shot(page, "01_welcome")
        check(page.locator("text=診断・治療の判断はしません").count() == 1, "初回に医療判断をしない旨が出る")
        page.click("text=わかりました。はじめる")
        page.wait_for_selector(".today")
        shot(page, "02_today_empty")
        check(page.locator("#card-purine").count() == 0 and page.locator("text=プリン体の記録").count() >= 1, "無料ではプリン体の記録は完全版の案内")

        # 薬を登録して飲んだ印
        page.click("text=薬を登録する")
        page.fill("input[placeholder='お薬手帳の名前どおりに']", "テスト薬A")
        page.locator("input[type=time]").fill("20:00")
        page.click("text=時刻を足す")
        page.click("button:has-text('登録する')")
        check(page.locator(".card h2", has_text="テスト薬A").count() == 1, "薬が登録される")
        page.click("button[aria-label='もどる']")
        page.wait_for_selector(".dose")
        check(page.locator(".dose").count() == 2, "今日飲む分が時刻ごとに2つ出る(08:00 と 20:00)")
        page.locator(".dose").first.click()
        check(page.locator(".dose.done").count() == 1 and page.locator("#card-meds .tag", has_text="1/2").count() == 1, "飲んだ印がつく 1/2")

        # 水分・お酒
        page.click("text=+200 mL")
        page.click("text=+500 mL")
        check(page.locator("#card-water .big-num").inner_text().startswith("700"), "水分 200+500=700")
        page.locator("#card-drink .chip").first.click()
        check(page.locator("#card-drink .list li").count() == 2 and "350 mL" in page.locator("#card-drink .list").inner_text(), "お酒の記録(ビール 350)")
        # 前の日にさかのぼって記録
        page.click("button[aria-label='前の日']")
        check("さかのぼって" in page.locator(".daynav").inner_text() or "きのう" in page.locator(".daynav").inner_text(), "前の日に移れる")
        page.click("text=+200 mL")
        check(page.locator("#card-water .big-num").inner_text().startswith("200"), "前の日の水分は別に数える")
        page.click("button[aria-label='次の日']")
        check(page.locator("#card-water .big-num").inner_text().startswith("700"), "今日に戻ると 700")
        shot(page, "03_today_free")

        # 尿酸値
        tab(page, "尿酸値")
        page.wait_for_selector(".uric")
        page.fill("#ua-form input[type=date]", D(-200))
        page.fill("#ua-form input[placeholder='例 6.4']", "7.8")
        page.click("#ua-form button:has-text('記録する')")
        page.fill("#ua-form input[type=date]", D(-20))
        page.fill("#ua-form input[placeholder='例 6.4']", "6.9")
        page.fill("#ua-form input[placeholder='薬が変わった など']", "朝いち")
        page.click("#ua-form button:has-text('記録する')")
        check(page.locator(".ua-hero .big-num").inner_text().startswith("6.9"), "最新の尿酸値 6.9")
        check("-0.9" in page.locator(".diff").inner_text(), "前回との差 -0.9")
        check(page.locator("svg.chart circle").count() == 2, "グラフに2点")
        page.fill("#ua-form input[placeholder='例 6.4']", "99")
        page.click("#ua-form button:has-text('記録する')")
        check(page.locator("#ua-form .err").count() == 1, "ありえない値は弾く")
        page.fill("#ua-form input[placeholder='例 6.4']", "")
        shot(page, "04_uric_free")
        page.locator(".chip", has_text="全期間").click()
        page.wait_for_selector(".paywall")
        check(page.locator("button:has-text('購入の準備中です')").count() == 1, "製品ビルドで課金キーが空なら「購入の準備中です」")
        shot(page, "05_paywall_prod")
        page.click("button[aria-label='もどる']")

        # 目標の線
        page.click("text=主治医と決めた目標の線を引く")
        page.fill("input[placeholder='主治医と決めた値']", "6.0")
        page.click("button:has-text('保存する')")
        check(page.locator("text=保存しました").count() == 1, "目標を保存")
        page.click("button[aria-label='もどる']")
        check(page.locator(".legend", has_text="目標 6.0").count() == 1, "グラフに目標の線の凡例")

        # 発作
        tab(page, "発作")
        page.click("button:has-text('発作を記録する')")
        page.wait_for_selector(".attack-form")
        page.locator(".feet .spot[aria-label='右足の親指']").click()
        check(page.locator(".chip.on", has_text="右足の親指").count() == 1, "足の図で押すと場所が選ばれる")
        page.locator(".pain button", has_text="8").first.click()
        shot(page, "06_attack_form")
        page.click(".attack-form button:has-text('記録する')")
        page.wait_for_selector(".attacks .attack")
        check("右足の親指" in page.locator(".attack").first.inner_text(), "発作の一覧に出る")
        check(page.locator(".stat3", has_text="続いている").count() == 1, "続いている発作")
        page.click("text=今日おさまった")
        check(page.locator(".attack.done").count() == 1, "おさまった日を入れられる")
        shot(page, "07_attacks")

        # その他: まとめは完全版、バックアップは無料
        tab(page, "その他")
        page.click(".menu button:has-text('受診用のまとめ')")
        check(page.locator(".locked-card").count() == 1, "無料では受診用のまとめは完全版の案内")
        page.click("button[aria-label='もどる']")
        page.click(".menu button:has-text('通知')")
        check(page.locator(".locked-card", has_text="細かい設定").count() == 1, "無料では通知の細かい設定は完全版")
        page.locator("label.check-line", has_text="お薬のお知らせを受け取る").locator("input").check()
        page.click("button[aria-label='もどる']")
        page.click(".menu button:has-text('バックアップ')")
        with page.expect_download() as dl:
            page.click("text=バックアップを書き出す")
        path = os.path.join(OUT, "backup.json")
        dl.value.save_as(path)
        bk = json.load(open(path, encoding="utf-8"))
        check(bk["app"] == "urica" and len(bk["data"]["labs"]) == 2 and len(bk["data"]["attacks"]) == 1, "バックアップに尿酸値2件・発作1件")
        page.click("button[aria-label='もどる']")

        # 再読み込みしても残る
        page.reload()
        tab(page, "尿酸値")
        check(page.locator(".ua-hero .big-num").inner_text().startswith("6.9"), "再読み込み後も記録が残る")

        # 全部消して、バックアップから戻す
        tab(page, "その他")
        page.click(".menu button:has-text('このアプリについて')")
        check(page.locator("text=食品ごとのプリン体の量は収録していません").count() == 1, "収録していない旨と出典を示す")
        page.click("button:has-text('すべて消す')")
        page.wait_for_selector(".today")
        check(page.locator(".dose").count() == 0, "すべて消すと薬も消える")
        tab(page, "その他")
        page.click(".menu button:has-text('バックアップ')")
        page.set_input_files("[data-testid=backup-file]", path)
        page.wait_for_selector("text=読み込みました")
        page.click("button[aria-label='もどる']")
        tab(page, "尿酸値")
        check(page.locator(".ua-hero .big-num").inner_text().startswith("6.9"), "バックアップから戻る")
        bad = os.path.join(OUT, "bad.json")
        open(bad, "w", encoding="utf-8").write('{"hello":1}')
        tab(page, "その他")
        page.click(".menu button:has-text('バックアップ')")
        page.set_input_files("[data-testid=backup-file]", bad)
        page.wait_for_selector("text=ウリカ手帳のバックアップではありません")
        check(True, "別のファイルは読み込まない")
        ctx.close()

        # ===== 疑似購入ビルド =====
        ctx, page = new_page(b)
        page.goto(E2E)
        page.click("text=わかりました。はじめる")
        tab(page, "その他")
        page.click("text=くわしく見る")
        page.wait_for_selector(".paywall")
        shot(page, "08_paywall")
        page.click("button:has-text('で買う')")
        page.wait_for_selector("text=完全版になりました")
        check(page.locator(".head .tag.full").count() == 1, "購入後に完全版の印")
        tab(page, "今日")
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
        page.click("button[aria-label='もどる']")
        page.locator("#card-purine .chip", has_text="朝定食").click()
        check(page.locator("#card-purine .big-num").inner_text().startswith("540.5"), "登録した食品を1回押しで足す")
        tab(page, "尿酸値")
        page.fill("#ua-form input[placeholder='例 6.4']", "6.1")
        page.click("#ua-form button:has-text('記録する')")
        page.locator(".chip", has_text="全期間").click()
        check(page.locator(".paywall").count() == 0 and page.locator(".chip.on", has_text="全期間").count() == 1, "完全版は全期間のグラフ")
        tab(page, "その他")
        page.click(".menu button:has-text('通知')")
        check(page.locator("text=薬ごとに登録した時刻に知らせる").count() == 1, "完全版は通知の細かい設定")
        page.click("button[aria-label='もどる']")
        page.click(".menu button:has-text('受診用のまとめ')")
        page.wait_for_selector(".report .card")
        check("6.1" in page.locator(".report").inner_text(), "まとめに尿酸値")
        with page.expect_download() as dl:
            page.click("text=CSV(表計算用)で書き出す")
        csvp = os.path.join(OUT, "export.csv")
        dl.value.save_as(csvp)
        csv = open(csvp, encoding="utf-8-sig").read()
        check(csv.startswith("種類,日付,値,単位,メモ") and "尿酸値" in csv and "焼き鳥" in csv, "CSV に尿酸値と食品")
        with page.expect_download() as dl:
            page.click("text=まとめを文章で送る・保存する")
        txtp = os.path.join(OUT, "report.txt")
        dl.value.save_as(txtp)
        txt = open(txtp, encoding="utf-8").read()
        check("受診用のまとめ" in txt and "診断・治療の判断をしません" in txt, "文章のまとめに注意書き")
        ctx.close()

        # ===== 見本の記録で主な画面を撮る(目で確かめる用) =====
        ctx, page = new_page(b)
        page.goto(E2E + "?demo=1&premium=1")
        page.wait_for_selector(".today")
        shot(page, "10_demo_today")
        tab(page, "尿酸値")
        shot(page, "11_demo_uric")
        page.locator(".chip", has_text="全期間").click()
        shot(page, "12_demo_uric_all")
        tab(page, "発作")
        shot(page, "13_demo_attacks")
        tab(page, "その他")
        shot(page, "14_demo_more")
        page.click(".menu button:has-text('受診用のまとめ')")
        shot(page, "15_demo_report")
        page.click("button[aria-label='もどる']")
        page.click(".menu button:has-text('目標と目安')")
        shot(page, "16_demo_target")
        page.click("button[aria-label='もどる']")
        page.click(".menu button:has-text('通知')")
        shot(page, "17_demo_notify")
        page.click("button[aria-label='もどる']")
        page.click(".menu button:has-text('よく食べる物の登録')")
        shot(page, "18_demo_foods")
        ctx.close()
        b.close()
finally:
    for s in servers:
        s.terminate()

real_errors = [e for e in errors if "favicon" not in e]
check(not real_errors, f"console error 0 件 ({len(real_errors)})")
for e in real_errors[:10]:
    print("   ", e)
print(f"\n{'ALL PASS' if not fails else f'{len(fails)} FAILED'}")
sys.exit(1 if fails else 0)

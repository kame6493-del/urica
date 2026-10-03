# -*- coding: utf-8 -*-
# App Store(日本)で「痛風」「尿酸値」「プリン体」を検索し、上位の課金内容・評価・不満を集める。
# あわせてメディカルの売上上位(RSS)から血圧・血糖など個人の記録アプリを拾い、課金内容を取る。
import json, os, re, time, html, urllib.request, urllib.parse

OUT = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36", "Accept-Language": "ja"}


def fetch(url):
    for _ in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read().decode("utf-8")
        except Exception as ex:
            print("retry", url, ex)
            time.sleep(3)
    return ""


def iap(app_id):
    s = fetch("https://apps.apple.com/jp/app/id%s" % app_id)
    pairs = re.findall(r'class="text-pair[^"]*"><span>(.*?)</span>\s*<span>(.*?)</span>', s)
    res = []
    for a, b in pairs:
        t = (html.unescape(a).strip(), html.unescape(b).strip())
        if ("¥" in t[1] or "円" in t[1]) and t not in res:
            res.append(t)
    return res


def reviews(app_id, n=3):
    out = []
    for page in range(1, n + 1):
        s = fetch("https://itunes.apple.com/jp/rss/customerreviews/page=%d/id=%s/sortby=mostrecent/json" % (page, app_id))
        try:
            ent = json.loads(s).get("feed", {}).get("entry", [])
        except Exception:
            ent = []
        if isinstance(ent, dict):
            ent = [ent]
        for e in ent:
            if "im:rating" not in e:
                continue
            out.append({"rating": int(e["im:rating"]["label"]), "title": e["title"]["label"], "body": e["content"]["label"], "date": e.get("updated", {}).get("label", "")})
        if len(ent) < 50:
            break
    return out


result = {"search": {}, "medical": []}
for term in ["痛風", "尿酸値", "プリン体"]:
    q = urllib.parse.quote(term)
    d = json.loads(fetch("https://itunes.apple.com/search?term=%s&country=jp&entity=software&lang=ja_jp&limit=15" % q) or "{}")
    rows = []
    for r in d.get("results", [])[:10]:
        app_id = str(r["trackId"])
        row = {
            "id": app_id, "name": r["trackName"], "seller": r.get("sellerName", ""), "price": r.get("formattedPrice", ""),
            "rating": r.get("averageUserRating", 0), "count": r.get("userRatingCount", 0), "genre": r.get("primaryGenreName", ""),
            "released": r.get("releaseDate", "")[:10], "updated": r.get("currentVersionReleaseDate", "")[:10],
            "iap": iap(app_id), "reviews": reviews(app_id, 1),
        }
        rows.append(row)
        print(term, row["name"][:30], row["price"], row["rating"], row["count"], row["iap"][:4])
    result["search"][term] = rows

# メディカル(6020)の売上上位
s = fetch("https://itunes.apple.com/jp/rss/topgrossingapplications/limit=100/genre=6020/json")
ents = json.loads(s)["feed"]["entry"]
for i, e in enumerate(ents, 1):
    name = e["im:name"]["label"]
    app_id = e["id"]["attributes"]["im:id"]
    artist = e["im:artist"]["label"]
    row = {"rank": i, "id": app_id, "name": name, "seller": artist}
    if re.search(r"血圧|血糖|糖尿|頭痛|体重|服薬|お薬|薬|記録|ノート|手帳|尿酸|痛風|腎|透析|片頭痛|気圧", name):
        row["iap"] = iap(app_id)
        lk = json.loads(fetch("https://itunes.apple.com/lookup?id=%s&country=jp" % app_id) or "{}").get("results", [{}])
        if lk:
            row["rating"] = lk[0].get("averageUserRating", 0)
            row["count"] = lk[0].get("userRatingCount", 0)
            row["price"] = lk[0].get("formattedPrice", "")
        row["reviews"] = [r for r in reviews(app_id, 1) if r["rating"] <= 3][:8]
        print("MED", i, name[:30], artist[:20], row.get("price"), row.get("count"), row["iap"][:5])
    result["medical"].append(row)

json.dump(result, open(os.path.join(OUT, "appstore_2026-10-03.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("saved")

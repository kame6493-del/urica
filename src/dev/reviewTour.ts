/**
 * App Review 用の画面録画で流す自動操作。VITE_REVIEW_TOUR=1 で作ったビルドだけで動く(製品版には入らない)。
 * 持ち主が iPhone を持っていないので、CI のシミュレーターでこれを流しながら録画する(.github/workflows/ios-review-video.yml)。
 * 起動(初回の注意)→ 薬を登録して飲んだ印 → 水分・お酒 → 尿酸値を2回記録してグラフ → 発作を記録
 * → その他(受診用のまとめは完全版)→ 完全版の購入画面。記録はすべて画面から入れる(見本データは使わない)。押した所に丸を出す。
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function tapMark(el: Element) {
  const r = el.getBoundingClientRect();
  const dot = document.createElement('div');
  Object.assign(dot.style, {
    position: 'fixed', left: `${r.left + r.width / 2 - 22}px`, top: `${r.top + r.height / 2 - 22}px`,
    width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(210,64,42,0.35)',
    border: '2px solid rgba(210,64,42,0.8)', zIndex: '99999', pointerEvents: 'none', transition: 'opacity .6s, transform .6s',
  });
  document.body.appendChild(dot);
  requestAnimationFrame(() => { dot.style.transform = 'scale(1.4)'; dot.style.opacity = '0'; });
  setTimeout(() => dot.remove(), 700);
}

async function find(pred: (b: HTMLElement) => boolean, wait = 6000, sel = 'button, a'): Promise<HTMLElement | null> {
  const end = Date.now() + wait;
  while (Date.now() < end) {
    const el = [...document.querySelectorAll<HTMLElement>(sel)].find((b) => b.getClientRects().length > 0 && !(b as HTMLButtonElement).disabled && pred(b));
    if (el) return el;
    await sleep(200);
  }
  return null;
}

async function tapEl(el: Element, pause = 1500) {
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  await sleep(500);
  tapMark(el);
  await sleep(250);
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  await sleep(pause);
}

async function tap(pred: (b: HTMLElement) => boolean, pause = 1500, sel?: string) {
  const el = await find(pred, 6000, sel);
  if (!el) return false;
  await tapEl(el, pause);
  return true;
}

const text = (s: string) => (b: HTMLElement) => b.innerText.replace(/\s+/g, '').includes(s.replace(/\s+/g, ''));
const label = (s: string) => (b: HTMLElement) => b.getAttribute('aria-label') === s;
const tab = (name: string) => tap((b) => b.closest('nav.tabs') !== null && text(name)(b), 2000);

/** React の入力欄に値を入れる(1文字ずつ見せる) */
async function type(sel: string, value: string, slow = true) {
  const el = await find(() => true, 6000, sel) as HTMLInputElement | null;
  if (!el) return false;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  await sleep(400);
  tapMark(el);
  el.focus();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  const steps = slow && el.type !== 'date' && el.type !== 'time' ? [...value].map((_, i) => value.slice(0, i + 1)) : [value];
  for (const v of steps) {
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(120);
  }
  el.blur();
  await sleep(500);
  return true;
}

async function scrollSlow(to: number, ms = 1600) {
  const from = window.scrollY;
  const steps = 30;
  for (let k = 1; k <= steps; k++) { window.scrollTo(0, from + ((to - from) * k) / steps); await sleep(ms / steps); }
}

const ymd = (daysAgo: number) => {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export async function runReviewTour() {
  await sleep(3500); // 初回の注意(診断・治療の判断はしない)を見せる
  await scrollSlow(document.body.scrollHeight, 1500);
  await tap(text('わかりました。はじめる'), 2500);

  // 今日: 薬を登録 → 飲んだ印
  if (await tap(text('薬を登録する'), 2000)) {
    await type("input[placeholder='お薬手帳の名前どおりに']", 'フェブキソスタット');
    await type("input[placeholder='例 1錠']", '1錠');
    await type('input[type=time]', '20:00');
    await tap(text('時刻を足す'), 1000);
    await tap((b) => b.classList.contains('primary') && text('登録する')(b), 2000);
    await tap(label('もどる'), 2000);
  }
  await tap((b) => b.classList.contains('dose'), 1500, '.dose');
  // 水分・お酒
  await tap(text('+200 mL'), 1000);
  await tap(text('+500 mL'), 1500);
  await tap(() => true, 1500, '#card-drink .chip');
  await scrollSlow(0, 1200); await sleep(1000);

  // 尿酸値: 2回分を記録 → グラフと前回との差
  await tab('尿酸値');
  await type('#ua-form input[type=date]', ymd(120));
  await type("#ua-form input[placeholder='例 6.4']", '7.8');
  await tap((b) => b.closest('#ua-form') !== null && text('記録する')(b), 1500);
  await type('#ua-form input[type=date]', ymd(7));
  await type("#ua-form input[placeholder='例 6.4']", '6.6');
  await tap((b) => b.closest('#ua-form') !== null && text('記録する')(b), 1500);
  await scrollSlow(0, 1500); await sleep(2500);

  // 発作: 足の図で場所を選び、痛みを記録
  await tab('発作');
  if (await tap(text('発作を記録する'), 2000)) {
    await tap(() => true, 1200, ".feet .spot[aria-label='右足の親指']");
    await tap((b) => b.innerText.trim() === '7', 1200, '.pain button');
    await tap((b) => b.closest('.attack-form') !== null && text('記録する')(b), 2500);
  }
  await sleep(1500);

  // その他: 受診用のまとめ(完全版の案内)→ 完全版の購入画面
  await tab('その他');
  await sleep(1000);
  if (await tap((b) => b.closest('.menu') !== null && text('受診用のまとめ')(b), 3000)) {
    await tap(label('もどる'), 1500);
  }
  await tap(text('くわしく見る'), 3000);
  await scrollSlow(document.body.scrollHeight, 2500);
  await sleep(2500);
  // 購入ボタン(シミュレーターでストアの商品が取れたときだけ押せる)
  await tap((b) => b.closest('.pw-cta') !== null && /で買う/.test(b.innerText), 10000);
  await sleep(6000);
}

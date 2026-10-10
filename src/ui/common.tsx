import type { ReactNode } from 'react';
import type { AppData } from '../domain/types';
import { GUIDE_URIC_LIMIT } from '../domain/guide';
import logoPng from '../assets/art/logo.png';

export type Update = (fn: (d: AppData) => AppData) => void;

/* ---------- 線のアイコン(見本の線の太さ・角の丸みに合わせた) ---------- */

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
type IP = { size?: number };
const svg = (d: ReactNode) => (p: IP) => (
  <svg className="ico" viewBox="0 0 24 24" width={p.size ?? 22} height={p.size ?? 22} aria-hidden="true">{d}</svg>
);

export const Ico = {
  home: svg(<><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1Z" {...P} /></>),
  record: svg(<><rect x="4" y="4" width="16" height="16" rx="3" {...P} /><path d="M9 15.5l.5-2.5 5.5-5.5 2 2-5.5 5.5Z" {...P} /></>),
  graph: svg(<><path d="M4 20h16" {...P} /><path d="M7 16V12M11 16V8M15 16v-5M19 16V6" {...P} /></>),
  report: svg(<><rect x="5" y="3.5" width="14" height="17" rx="2.5" {...P} /><path d="M9 8.5h6M9 12h6M9 15.5h4" {...P} /></>),
  gear: svg(<><circle cx="12" cy="12" r="3" {...P} /><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" {...P} /></>),
  back: svg(<path d="M15 5l-7 7 7 7" {...P} strokeWidth={2.2} />),
  next: svg(<path d="M9 5l7 7-7 7" {...P} strokeWidth={2.2} />),
  plus: svg(<path d="M12 5v14M5 12h14" {...P} strokeWidth={2.2} />),
  minus: svg(<path d="M5 12h14" {...P} strokeWidth={2.2} />),
  check: svg(<path d="M5 12.5l4.5 4.5L19 7.5" {...P} strokeWidth={2.4} />),
  close: svg(<path d="M6 6l12 12M18 6 6 18" {...P} />),
  bell: svg(<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z" {...P} /><path d="M10 20.5a2 2 0 0 0 4 0" {...P} /></>),
  lock: svg(<><rect x="5" y="10.5" width="14" height="10" rx="2.5" {...P} /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" {...P} /></>),
  pill: svg(<g transform="rotate(-45 12 12)"><path d="M12 8H7.5a4 4 0 0 0 0 8H12Z" fill="currentColor" opacity=".25" /><rect x="3.5" y="8" width="17" height="8" rx="4" {...P} /><path d="M12 8v8" {...P} /></g>),
  target: svg(<><circle cx="12" cy="12" r="8" {...P} /><circle cx="12" cy="12" r="4" {...P} /><circle cx="12" cy="12" r="1" fill="currentColor" /></>),
  fork: svg(<><path d="M7 3.5v6a2 2 0 0 0 4 0v-6M9 3.5V21M16.5 21V3.5c-2 1-3 3.5-3 6.5 0 2 1 3 3 3" {...P} /></>),
  backup: svg(<><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" {...P} /><path d="M4.5 15.5V19a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3.5" {...P} /></>),
  info: svg(<><circle cx="12" cy="12" r="8.5" {...P} /><path d="M12 11v5.5" {...P} /><circle cx="12" cy="7.8" r="1.1" fill="currentColor" /></>),
  calendar: svg(<><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" {...P} /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" {...P} /></>),
  trash: svg(<><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" {...P} /></>),
  share: svg(<><path d="M12 15V4M8 8l4-4 4 4" {...P} /><path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" {...P} /></>),
  shield: svg(<><path d="M12 3.5 19 6v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" {...P} /><path d="M9 12l2 2 4-4" {...P} /></>),
  memo: svg(<><path d="M5 4.5h10l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" {...P} /><path d="M8 11h8M8 14.5h8M8 18h5" {...P} /></>),
};

/* ---------- 枠 ---------- */

export function TopBar(p: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <header className="topbar">
      <button className="icon" aria-label="もどる" onClick={p.onBack}><Ico.back /></button>
      <h1>{p.title}</h1>
      <div className="topbar-r">{p.right}</div>
    </header>
  );
}

/** タブの画面の見出し(見本どおり中央にまとめる) */
export function PageHead(p: { title: string; sub?: ReactNode; logo?: boolean; right?: ReactNode }) {
  return (
    <header className="pagehead">
      <div className="pagehead-t">
        {p.logo && <img className="mini-logo" src={logoPng} alt="" />}
        <h1>{p.title}</h1>
      </div>
      {p.sub && <div className="pagehead-sub">{p.sub}</div>}
      {p.right && <div className="pagehead-r">{p.right}</div>}
    </header>
  );
}

export function Seg<K extends string>(p: { items: { key: K; label: string; locked?: boolean }[]; value: K; onChange: (k: K) => void; label: string }) {
  return (
    <div className="seg" role="tablist" aria-label={p.label}>
      {p.items.map((it) => (
        <button key={it.key} role="tab" aria-selected={p.value === it.key}
          className={`seg-btn${p.value === it.key ? ' on' : ''}${it.locked ? ' locked' : ''}`} onClick={() => p.onChange(it.key)}>
          {it.locked && <Ico.lock size={14} />}{it.label}
        </button>
      ))}
    </div>
  );
}

/** 完全版の機能。見本の「ロックされた機能の表示」に寄せ、何ができるようになるかを具体的に書く */
export function LockedCard(p: { title: string; children: ReactNode; onUnlock: () => void; points?: string[] }) {
  return (
    <section className="card locked-card">
      <div className="lock-badge"><Ico.lock size={22} /></div>
      <h2>{p.title}<span className="tag full">完全版</span></h2>
      <p>{p.children}</p>
      {p.points && (
        <ul className="checks">
          {p.points.map((x) => <li key={x}><span className="ck"><Ico.check size={14} /></span>{x}</li>)}
        </ul>
      )}
      <button className="btn primary wide" onClick={p.onUnlock}>完全版を見る</button>
    </section>
  );
}

export function Source(p: { source: string; url: string }) {
  return (
    <p className="source">
      出典: <a href={p.url} target="_blank" rel="noopener noreferrer">{p.source}</a>
    </p>
  );
}

export function Empty(p: { art: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <img src={p.art} alt="" />
      <b>{p.title}</b>
      {p.children && <p>{p.children}</p>}
      {p.action}
    </div>
  );
}

/** 痛みの強さの色(0 は灰、弱いと黄、強いほど赤) */
export function painColor(v: number): string {
  if (v <= 0) return '#9CA3AF';
  if (v <= 3) return '#F5B70B';
  if (v <= 6) return '#F97316';
  return '#EF4444';
}

/** 利用者が付けた痛みの数を言葉にする(診断ではなく、本人の評価の言い換え) */
export function painLabel(v: number): string {
  if (v <= 0) return '痛みなし';
  if (v <= 3) return '軽い痛み';
  if (v <= 6) return '中くらいの痛み';
  return '強い痛み';
}

/** 尿酸値の印。出典のある 7.0 の境目と、主治医と決めた目標だけで分ける(独自の段階は作らない) */
export function UaBadge(p: { ua: number; target: number | null }) {
  const over = p.ua > GUIDE_URIC_LIMIT.value;
  return (
    <span className="badges">
      <span className={`badge ${over ? 'warn' : 'ok'}`}>{over ? '7.0 を超えています' : '7.0 以下'}</span>
      {p.target !== null && <span className={`badge ${p.ua > p.target ? 'warn' : 'ok'}`}>{p.ua > p.target ? '目標より上' : '目標以下'}</span>}
    </span>
  );
}

export function Logo(p: { size?: number }) {
  const s = p.size ?? 84;
  return <img className="logo" src={logoPng} width={s} height={s} alt="" />;
}

export const TabIcon = { home: Ico.home, record: Ico.record, graph: Ico.graph, report: Ico.report, settings: Ico.gear };

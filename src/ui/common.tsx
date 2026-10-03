import type { ReactNode } from 'react';
import type { AppData } from '../domain/types';

export type Update = (fn: (d: AppData) => AppData) => void;

export function TopBar(p: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <header className="topbar">
      <button className="icon" aria-label="もどる" onClick={p.onBack}>‹</button>
      <h1>{p.title}</h1>
      <div>{p.right}</div>
    </header>
  );
}

export function LockedCard(p: { title: string; children: ReactNode; onUnlock: () => void }) {
  return (
    <section className="card locked-card">
      <h2>{p.title}<span className="tag full">完全版</span></h2>
      <p>{p.children}</p>
      <button className="btn small amber" onClick={p.onUnlock}>完全版を見る</button>
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

/** 痛みの強さの色(0 は灰、強いほど朱色) */
export function painColor(v: number): string {
  if (v <= 0) return '#9aa3ab';
  const t = v / 10;
  const h = 32 - t * 22;
  const l = 62 - t * 18;
  return `hsl(${h}, 70%, ${l}%)`;
}

export function Logo(p: { size?: number }) {
  const s = p.size ?? 84;
  return (
    <svg className="logo" width={s} height={s} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="24" fill="#2c6e9b" />
      <path d="M50 18 C 64 38, 74 50, 74 63 a24 24 0 0 1 -48 0 C26 50, 36 38, 50 18 Z" fill="#e3eef6" />
      <path d="M36 66 l9 -10 l8 7 l11 -14" fill="none" stroke="#2c6e9b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="64" cy="49" r="4.5" fill="#d0533c" />
    </svg>
  );
}

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
export const TabIcon = {
  today: () => <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3" {...P} /><path d="M4 10h16M9 3v4M15 3v4" {...P} /><path d="M9 15l2 2 4-4" {...P} /></svg>,
  ua: () => <svg viewBox="0 0 24 24"><path d="M4 19h16" {...P} /><path d="M5 15l4-5 4 3 6-7" {...P} /><circle cx="19" cy="6" r="1.4" fill="currentColor" /></svg>,
  attack: () => <svg viewBox="0 0 24 24"><path d="M7 20c-1.5 0-2.5-1-2.5-2.5 0-2 1.5-3 2-5.5C7 9 6.5 6 9 4.5c2-1.2 4 .3 4 2.5 0 2.5-1.5 4 0 6.5 1 1.6 4 2 5.5 3 1.2.8.8 3.5-1.5 3.5Z" {...P} /><path d="M16 4l1.5 2.5M19.5 7.5L17 8.5" {...P} /></svg>,
  more: () => <svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="18" cy="12" r="1.6" fill="currentColor" /></svg>,
};

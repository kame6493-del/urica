import { useState } from 'react';
import { SITES, type AppData, type Attack } from '../domain/types';
import { attackDays, attackSummary, fmtDate } from '../domain/calc';
import { newId } from '../domain/data';
import { painColor, TopBar, type Update } from './common';

type Spot = { site: string; x: number; y: number; label: string; anchor: 'start' | 'end' | 'middle' };

/** 上から見た両足。画面の右が自分の右足 */
function foot(cx: number, side: 'L' | 'R') {
  const s = side === 'R' ? -1 : 1; // 親指のある内側の向き
  const toes = [
    { dx: 22 * s, dy: 34, r: 11 }, { dx: 4 * s, dy: 30, r: 7.5 }, { dx: -10 * s, dy: 33, r: 7 },
    { dx: -22 * s, dy: 39, r: 6.5 }, { dx: -31 * s, dy: 48, r: 6 },
  ];
  return (
    <g>
      <path d={`M${cx - 36},70 C${cx - 40},40 ${cx + 40},40 ${cx + 36},70 C${cx + 34},120 ${cx + 30},160 ${cx + 22},180 C${cx + 12},198 ${cx - 12},198 ${cx - 22},180 C${cx - 30},160 ${cx - 34},120 ${cx - 36},70 Z`} fill="#f3ece3" stroke="#c9bfb1" strokeWidth="1.5" />
      {toes.map((t, i) => <ellipse key={i} cx={cx + t.dx} cy={t.dy} rx={t.r} ry={t.r * 1.15} fill="#f3ece3" stroke="#c9bfb1" strokeWidth="1.5" />)}
    </g>
  );
}

export function FeetPicker(p: { sites: string[]; toggle: (s: string) => void }) {
  const L = 100;
  const R = 240;
  const spots: Spot[] = [
    { site: '左足の親指', x: L + 22, y: 34, label: '親指', anchor: 'middle' },
    { site: '右足の親指', x: R - 22, y: 34, label: '親指', anchor: 'middle' },
    { site: '左足の甲', x: L, y: 95, label: '甲', anchor: 'middle' },
    { site: '右足の甲', x: R, y: 95, label: '甲', anchor: 'middle' },
    { site: '左足首', x: L, y: 145, label: '足首', anchor: 'middle' },
    { site: '右足首', x: R, y: 145, label: '足首', anchor: 'middle' },
    { site: '左かかと', x: L, y: 182, label: 'かかと', anchor: 'middle' },
    { site: '右かかと', x: R, y: 182, label: 'かかと', anchor: 'middle' },
  ];
  return (
    <svg className="feet" viewBox="0 6 340 216" role="group" aria-label="足の図。押すと場所を選べます">
      {foot(L, 'L')}
      {foot(R, 'R')}
      <text x={L} y={216} textAnchor="middle" style={{ fontSize: 12, fill: '#4f5b66' }}>左足</text>
      <text x={R} y={216} textAnchor="middle" style={{ fontSize: 12, fill: '#4f5b66' }}>右足</text>
      {spots.map((s) => {
        const on = p.sites.includes(s.site);
        return (
          <g key={s.site} className={`spot${on ? ' on' : ''}`} onClick={() => p.toggle(s.site)} role="checkbox" aria-checked={on} aria-label={s.site}>
            <circle cx={s.x} cy={s.y} r="9" />
            <circle className="hit" cx={s.x} cy={s.y} r="20" />
            {s.label === '親指'
              ? <text x={s.x} y={s.y - 15} textAnchor="middle">{s.label}</text>
              : <text x={s.x + (s.site.startsWith('左') ? -14 : 14)} y={s.y + 4} textAnchor={s.site.startsWith('左') ? 'end' : 'start'}>{s.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function PainPicker(p: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="pain" role="radiogroup" aria-label="痛みの強さ">
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} role="radio" aria-checked={p.value === i} className={p.value === i ? 'on' : ''}
            style={p.value === i ? { background: painColor(i) } : undefined} onClick={() => p.onChange(i)}>{i}</button>
        ))}
      </div>
      <div className="pain-scale"><span>0 痛みなし</span><span>5</span><span>10 最もひどい</span></div>
    </div>
  );
}

export function AttackForm(p: { today: string; initial?: Attack; onSave: (a: Attack) => void; onCancel: () => void; onDelete?: () => void }) {
  const a = p.initial;
  const [start, setStart] = useState(a?.start ?? p.today);
  const [ongoing, setOngoing] = useState(a ? a.end === null : true);
  const [end, setEnd] = useState(a?.end ?? p.today);
  const [sites, setSites] = useState<string[]>(a?.sites ?? []);
  const [pain, setPain] = useState(a?.pain ?? 7);
  const [note, setNote] = useState(a?.note ?? '');
  const [err, setErr] = useState('');
  const toggle = (s: string) => setSites((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]));

  const save = () => {
    if (!start || start > p.today) return setErr('始まった日を正しく入れてください');
    if (!ongoing && (!end || end < start || end > p.today)) return setErr('おさまった日は、始まった日〜今日の間で入れてください');
    p.onSave({ id: a?.id ?? newId('a'), start, end: ongoing ? null : end, sites, pain, note: note.trim() });
  };

  return (
    <div className="page sub attack-form">
      <TopBar title={a ? '発作の記録を直す' : '発作を記録する'} onBack={p.onCancel} />
      <section className="card">
        <h2>痛む場所</h2>
        <FeetPicker sites={sites} toggle={toggle} />
        <div className="chips">
          {SITES.map((s) => (
            <button key={s} className={`chip coral${sites.includes(s) ? ' on' : ''}`} onClick={() => toggle(s)}>{s}</button>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>痛みの強さ<span className="tag coral">{pain}/10</span></h2>
        <PainPicker value={pain} onChange={setPain} />
      </section>
      <section className="card">
        <h2>いつから</h2>
        <label className="field"><span>始まった日</span>
          <input className="input" type="date" max={p.today} value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="check-line"><input type="checkbox" checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} />まだ続いている</label>
        {!ongoing && (
          <label className="field"><span>おさまった日</span>
            <input className="input" type="date" min={start} max={p.today} value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        )}
        <label className="field"><span>メモ(きっかけ・飲んだ薬など)</span>
          <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="例: 前の晩に飲み会。痛み止めを飲んだ" />
        </label>
        {err && <p className="err">{err}</p>}
        <button className="btn coral primary wide big" onClick={save}>記録する</button>
        {p.onDelete && <button className="link small" style={{ color: 'var(--coral)', marginTop: 8 }} onClick={p.onDelete}>この記録を消す</button>}
      </section>
      <p className="disclaimer">強い痛み・発熱・いつもと違う症状があるときは、早めに医療機関に相談してください。</p>
    </div>
  );
}

export function Attacks(p: { data: AppData; today: string; update: Update; openForm: (a?: Attack) => void }) {
  const s = attackSummary(p.data.attacks, p.today);
  const list = [...p.data.attacks].sort((a, b) => b.start.localeCompare(a.start));
  return (
    <div className="page attacks">
      <div className="head"><h1>発作</h1><span className="sub">痛風発作の記録</span></div>
      <section className="card">
        <div className="stat3">
          <div><b>{s.ongoing.length ? '続いている' : s.daysSinceLast === null ? '—' : `${s.daysSinceLast}日`}</b><span>{s.ongoing.length ? '今の発作' : '前の発作から'}</span></div>
          <div><b>{s.countYear}回</b><span>この1年</span></div>
          <div><b style={{ fontSize: s.topSites[0] && s.topSites[0][0].length > 4 ? '1em' : undefined }}>{s.topSites[0]?.[0] ?? '—'}</b><span>多い場所</span></div>
        </div>
      </section>
      <button className="btn coral primary wide big" style={{ marginBottom: 14 }} onClick={() => p.openForm()}>発作を記録する</button>
      {list.length === 0 && <p className="muted center">発作の記録はまだありません。</p>}
      {list.map((a) => (
        <div key={a.id} className={`attack${a.end ? ' done' : ''}`}>
          <div className="row between">
            <span className="when">{fmtDate(a.start, true)}{a.end ? ` 〜 ${fmtDate(a.end, false)}` : ' 〜'}</span>
            <span className="tag coral" style={{ background: painColor(a.pain), color: '#fff' }}>痛み {a.pain}</span>
          </div>
          <div className="small" style={{ color: 'var(--ink-2)' }}>
            {a.sites.join('・') || '場所の記録なし'} ・ {a.end ? `${attackDays(a, p.today)}日間` : `${attackDays(a, p.today)}日目`}
          </div>
          {a.note && <div className="small muted">{a.note}</div>}
          <div className="row" style={{ marginTop: 6 }}>
            {!a.end && <button className="btn small" onClick={() => p.update((d) => ({ ...d, attacks: d.attacks.map((x) => (x.id === a.id ? { ...x, end: p.today } : x)) }))}>今日おさまった</button>}
            <button className="btn small ghost" onClick={() => p.openForm(a)}>直す</button>
          </div>
        </div>
      ))}
    </div>
  );
}

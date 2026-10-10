import { useState } from 'react';
import { SITES, type AppData, type Attack } from '../domain/types';
import { attackDays, attackSummary, fmtDate } from '../domain/calc';
import { newId } from '../domain/data';
import { Empty, Ico, painColor, painLabel, TopBar, type Update } from './common';
import footL from '../assets/art/foot_l.png';
import footR from '../assets/art/foot_r.png';
import emptyFoot from '../assets/art/empty_foot.png';

/** 足の絵の上の場所(絵の幅・高さに対する割合)。左足の絵は親指が右側。右足は左右反転 */
const SPOT_POS: Record<string, { x: number; y: number }> = {
  親指: { x: 0.74, y: 0.1 },
  甲: { x: 0.5, y: 0.4 },
  足首: { x: 0.5, y: 0.7 },
  かかと: { x: 0.5, y: 0.88 },
};
const PART = (site: string) => (site.includes('親指') ? '親指' : site.includes('甲') ? '甲' : site.includes('足首') ? '足首' : site.includes('かかと') ? 'かかと' : null);

function Foot(p: { side: 'L' | 'R'; sites: string[]; toggle?: (s: string) => void; small?: boolean }) {
  const prefix = p.side === 'L' ? '左' : '右';
  const names = ['親指', '甲', '足首', 'かかと'];
  return (
    <div className={`foot${p.small ? ' small' : ''}`}>
      <img src={p.side === 'L' ? footL : footR} alt="" draggable={false} />
      {names.map((n) => {
        const site = n === '親指' ? `${prefix}足の親指` : n === '甲' ? `${prefix}足の甲` : n === '足首' ? `${prefix}足首` : `${prefix}かかと`;
        const pos = SPOT_POS[n];
        const x = p.side === 'L' ? pos.x : 1 - pos.x;
        const on = p.sites.includes(site);
        if (p.small) return on ? <i key={n} className="glow" style={{ left: `${x * 100}%`, top: `${pos.y * 100}%` }} /> : null;
        return (
          <button key={n} type="button" className={`spot${on ? ' on' : ''}`} style={{ left: `${x * 100}%`, top: `${pos.y * 100}%` }}
            role="checkbox" aria-checked={on} aria-label={site} onClick={() => p.toggle?.(site)}>
            <i />
            <span className={`spot-l ${n === '親指' ? 'top' : x < 0.5 ? 'left' : 'right'}`}>{n}</span>
          </button>
        );
      })}
    </div>
  );
}

export function FeetPicker(p: { sites: string[]; toggle: (s: string) => void }) {
  return (
    <div className="feet" role="group" aria-label="足の図。押すと場所を選べます">
      <figure><Foot side="L" sites={p.sites} toggle={p.toggle} /><figcaption>左足</figcaption></figure>
      <figure><Foot side="R" sites={p.sites} toggle={p.toggle} /><figcaption>右足</figcaption></figure>
    </div>
  );
}

export function PainPicker(p: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="pain-now">
        <b className="num" style={{ color: painColor(p.value) }}>{p.value}</b>
        <span style={{ color: painColor(p.value) }}>{painLabel(p.value)}</span>
      </div>
      <div className="pain" role="radiogroup" aria-label="痛みの強さ">
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} role="radio" aria-checked={p.value === i} className={p.value === i ? 'on' : ''}
            style={p.value === i ? { background: painColor(i) } : undefined} onClick={() => p.onChange(i)}>{i}</button>
        ))}
      </div>
      <div className="pain-bar"><i style={{ left: `${p.value * 10}%` }} /></div>
      <div className="pain-scale"><span>0 痛みなし</span><span>10 最もひどい</span></div>
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
      <TopBar title={a ? '発作の記録を直す' : '痛風の発作を記録'} onBack={p.onCancel} />
      <section className="card">
        <label className="field"><span>始まった日</span>
          <input className="input" type="date" max={p.today} value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="check-line switch-line"><span className="grow">まだ続いている</span><input className="switch" type="checkbox" checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} /></label>
        {!ongoing && (
          <label className="field"><span>おさまった日</span>
            <input className="input" type="date" min={start} max={p.today} value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        )}
      </section>
      <section className="card">
        <h2>痛みのあった場所<small className="muted">(複数選べます)</small></h2>
        <FeetPicker sites={sites} toggle={toggle} />
        <div className="chips">
          {SITES.map((s) => (
            <button key={s} className={`chip coral${sites.includes(s) ? ' on' : ''}`} onClick={() => toggle(s)}>{s}</button>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>痛みの強さ</h2>
        <PainPicker value={pain} onChange={setPain} />
      </section>
      <section className="card">
        <label className="field"><span>メモ(任意)</span>
          <textarea className="input" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="どのような状況でしたか？ 例: 前の晩に飲み会。痛み止めを飲んだ" />
        </label>
        {err && <p className="err">{err}</p>}
        <div className="two actions">
          <button className="btn ghost big" onClick={p.onCancel}>キャンセル</button>
          <button className="btn primary big" onClick={save}>この内容で記録する</button>
        </div>
        {p.onDelete && <button className="link small" style={{ color: 'var(--red-d)', marginTop: 8 }} onClick={p.onDelete}>この記録を消す</button>}
      </section>
      <p className="disclaimer">強い痛み・発熱・いつもと違う症状があるときは、早めに医療機関に相談してください。</p>
    </div>
  );
}

/** 発作の一覧(見本の「発作の履歴画面」)。記録タブの「発作」に出す */
export function Attacks(p: { data: AppData; today: string; update: Update; openForm: (a?: Attack) => void }) {
  const s = attackSummary(p.data.attacks, p.today);
  const list = [...p.data.attacks].sort((a, b) => b.start.localeCompare(a.start));
  return (
    <div className="attacks">
      <section className="card">
        <div className="stat3">
          <div><b>{s.ongoing.length ? '続いている' : s.daysSinceLast === null ? '—' : `${s.daysSinceLast}日`}</b><span>{s.ongoing.length ? '今の発作' : '前の発作から'}</span></div>
          <div><b>{s.countYear}回</b><span>この1年</span></div>
          <div><b style={{ fontSize: s.topSites[0] && s.topSites[0][0].length > 4 ? '1em' : undefined }}>{s.topSites[0]?.[0] ?? '—'}</b><span>多い場所</span></div>
        </div>
      </section>
      <button className="btn coral primary wide big" style={{ marginBottom: 14 }} onClick={() => p.openForm()}><Ico.plus size={20} />発作を記録する</button>
      {list.length === 0 && (
        <section className="card"><Empty art={emptyFoot} title="まだ発作の記録がありません">痛みの場所や強さを記録しておくと、受診のときに伝えやすくなります。</Empty></section>
      )}
      {list.map((a) => {
        const side: 'L' | 'R' = a.sites.some((x) => x.startsWith('左')) && !a.sites.some((x) => x.startsWith('右')) ? 'L' : 'R';
        const days = attackDays(a, p.today);
        return (
          <div key={a.id} className={`attack card${a.end ? ' done' : ''}`}>
            <div className="row between">
              <span className="when">{fmtDate(a.start, true)}</span>
              <span className="badge" style={{ background: painColor(a.pain), color: '#fff' }}>{painLabel(a.pain)}</span>
            </div>
            <div className="atk-body">
              {a.sites.some((x) => PART(x)) ? <Foot side={side} sites={a.sites} small /> : <img className="atk-art" src={emptyFoot} alt="" />}
              <div className="grow">
                <div className="atk-site">{a.sites.join('・') || '場所の記録なし'}</div>
                <div className="atk-stats">
                  <span><i className="dot" style={{ background: painColor(a.pain) }} />痛み <b className="num" style={{ color: painColor(a.pain) }}>{a.pain}</b>/10</span>
                  <span><Ico.calendar size={16} />{a.end ? `${days}日間(〜${fmtDate(a.end, false)})` : `${days}日目・続いている`}</span>
                </div>
                {a.note && <div className="small muted">{a.note}</div>}
              </div>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              {!a.end && <button className="btn small" onClick={() => p.update((d) => ({ ...d, attacks: d.attacks.map((x) => (x.id === a.id ? { ...x, end: p.today } : x)) }))}>今日おさまった</button>}
              <button className="btn small ghost" onClick={() => p.openForm(a)}>直す</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

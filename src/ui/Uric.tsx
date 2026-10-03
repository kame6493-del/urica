import { useState } from 'react';
import type { AppData, Attack, LabResult } from '../domain/types';
import { FREE_RANGES, RANGE_LABEL, chartModel, fmtDate, fmtUa, labTrend, rangeStart, sortedLabs, type GraphRange } from '../domain/calc';
import { GUIDE_URIC_LIMIT } from '../domain/guide';
import { UA_MAX, UA_MIN, newId } from '../domain/data';
import { Source, type Update } from './common';

export function UaChart(p: { labs: LabResult[]; attacks: Attack[]; from: string; to: string; target: number | null; width?: number; height?: number }) {
  const m = chartModel(p.labs, p.attacks, p.from, p.to, p.target, p.width, p.height);
  const path = m.points.map((pt, i) => `${i ? 'L' : 'M'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
  const x0 = m.pad.l;
  const x1 = m.width - m.pad.r;
  const yb = m.height - m.pad.b;
  return (
    <svg className="chart" viewBox={`0 0 ${m.width} ${m.height}`} role="img" aria-label="尿酸値のグラフ">
      {m.yTicks.map((t) => (
        <g key={t.v}>
          <line x1={x0} x2={x1} y1={t.y} y2={t.y} stroke="#ece8df" />
          <text x={x0 - 6} y={t.y + 4} textAnchor="end">{t.v}</text>
        </g>
      ))}
      {m.xTicks.map((t, i) => <text key={i} x={t.x} y={yb + 17} textAnchor="middle">{t.label}</text>)}
      <line x1={x0} x2={x1} y1={yb} y2={yb} stroke="#cfc9bc" />
      {m.limitY !== null && <line x1={x0} x2={x1} y1={m.limitY} y2={m.limitY} stroke="#d0533c" strokeWidth="1.5" strokeDasharray="5 4" />}
      {m.targetY !== null && <line x1={x0} x2={x1} y1={m.targetY} y2={m.targetY} stroke="#2e7d5b" strokeWidth="2" strokeDasharray="2 3" />}
      {m.attacks.map((a, i) => <path key={i} d={`M${a.x - 6},${yb - 1} L${a.x + 6},${yb - 1} L${a.x},${yb - 11} Z`} fill="#d0533c" opacity=".85" />)}
      {m.points.length > 1 && <path d={path} fill="none" stroke="#2c6e9b" strokeWidth="2.5" strokeLinejoin="round" />}
      {m.points.map((pt) => (
        <g key={pt.date + pt.ua}>
          <circle cx={pt.x} cy={pt.y} r="4.5" fill="#fff" stroke="#2c6e9b" strokeWidth="2.5" />
        </g>
      ))}
      {m.points.length > 0 && (() => {
        const last = m.points[m.points.length - 1];
        return <text x={Math.min(last.x, x1 - 14)} y={last.y - 10} textAnchor="middle" style={{ fill: '#1f2a33', fontWeight: 700, fontSize: 12 }}>{fmtUa(last.ua)}</text>;
      })()}
      {m.points.length === 0 && <text x={(x0 + x1) / 2} y={(m.pad.t + yb) / 2} textAnchor="middle" style={{ fontSize: 13 }}>この期間の記録はまだありません</text>}
    </svg>
  );
}

export function Uric(p: { data: AppData; today: string; premium: boolean; update: Update; openPaywall: () => void; goTarget: () => void }) {
  const { data, today } = p;
  const [range, setRange] = useState<GraphRange>('1y');
  const [date, setDate] = useState(today);
  const [val, setVal] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const target = data.settings.targetUa;
  const trend = labTrend(data.labs, target);
  const from = rangeStart(range, today, data.labs);

  const save = () => {
    const v = Number(val.replace(',', '.'));
    if (!date || date > today) return setErr('検査の日を正しく入れてください(未来の日は入れられません)');
    if (!val || !Number.isFinite(v) || v < UA_MIN || v > UA_MAX) return setErr(`尿酸値を ${UA_MIN}〜${UA_MAX} の数で入れてください`);
    p.update((d) => ({ ...d, labs: sortedLabs([...d.labs, { id: newId('l'), date, ua: Math.round(v * 10) / 10, note: note.trim() }]) }));
    setVal(''); setNote(''); setErr('');
  };

  return (
    <div className="page uric">
      <div className="head"><h1>尿酸値</h1><span className="sub">血液検査の結果</span></div>

      <section className="card">
        {trend.latest ? (
          <div className="ua-hero">
            <span className="big-num">{fmtUa(trend.latest.ua)}<small>mg/dL</small></span>
            {trend.diff !== null && (
              <span className={`diff ${trend.diff < 0 ? 'down' : trend.diff > 0 ? 'up' : ''}`}>
                前回より {trend.diff > 0 ? '+' : ''}{fmtUa(trend.diff)}
              </span>
            )}
            <span className="small muted" style={{ width: '100%' }}>{fmtDate(trend.latest.date)}の検査</span>
          </div>
        ) : <p className="muted" style={{ margin: 0 }}>まだ記録がありません。下から検査の結果を入れてください。</p>}

        <div className="chips" style={{ margin: '12px 0 4px' }} role="tablist" aria-label="グラフの期間">
          {(['6m', '1y', '3y', 'all'] as GraphRange[]).map((r) => {
            const locked = !p.premium && !FREE_RANGES.includes(r);
            return (
              <button key={r} className={`chip${range === r ? ' on' : ''}${locked ? ' locked' : ''}`}
                onClick={() => (locked ? p.openPaywall() : setRange(r))}>
                {RANGE_LABEL[r]}{locked && <small>完全版</small>}
              </button>
            );
          })}
        </div>
        <UaChart labs={data.labs} attacks={data.attacks} from={from} to={today} target={target} />
        <div className="legend">
          <span><i className="dot" style={{ background: '#2c6e9b' }} />尿酸値</span>
          {target !== null && <span><i className="ln" style={{ color: '#2e7d5b' }} />目標 {fmtUa(target)}</span>}
          <span><i className="ln" style={{ color: '#d0533c' }} />7.0(高尿酸血症の境目)</span>
          <span><i className="dot" style={{ background: '#d0533c', borderRadius: 0, clipPath: 'polygon(50% 0,100% 100%,0 100%)' }} />発作</span>
        </div>
        {target === null && (
          <button className="link small" onClick={p.goTarget}>主治医と決めた目標の線を引く</button>
        )}
        <Source source={GUIDE_URIC_LIMIT.source} url={GUIDE_URIC_LIMIT.url} />
      </section>

      <section className="card" id="ua-form">
        <h2>検査の結果を入れる</h2>
        <div className="two">
          <label className="field"><span>検査の日</span>
            <input className="input" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field"><span>尿酸値(mg/dL)</span>
            <input className="input" inputMode="decimal" placeholder="例 6.4" value={val} onChange={(e) => setVal(e.target.value)} />
          </label>
        </div>
        <label className="field"><span>メモ(任意)</span>
          <input className="input" placeholder="薬が変わった など" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {err && <p className="err">{err}</p>}
        <button className="btn primary wide" onClick={save}>記録する</button>
      </section>

      {data.labs.length > 0 && (
        <section className="card">
          <h2>これまでの記録<span className="tag">{data.labs.length}件</span></h2>
          <ul className="list">
            {[...sortedLabs(data.labs)].reverse().map((l) => (
              <li key={l.id}>
                <span className="grow">{fmtDate(l.date)}{l.note && <><br /><span className="small muted">{l.note}</span></>}</span>
                <span className="v">{fmtUa(l.ua)}</span>
                <button className="x" aria-label="消す" onClick={() => {
                  if (confirm(`${fmtDate(l.date)} の ${fmtUa(l.ua)} を消しますか？`)) p.update((d) => ({ ...d, labs: d.labs.filter((x) => x.id !== l.id) }));
                }}>×</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

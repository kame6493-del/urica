import { useState } from 'react';
import type { AppData, Attack, LabResult } from '../domain/types';
import { FREE_RANGES, RANGE_LABEL, chartModel, fmtDate, fmtUa, labTrend, rangeStart, sortedLabs, type GraphRange } from '../domain/calc';
import { GUIDE_URIC_LIMIT } from '../domain/guide';
import { UA_MAX, UA_MIN, newId } from '../domain/data';
import { Empty, Ico, PageHead, Seg, Source, TopBar, UaBadge, type Update } from './common';
import emptyChart from '../assets/art/empty_chart.png';

const C = { line: '#2F6FDE', target: '#16A34A', limit: '#EF4444', grid: '#E8EEF2', axis: '#CBD5DD' };

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
          <line x1={x0} x2={x1} y1={t.y} y2={t.y} stroke={C.grid} />
          <text x={x0 - 6} y={t.y + 4} textAnchor="end">{t.v.toFixed(1)}</text>
        </g>
      ))}
      {m.xTicks.map((t, i) => <text key={i} x={t.x} y={yb + 17} textAnchor="middle">{t.label}</text>)}
      <line x1={x0} x2={x1} y1={yb} y2={yb} stroke={C.axis} />
      {m.limitY !== null && <line x1={x0} x2={x1} y1={m.limitY} y2={m.limitY} stroke={C.limit} strokeWidth="1.5" strokeDasharray="5 4" />}
      {m.targetY !== null && <line x1={x0} x2={x1} y1={m.targetY} y2={m.targetY} stroke={C.target} strokeWidth="1.8" strokeDasharray="6 4" />}
      {m.attacks.map((a, i) => (
        <g key={i} className="atk-mark">
          <line x1={a.x} x2={a.x} y1={m.pad.t + 9} y2={yb} stroke={C.limit} strokeWidth="1" strokeDasharray="2 3" opacity=".5" />
          <circle cx={a.x} cy={m.pad.t + 8} r="7" fill={C.limit} />
          <text x={a.x} y={m.pad.t + 12} textAnchor="middle" style={{ fill: '#fff', fontWeight: 700, fontSize: 11 }}>!</text>
        </g>
      ))}
      {m.points.length > 1 && <path d={path} fill="none" stroke={C.line} strokeWidth="2.4" strokeLinejoin="round" />}
      {m.points.map((pt) => <circle key={pt.date + pt.ua} cx={pt.x} cy={pt.y} r="4.2" fill="#fff" stroke={C.line} strokeWidth="2.4" />)}
      {m.points.length > 0 && (() => {
        const last = m.points[m.points.length - 1];
        return <text x={Math.min(last.x, x1 - 14)} y={last.y - 10} textAnchor="middle" style={{ fill: '#1F2937', fontWeight: 700, fontSize: 12 }}>{fmtUa(last.ua)}</text>;
      })()}
      {m.points.length === 0 && <text x={(x0 + x1) / 2} y={(m.pad.t + yb) / 2} textAnchor="middle" style={{ fontSize: 13 }}>この期間の記録はまだありません</text>}
    </svg>
  );
}

export function ChartLegend(p: { target: number | null; attacks?: boolean }) {
  return (
    <div className="legend">
      <span><i className="lg-line" style={{ borderColor: C.line, borderTopStyle: 'solid' }} /><i className="lg-dot" style={{ borderColor: C.line }} />尿酸値</span>
      {p.target !== null && <span><i className="lg-line" style={{ borderColor: C.target }} />目標 {fmtUa(p.target)}(主治医と決めた値)</span>}
      <span><i className="lg-line" style={{ borderColor: C.limit }} />{fmtUa(GUIDE_URIC_LIMIT.value)}(高尿酸血症の境目)</span>
      {p.attacks !== false && <span><i className="lg-atk">!</i>発作の記録</span>}
    </div>
  );
}

const RANGES: GraphRange[] = ['6m', '1y', '3y', 'all'];

export function Uric(p: { data: AppData; today: string; premium: boolean; update: Update; openPaywall: () => void; goTarget: () => void; openForm: () => void }) {
  const { data, today } = p;
  const [range, setRange] = useState<GraphRange>('1y');
  const target = data.settings.targetUa;
  const trend = labTrend(data.labs, target);
  const from = rangeStart(range, today, data.labs);
  const inRange = sortedLabs(data.labs).filter((l) => l.date >= from && l.date <= today);
  const avg = inRange.length ? Math.round((inRange.reduce((s, l) => s + l.ua, 0) / inRange.length) * 10) / 10 : null;
  const desc = [...sortedLabs(data.labs)].reverse();

  return (
    <div className="page uric">
      <PageHead title="尿酸値のグラフ" sub="血液検査の結果" />
      <Seg label="グラフの期間" value={range} onChange={(r) => (!p.premium && !FREE_RANGES.includes(r) ? p.openPaywall() : setRange(r))}
        items={RANGES.map((r) => ({ key: r, label: RANGE_LABEL[r], locked: !p.premium && !FREE_RANGES.includes(r) }))} />

      <section className="card chart-card">
        <div className="unit-note">(mg/dL)</div>
        <UaChart labs={data.labs} attacks={data.attacks} from={from} to={today} target={target} height={240} />
        <ChartLegend target={target} />
        {target === null && <button className="link small" onClick={p.goTarget}>主治医と決めた目標の線を引く</button>}
        <Source source={GUIDE_URIC_LIMIT.source} url={GUIDE_URIC_LIMIT.url} />
      </section>

      <h2 className="sec">直近のデータ</h2>
      <div className="stat3 boxes">
        <div><span>最新の尿酸値</span><b className="num">{trend.latest ? fmtUa(trend.latest.ua) : '—'}</b><small>mg/dL</small><em>{trend.latest ? fmtDate(trend.latest.date, false) : ''}</em></div>
        <div><span>平均値</span><b className="num">{avg === null ? '—' : fmtUa(avg)}</b><small>mg/dL</small><em>(表示中の期間)</em></div>
        <div><span>前回との差</span>
          <b className={`num diff ${trend.diff === null ? '' : trend.diff < 0 ? 'down' : trend.diff > 0 ? 'up' : ''}`}>{trend.diff === null ? '—' : `${trend.diff > 0 ? '+' : ''}${fmtUa(trend.diff)}`}</b>
          <small>mg/dL</small><em>{trend.prev ? `(${fmtDate(trend.prev.date, false)}比)` : ''}</em></div>
      </div>

      <button className="btn primary wide big" style={{ margin: '14px 0' }} onClick={p.openForm}><Ico.plus size={20} />検査値を入力する</button>

      <section className="card">
        <h2>検査値の履歴{data.labs.length > 0 && <span className="tag">{data.labs.length}件</span>}</h2>
        {desc.length === 0 ? (
          <Empty art={emptyChart} title="まだ検査値の記録がありません">検査結果を入力して、からだの変化を見えるようにしましょう。</Empty>
        ) : (
          <ul className="labs">
            {desc.map((l, i) => {
              const prev = desc[i + 1];
              const d = prev ? Math.round((l.ua - prev.ua) * 10) / 10 : null;
              return (
                <li key={l.id}>
                  <div className="grow">
                    <div className="lab-date">{fmtDate(l.date)}</div>
                    <div className="lab-val"><b className="num">{fmtUa(l.ua)}</b><small>mg/dL</small></div>
                    <UaBadge ua={l.ua} target={target} />
                    {l.note && <div className="small muted">{l.note}</div>}
                  </div>
                  {d !== null && <span className={`lab-diff num ${d < 0 ? 'down' : d > 0 ? 'up' : ''}`}>{d > 0 ? '+' : ''}{fmtUa(d)}<small>前回比</small></span>}
                  <button className="x" aria-label="消す" onClick={() => {
                    if (confirm(`${fmtDate(l.date)} の ${fmtUa(l.ua)} を消しますか？`)) p.update((dd) => ({ ...dd, labs: dd.labs.filter((x) => x.id !== l.id) }));
                  }}><Ico.trash size={20} /></button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** 検査値の入力(見本の「検査値の入力画面」) */
export function LabForm(p: { data: AppData; today: string; update: Update; onBack: () => void; onSaved: () => void }) {
  const last = labTrend(p.data.labs, null).latest;
  const [date, setDate] = useState(p.today);
  const [val, setVal] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const step = (d: number) => {
    const cur = Number(val.replace(',', '.'));
    const base = val && Number.isFinite(cur) ? cur : last?.ua ?? 6.0;
    const next = Math.min(UA_MAX, Math.max(UA_MIN, Math.round((base + d) * 10) / 10));
    setVal(next.toFixed(1));
  };
  const save = () => {
    const v = Number(val.replace(',', '.'));
    if (!date || date > p.today) return setErr('検査の日を正しく入れてください(未来の日は入れられません)');
    if (!val || !Number.isFinite(v) || v < UA_MIN || v > UA_MAX) return setErr(`尿酸値を ${UA_MIN}〜${UA_MAX} の数で入れてください`);
    p.update((d) => ({ ...d, labs: sortedLabs([...d.labs, { id: newId('l'), date, ua: Math.round(v * 10) / 10, note: note.trim() }]) }));
    p.onSaved();
  };
  return (
    <div className="page sub lab-form" id="ua-form">
      <TopBar title="検査値の入力" onBack={p.onBack} />
      <section className="card">
        <label className="field"><span>検査日</span>
          <input className="input" type="date" max={p.today} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="field"><span>尿酸値</span>
          <div className="ua-input">
            <input className="input big-input num" inputMode="decimal" placeholder="例 6.4" value={val} onChange={(e) => setVal(e.target.value)} aria-label="尿酸値(mg/dL)" />
            <span className="unit">mg/dL</span>
          </div>
          <div className="stepper">
            <button className="btn ghost" aria-label="0.1 下げる" onClick={() => step(-0.1)}><Ico.minus /></button>
            <button className="btn primary" aria-label="0.1 上げる" onClick={() => step(0.1)}><Ico.plus /></button>
          </div>
          <p className="small muted" style={{ margin: '8px 0 0' }}>健診や病院の結果の数字をそのまま入れます(小数点第1位まで)。参考: {fmtUa(GUIDE_URIC_LIMIT.value)} mg/dL を超えると高尿酸血症と呼ばれます。</p>
          <Source source={GUIDE_URIC_LIMIT.source} url={GUIDE_URIC_LIMIT.url} />
        </div>
        <label className="field"><span>メモ(任意)</span>
          <textarea className="input" rows={3} maxLength={200} placeholder="薬が変わった など" value={note} onChange={(e) => setNote(e.target.value)} />
          <small className="counter">{note.length}/200</small>
        </label>
        {err && <p className="err">{err}</p>}
        <button className="btn primary wide big" onClick={save}>この内容で保存する</button>
      </section>
    </div>
  );
}

import { useState } from 'react';
import type { AppData } from '../domain/types';
import { addDays, buildReport, fmtDate, fmtUa, reportText, toCsv } from '../domain/calc';
import { shareTextFile } from '../platform/native';
import { LockedCard, TopBar } from './common';
import { UaChart } from './Uric';

const PERIODS = [
  { key: '3m', label: '3か月', days: 91 },
  { key: '6m', label: '半年', days: 183 },
  { key: '1y', label: '1年', days: 365 },
  { key: 'all', label: '全期間', days: 0 },
] as const;

export function Report(p: { data: AppData; today: string; premium: boolean; onBack: () => void; openPaywall: () => void }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['key']>('6m');
  const [msg, setMsg] = useState('');
  if (!p.premium) {
    return (
      <div className="page sub report">
        <TopBar title="受診用のまとめ" onBack={p.onBack} />
        <LockedCard title="受診用のまとめ" onUnlock={p.openPaywall}>
          診察のときに、尿酸値の変化・発作・薬を飲めた割合・お酒の量を1画面で見せられます。文章やCSVでメール・印刷にも。
        </LockedCard>
      </div>
    );
  }
  const per = PERIODS.find((x) => x.key === period)!;
  const firsts = [...p.data.labs.map((l) => l.date), ...p.data.attacks.map((a) => a.start), ...Object.keys(p.data.days)].sort();
  const from = per.days ? addDays(p.today, -per.days) : (firsts[0] ?? addDays(p.today, -365));
  const r = buildReport(p.data, from, p.today);

  const send = async (kind: 'text' | 'csv') => {
    setMsg('');
    try {
      const res = kind === 'text'
        ? await shareTextFile(`urica-report-${p.today}.txt`, reportText(r, p.today), 'text/plain')
        : await shareTextFile(`urica-${p.today}.csv`, toCsv(p.data, from, p.today), 'text/csv');
      if (res !== 'cancelled') setMsg(kind === 'text' ? 'まとめを書き出しました' : 'CSVを書き出しました');
    } catch (e) {
      setMsg(`書き出せませんでした(${(e as Error).message ?? e})`);
    }
  };

  return (
    <div className="page sub report">
      <TopBar title="受診用のまとめ" onBack={p.onBack} />
      <div className="chips" style={{ marginBottom: 12 }}>
        {PERIODS.map((x) => <button key={x.key} className={`chip${period === x.key ? ' on' : ''}`} onClick={() => setPeriod(x.key)}>{x.label}</button>)}
      </div>
      <p className="small muted" style={{ marginTop: 0 }}>{fmtDate(r.from)} 〜 {fmtDate(r.to)}</p>

      <section className="card">
        <h2>尿酸値<span className="tag">{r.labs.length}回</span></h2>
        <UaChart labs={p.data.labs} attacks={p.data.attacks} from={r.from} to={r.to} target={r.target} />
        {r.labs.length > 0 && (
          <table><tbody>
            {r.labs.map((l) => <tr key={l.id}><td>{fmtDate(l.date)}</td><td className="r"><b>{fmtUa(l.ua)}</b></td><td className="small muted">{l.note}</td></tr>)}
          </tbody></table>
        )}
      </section>

      <section className="card">
        <h2>発作<span className="tag coral">{r.attacks.length}回</span></h2>
        {r.attacks.length === 0 ? <p className="muted small" style={{ margin: 0 }}>この期間の発作はありません</p> : (
          <table><tbody>
            {r.attacks.map((a) => (
              <tr key={a.id}><td>{fmtDate(a.start, false)}{a.end ? `〜${fmtDate(a.end, false)}` : '〜'}</td><td>{a.sites.join('・') || '—'}</td><td className="r">痛み {a.pain}</td></tr>
            ))}
          </tbody></table>
        )}
      </section>

      <section className="card">
        <h2>お薬</h2>
        {r.meds.length === 0 ? <p className="muted small" style={{ margin: 0 }}>登録なし</p> : (
          <table><tbody>
            {r.meds.map((m) => <tr key={m.id}><td>{m.name}</td><td>{m.dose}</td><td className="r">{m.times.join('・')}</td></tr>)}
          </tbody></table>
        )}
        {r.adherence.rate !== null && <p style={{ margin: '8px 0 0' }}>飲んだ記録 <b>{r.adherence.taken}/{r.adherence.due}回({r.adherence.rate}%)</b></p>}
      </section>

      <section className="card">
        <h2>生活の記録</h2>
        <table><tbody>
          <tr><td>記録した日</td><td className="r">{r.recordedDays}日</td></tr>
          <tr><td>お酒を飲んだ日</td><td className="r">{r.drinkDays}日</td></tr>
          <tr><td>飲んだ日の量の平均</td><td className="r">{r.avgAlcoholMl === null ? '—' : `${r.avgAlcoholMl.toLocaleString()} mL`}</td></tr>
          <tr><td>水分の平均</td><td className="r">{r.avgWaterMl === null ? '—' : `${r.avgWaterMl.toLocaleString()} mL`}</td></tr>
          <tr><td>プリン体の平均(自分で入れた値)</td><td className="r">{r.avgPurineMg === null ? '—' : `${r.avgPurineMg} mg`}</td></tr>
        </tbody></table>
      </section>

      <div className="pw-cta">
        <button className="btn primary wide" onClick={() => send('text')}>まとめを文章で送る・保存する</button>
        <button className="btn wide" onClick={() => send('csv')}>CSV(表計算用)で書き出す</button>
      </div>
      {msg && <p className="small" role="status">{msg}</p>}
      <p className="disclaimer">本人が記録した内容です。アプリは診断・治療の判断をしません。</p>
    </div>
  );
}

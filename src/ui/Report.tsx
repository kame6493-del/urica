import { useState } from 'react';
import type { AppData } from '../domain/types';
import { addDays, buildReport, fmtDate, fmtUa, reportText, toCsv } from '../domain/calc';
import { shareTextFile } from '../platform/native';
import { Ico, LockedCard, PageHead, Seg, UaBadge } from './common';
import { ChartLegend, UaChart } from './Uric';
import doctor from '../assets/art/doctor.png';
import docArt from '../assets/art/f_doc.png';
import exportArt from '../assets/art/f_export.png';
import shieldArt from '../assets/art/pw_shield.png';

const PERIODS = [
  { key: '3m', label: '3か月', days: 91 },
  { key: '6m', label: '半年', days: 183 },
  { key: '1y', label: '1年', days: 365 },
  { key: 'all', label: 'すべて', days: 0 },
] as const;
type PeriodKey = (typeof PERIODS)[number]['key'];

/** 受診用まとめ(見本の「受診用まとめ画面」「書き出し・共有画面」) */
export function Report(p: { data: AppData; today: string; premium: boolean; openPaywall: () => void }) {
  const [period, setPeriod] = useState<PeriodKey>('6m');
  const [msg, setMsg] = useState('');
  if (!p.premium) {
    return (
      <div className="page report">
        <PageHead title="受診用まとめ" sub="診察のときに見せる・送る" />
        <div className="locked-preview" aria-hidden="true">
          <div className="lp-grid"><i /><i /><i /><i /></div>
          <div className="lp-chart" />
        </div>
        <LockedCard title="受診用まとめ" onUnlock={p.openPaywall}
          points={['尿酸値の変化・発作・薬を飲めた割合・お酒と水分を1画面に', '期間を選べる(3か月・半年・1年・すべて)', '文章やCSVで書き出して、メールや印刷に']}>
          診察の短い時間でも、これまでの記録を正しく伝えられます。
        </LockedCard>
      </div>
    );
  }
  const per = PERIODS.find((x) => x.key === period)!;
  const firsts = [...p.data.labs.map((l) => l.date), ...p.data.attacks.map((a) => a.start), ...Object.keys(p.data.days)].sort();
  const from = per.days ? addDays(p.today, -per.days) : (firsts[0] ?? addDays(p.today, -365));
  const r = buildReport(p.data, from, p.today);
  const latest = r.labs.at(-1) ?? null;
  const avgUa = r.labs.length ? Math.round((r.labs.reduce((s, l) => s + l.ua, 0) / r.labs.length) * 10) / 10 : null;

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
    <div className="page report">
      <PageHead title="受診用まとめ" sub="診察のときに見せる・送る" />
      <Seg label="まとめる期間" value={period} onChange={setPeriod} items={PERIODS.map((x) => ({ key: x.key, label: x.label }))} />
      <div className="range-pill"><Ico.calendar size={18} />{fmtDate(r.from)} 〜 {fmtDate(r.to, false)}</div>

      <div className="stat-grid">
        <div className="stat">
          <span>最新の尿酸値</span>
          <b className="num">{latest ? fmtUa(latest.ua) : '—'}<small>mg/dL</small></b>
          {latest && <em>({fmtDate(latest.date, false)})</em>}
          {latest && <UaBadge ua={latest.ua} target={null} />}
        </div>
        <div className="stat">
          <span>期間の平均</span>
          <b className="num">{avgUa === null ? '—' : fmtUa(avgUa)}<small>mg/dL</small></b>
          <em>{r.labs.length}回の検査{r.target !== null ? `・目標 ${fmtUa(r.target)}` : ''}</em>
        </div>
        <div className="stat">
          <span>服薬の記録</span>
          <b className="num">{r.adherence.rate === null ? '—' : r.adherence.rate}<small>%</small></b>
          <em>{r.adherence.rate === null ? '記録なし' : `(${r.adherence.taken}/${r.adherence.due}回)`}</em>
        </div>
        <div className="stat">
          <span>発作の回数</span>
          <b className="num coral">{r.attacks.length}<small>回</small></b>
          <em>(期間中)</em>
        </div>
        <div className="stat">
          <span>お酒を飲んだ日</span>
          <b className="num">{r.drinkDays}<small>日</small></b>
          <em>{r.avgAlcoholMl === null ? `記録した日 ${r.recordedDays}日` : `飲んだ日の平均 ${r.avgAlcoholMl.toLocaleString()} mL`}</em>
        </div>
        <div className="stat">
          <span>水分(1日平均)</span>
          <b className="num">{r.avgWaterMl === null ? '—' : r.avgWaterMl.toLocaleString()}<small>mL</small></b>
          <em>(記録した日の平均)</em>
        </div>
      </div>

      <section className="card">
        <h2>尿酸値の推移<span className="tag">{r.labs.length}回</span></h2>
        <UaChart labs={p.data.labs} attacks={p.data.attacks} from={r.from} to={r.to} target={r.target} />
        <ChartLegend target={r.target} />
      </section>

      <section className="card doctor-card">
        <img src={doctor} alt="" />
        <div className="grow">
          <div className="bubble">このまとめを、受診のときに医師に見せましょう</div>
          <ul className="checks">
            <li><span className="ck"><Ico.check size={14} /></span>経過がひと目でわかる</li>
            <li><span className="ck"><Ico.check size={14} /></span>服薬・生活の記録もまとめて</li>
            <li><span className="ck"><Ico.check size={14} /></span>文章・CSVで送れる</li>
          </ul>
        </div>
      </section>

      <section className="card report">
        <h2>尿酸値</h2>
        {r.labs.length === 0 ? <p className="muted small" style={{ margin: 0 }}>この期間の記録はありません</p> : (
          <table><tbody>
            {r.labs.map((l) => <tr key={l.id}><td>{fmtDate(l.date)}</td><td className="r"><b>{fmtUa(l.ua)}</b></td><td className="small muted">{l.note}</td></tr>)}
          </tbody></table>
        )}
      </section>

      <section className="card report">
        <h2>発作<span className="tag coral">{r.attacks.length}回</span></h2>
        {r.attacks.length === 0 ? <p className="muted small" style={{ margin: 0 }}>この期間の発作はありません</p> : (
          <table><tbody>
            {r.attacks.map((a) => (
              <tr key={a.id}><td>{fmtDate(a.start, false)}{a.end ? `〜${fmtDate(a.end, false)}` : '〜'}</td><td>{a.sites.join('・') || '—'}</td><td className="r">痛み {a.pain}</td></tr>
            ))}
          </tbody></table>
        )}
      </section>

      <section className="card report">
        <h2>お薬</h2>
        {r.meds.length === 0 ? <p className="muted small" style={{ margin: 0 }}>登録なし</p> : (
          <table><tbody>
            {r.meds.map((m) => <tr key={m.id}><td>{m.name}</td><td>{m.dose}</td><td className="r">{m.times.join('・')}</td></tr>)}
          </tbody></table>
        )}
        {r.adherence.rate !== null && <p style={{ margin: '8px 0 0' }}>飲んだ記録 <b>{r.adherence.taken}/{r.adherence.due}回({r.adherence.rate}%)</b></p>}
      </section>

      <section className="card report">
        <h2>生活の記録</h2>
        <table><tbody>
          <tr><td>記録した日</td><td className="r">{r.recordedDays}日</td></tr>
          <tr><td>お酒を飲んだ日</td><td className="r">{r.drinkDays}日</td></tr>
          <tr><td>飲んだ日の量の平均</td><td className="r">{r.avgAlcoholMl === null ? '—' : `${r.avgAlcoholMl.toLocaleString()} mL`}</td></tr>
          <tr><td>水分の平均</td><td className="r">{r.avgWaterMl === null ? '—' : `${r.avgWaterMl.toLocaleString()} mL`}</td></tr>
          <tr><td>プリン体の平均(自分で入れた値)</td><td className="r">{r.avgPurineMg === null ? '—' : `${r.avgPurineMg} mg`}</td></tr>
        </tbody></table>
      </section>

      <h2 className="sec">書き出し・共有</h2>
      <button className="export" onClick={() => send('text')}>
        <img src={docArt} alt="" />
        <span className="grow"><b>文章で書き出す</b><small>医師に見せやすい文章のまとめを作ります</small></span>
        <Ico.next size={18} />
      </button>
      <button className="export" onClick={() => send('csv')}>
        <img src={exportArt} alt="" />
        <span className="grow"><b>CSVで書き出す</b><small>期間中の記録を表の形で書き出します(表計算ソフト用)</small></span>
        <Ico.next size={18} />
      </button>
      {msg && <p className="small" role="status">{msg}</p>}
      <section className="card note-card">
        <img src={shieldArt} alt="" />
        <p><b>記録は端末の中だけ</b>書き出したファイルは、共有の画面で選んだ送り先にだけ渡ります。外部のサーバーには送りません。</p>
      </section>
      <p className="disclaimer">本人が記録した内容です。アプリは診断・治療の判断をしません。</p>
    </div>
  );
}

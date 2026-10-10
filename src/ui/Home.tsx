import type { AppData } from '../domain/types';
import { addDays, attackDays, attackSummary, dayTotals, daysBetween, dosesFor, firstRecordDate, fmtDate, fmtUa, getDay, labTrend, soberDays } from '../domain/calc';
import { MEDICAL_NOTICE } from '../domain/guide';
import { Empty, Ico, PageHead, UaBadge } from './common';
import { ChartLegend, UaChart } from './Uric';
import pills from '../assets/art/empty_pills.png';
import drop from '../assets/art/drop.png';
import beerBig from '../assets/art/beer_big.png';
import footArt from '../assets/art/empty_foot.png';
import forkArt from '../assets/art/f_fork.png';
import calArt from '../assets/art/calendar.png';
import emptyChart from '../assets/art/empty_chart.png';

/** ホーム(見本の「ホーム画面」): 最新の尿酸値と変化、今日の記録の様子をひと目で */
export function Home(p: {
  data: AppData; today: string; premium: boolean;
  goRecord: () => void; goAttacks: () => void; goGraph: () => void; openLabForm: () => void;
}) {
  const { data, today } = p;
  const s = data.settings;
  const trend = labTrend(data.labs, s.targetUa);
  const day = getDay(data, today);
  const tot = dayTotals(day);
  const doses = dosesFor(data, today);
  const taken = doses.filter((x) => x.taken).length;
  const nextDose = doses.find((x) => !x.taken);
  const sober = soberDays(data, today, firstRecordDate(data));
  const atk = attackSummary(data.attacks, today);
  const ongoing = atk.ongoing[0];
  const waterPct = Math.min(100, (tot.waterMl / s.waterGoal) * 100);
  const nextLab = s.nextLab && s.nextLab >= today ? s.nextLab : null;

  return (
    <div className="page home">
      <PageHead title="ウリカ手帳" logo sub={fmtDate(today, false)} />

      <section className="card ua-card" onClick={trend.latest ? p.goGraph : undefined}>
        <div className="card-label">最新の尿酸値</div>
        {trend.latest ? (
          <>
            <div className="ua-hero">
              <span className="big-num num">{fmtUa(trend.latest.ua)}<small>mg/dL</small></span>
              {trend.diff !== null && (
                <span className="ua-diff">
                  前回より <b className={`num diff ${trend.diff < 0 ? 'down' : trend.diff > 0 ? 'up' : ''}`}>{trend.diff > 0 ? '+' : ''}{fmtUa(trend.diff)}</b>
                  <small>({trend.prev ? fmtDate(trend.prev.date, false) : ''}比)</small>
                </span>
              )}
            </div>
            <UaBadge ua={trend.latest.ua} target={s.targetUa} />
            <UaChart labs={data.labs} attacks={data.attacks} from={addDays(today, -183)} to={today} target={s.targetUa} height={170} />
            <ChartLegend target={s.targetUa} attacks={false} />
            <div className="small muted">{fmtDate(trend.latest.date)}の検査・直近半年</div>
          </>
        ) : (
          <Empty art={emptyChart} title="まだ記録がありません"
            action={<button className="btn primary" onClick={p.openLabForm}><Ico.plus size={18} />最初の記録をつける</button>}>
            尿酸値を記録して、からだの変化を見てみましょう。
          </Empty>
        )}
      </section>

      <h2 className="sec">今日の記録</h2>
      <div className="tiles">
        <button className="tile" onClick={p.goRecord}>
          <span className="tile-h"><img src={pills} alt="" />お薬</span>
          {doses.length === 0 ? <b className="muted">未登録</b> : <b className={taken === doses.length ? 'ok' : ''}>{taken === doses.length ? '服用済み' : `${taken}/${doses.length} 飲んだ`}</b>}
          <small>{doses.length === 0 ? '薬を登録できます' : nextDose ? `次は ${nextDose.time}` : '今日の分は完了'}</small>
        </button>
        <button className="tile" onClick={p.goRecord}>
          <span className="tile-h"><img src={drop} alt="" />水分</span>
          <b className="num">{tot.waterMl.toLocaleString()}<small> / {s.waterGoal.toLocaleString()} mL</small></b>
          <span className="meter thin"><i style={{ width: `${waterPct}%` }} /></span>
        </button>
        <button className="tile" onClick={p.goRecord}>
          <span className="tile-h"><img src={beerBig} alt="" />お酒</span>
          <b className={day.drinks.length ? 'warn' : 'ok'}>{day.drinks.length ? `${day.drinks.length}杯 ${tot.alcoholMl.toLocaleString()} mL` : '飲んでいません'}</b>
          <small>この7日の休肝日 {sober.sober}日</small>
        </button>
        <button className="tile" onClick={p.goAttacks}>
          <span className="tile-h"><img src={footArt} alt="" />発作</span>
          <b className={ongoing ? 'warn' : ''}>{ongoing ? `${attackDays(ongoing, today)}日目` : '記録なし'}</b>
          <small>{ongoing ? '続いている発作があります' : atk.daysSinceLast !== null ? `前の発作から ${atk.daysSinceLast}日` : '今日は記録なし'}</small>
        </button>
        {p.premium && (
          <button className="tile wide" onClick={p.goRecord}>
            <span className="tile-h"><img src={forkArt} alt="" />プリン体</span>
            <b className="num">{tot.purineMg}<small> / {s.purineGoal} mg(自分で入れた量)</small></b>
          </button>
        )}
      </div>

      {nextLab && (
        <section className="card next-lab">
          <img src={calArt} alt="" />
          <div className="grow"><small>次の検査日</small><b>{fmtDate(nextLab)}</b><span className="muted small">あと{daysBetween(today, nextLab)}日</span></div>
        </section>
      )}

      <button className="btn primary wide big" onClick={p.goRecord}><Ico.plus size={20} />今日の記録をつける</button>
      <p className="disclaimer">{MEDICAL_NOTICE}</p>
    </div>
  );
}

import { useState } from 'react';
import type { AppData, Attack } from '../domain/types';
import {
  addDays, addDrink, addFood, addWater, attackDays, dayTotals, dosesFor, firstRecordDate, fmtDate, getDay,
  removeDrink, removeFood, soberDays, toggleDose,
} from '../domain/calc';
import { GUIDE_PURINE, GUIDE_WATER } from '../domain/guide';
import { Empty, Ico, LockedCard, PageHead, Seg, Source, type Update } from './common';
import { Attacks } from './Attacks';
import beer from '../assets/art/beer.png';
import highball from '../assets/art/highball.png';
import sake from '../assets/art/sake.png';
import wine from '../assets/art/wine.png';
import shochu from '../assets/art/shochu.png';
import pills from '../assets/art/empty_pills.png';
import drop from '../assets/art/drop.png';
import beerBig from '../assets/art/beer_big.png';
import footArt from '../assets/art/empty_foot.png';
import forkArt from '../assets/art/f_fork.png';

/** お酒の器の大きさ(器の容量であって、健康の目安ではない) */
export const DRINK_PRESETS: { kind: string; ml: number; label: string; art: string }[] = [
  { kind: 'ビール', ml: 350, label: '缶 350', art: beer },
  { kind: 'ビール', ml: 500, label: '缶 500', art: beer },
  { kind: '発泡酒・新ジャンル', ml: 350, label: '缶 350', art: beer },
  { kind: 'ハイボール・サワー', ml: 350, label: '缶 350', art: highball },
  { kind: '日本酒', ml: 180, label: '1合', art: sake },
  { kind: 'ワイン', ml: 120, label: 'グラス', art: wine },
  { kind: '焼酎', ml: 100, label: '100', art: shochu },
  { kind: 'ウイスキー', ml: 30, label: 'シングル', art: shochu },
];

export type RecordSeg = 'daily' | 'attack';
const WEEK = '日月火水木金土';

function DayStrip(p: { date: string; today: string; setDate: (d: string) => void }) {
  // 選んだ日を真ん中に5日。今日より先は押せない
  const days = [-2, -1, 0, 1, 2].map((n) => addDays(p.date, n));
  return (
    <div className="daystrip">
      <button className="icon" aria-label="前の日" onClick={() => p.setDate(addDays(p.date, -1))}><Ico.back size={20} /></button>
      {days.map((d) => {
        const dt = new Date(`${d}T00:00:00`);
        const future = d > p.today;
        return (
          <button key={d} className={`day${d === p.date ? ' on' : ''}${dt.getDay() === 6 ? ' sat' : dt.getDay() === 0 ? ' sun' : ''}`} disabled={future}
            onClick={() => p.setDate(d)} aria-label={fmtDate(d)} aria-pressed={d === p.date}>
            <b>{dt.getDate()}</b><small>{WEEK[dt.getDay()]}</small>
          </button>
        );
      })}
      <button className="icon" aria-label="次の日" disabled={p.date >= p.today} onClick={() => p.setDate(addDays(p.date, 1))}><Ico.next size={20} /></button>
    </div>
  );
}

export function Today(p: {
  data: AppData; today: string; premium: boolean; update: Update; seg: RecordSeg; setSeg: (s: RecordSeg) => void;
  goMeds: () => void; goFoods: () => void; openPaywall: () => void; openAttackForm: (a?: Attack) => void;
}) {
  const { data, today } = p;
  const [date, setDate] = useState(today);
  const [foodName, setFoodName] = useState('');
  const [foodMg, setFoodMg] = useState('');
  const [foodErr, setFoodErr] = useState('');
  const day = getDay(data, date);
  const tot = dayTotals(day);
  const doses = dosesFor(data, date);
  const sober = soberDays(data, today, firstRecordDate(data));
  const s = data.settings;
  const waterPct = Math.min(100, (tot.waterMl / s.waterGoal) * 100);
  const purPct = Math.min(100, (tot.purineMg / s.purineGoal) * 100);
  const label = date === today ? '今日' : date === addDays(today, -1) ? 'きのう' : 'さかのぼって記録中';
  const onDay = data.attacks.filter((a) => a.start <= date && (a.end ?? today) >= date);

  const addTypedFood = () => {
    const mg = Number(foodMg);
    if (!foodName.trim()) return setFoodErr('名前を入れてください');
    if (!foodMg || !Number.isFinite(mg) || mg < 0 || mg > 10000) return setFoodErr('プリン体の量(mg)を0〜10000で入れてください');
    p.update((d) => addFood(d, date, foodName.trim(), Math.round(mg * 10) / 10));
    setFoodName(''); setFoodMg(''); setFoodErr('');
  };

  return (
    <div className="page today">
      <PageHead title={p.seg === 'daily' ? (date === today ? '今日の記録' : '記録') : '発作の記録'} sub={p.seg === 'daily' ? `${fmtDate(date, false)}・${label}` : '痛風発作の記録'} />
      <Seg label="記録の種類" value={p.seg} onChange={p.setSeg} items={[{ key: 'daily', label: '毎日の記録' }, { key: 'attack', label: '発作' }]} />

      {p.seg === 'attack' ? (
        <Attacks data={data} today={today} update={p.update} openForm={p.openAttackForm} />
      ) : (
        <>
          <DayStrip date={date} today={today} setDate={setDate} />

          <section className="card" id="card-meds">
            <h2><img className="h-art" src={pills} alt="" />お薬{doses.length > 0 && <span className="tag green">{doses.filter((x) => x.taken).length}/{doses.length}</span>}</h2>
            {doses.length === 0 ? (
              <Empty art={pills} title="まだお薬の登録がありません" action={<button className="btn primary" onClick={p.goMeds}><Ico.plus size={18} />薬を登録する</button>}>
                飲んでいる薬と時刻を登録すると、ここで「飲んだ」を記録できます。
              </Empty>
            ) : (
              doses.map((x) => (
                <button key={x.med.id + x.time} className={`dose${x.taken ? ' done' : ''}`}
                  onClick={() => p.update((d) => toggleDose(d, date, x.med.id, x.time))}>
                  <span className="check"><Ico.check size={18} /></span>
                  <span className="t num">{x.time}</span>
                  <span className="n">{x.med.name}{x.med.dose && <small>{x.med.dose}</small>}</span>
                  <span className={`state ${x.taken ? 'ok' : ''}`}>{x.taken ? '飲んだ' : 'まだ'}</span>
                </button>
              ))
            )}
          </section>

          <section className="card" id="card-water">
            <h2><img className="h-art" src={drop} alt="" />水分<span className="tag">目安 {s.waterGoal.toLocaleString()} mL</span></h2>
            <div className="amount"><span className="big-num">{tot.waterMl.toLocaleString()}</span><span className="of">/ {s.waterGoal.toLocaleString()} mL</span><span className="pct num">{Math.round(waterPct)}%</span></div>
            <div className="meter"><i style={{ width: `${waterPct}%` }} /></div>
            <div className="btns3">
              <button className="btn cup" onClick={() => p.update((d) => addWater(d, date, 200))}>+200 mL</button>
              <button className="btn cup" onClick={() => p.update((d) => addWater(d, date, 500))}>+500 mL</button>
              <button className="btn cup ghost" disabled={!tot.waterMl} onClick={() => p.update((d) => addWater(d, date, -200))}>−200 mL</button>
            </div>
            {s.waterGoal === GUIDE_WATER.value && <Source source={GUIDE_WATER.source} url={GUIDE_WATER.url} />}
          </section>

          <section className="card" id="card-drink">
            <h2><img className="h-art" src={beerBig} alt="" />お酒<span className="tag coral">この7日の休肝日 {sober.sober}/{sober.counted || 7}</span></h2>
            <p className="status-line">{day.drinks.length === 0 ? `${label === 'さかのぼって記録中' ? 'この日' : label}は飲んでいません` : `${day.drinks.length}杯・合計 ${tot.alcoholMl.toLocaleString()} mL`}</p>
            <div className="drinks">
              {DRINK_PRESETS.map((x) => (
                <button key={x.kind + x.ml} className="drink" onClick={() => p.update((d) => addDrink(d, date, x.kind, x.ml))} aria-label={`${x.kind} ${x.label}${/^\d+$/.test(x.label) ? ' mL' : ''} を足す`}>
                  <img src={x.art} alt="" />
                  <span>{x.kind}</span>
                  <small>{x.label}{/^\d+$/.test(x.label) ? ' mL' : ''}</small>
                </button>
              ))}
            </div>
            {day.drinks.length > 0 && (
              <ul className="list">
                {day.drinks.map((x) => (
                  <li key={x.id}>
                    <span className="grow">{x.kind}</span>
                    <span className="v">{x.ml} mL</span>
                    <button className="x" aria-label="消す" onClick={() => p.update((d) => removeDrink(d, date, x.id))}><Ico.close size={18} /></button>
                  </li>
                ))}
                <li><span className="grow muted">合計</span><span className="v">{tot.alcoholMl} mL</span><span style={{ width: 44 }} /></li>
              </ul>
            )}
          </section>

          <section className="card" id="card-attack">
            <h2><img className="h-art" src={footArt} alt="" />発作</h2>
            {onDay.length === 0 ? (
              <p className="status-line">この日の発作の記録はありません</p>
            ) : onDay.map((a) => (
              <p key={a.id} className="status-line coral">
                {a.sites.join('・') || '場所の記録なし'}・痛み {a.pain}/10・{a.end ? `${attackDays(a, today)}日間` : `${attackDays(a, today)}日目`}
              </p>
            ))}
            <div className="two">
              <button className="btn ghost" onClick={() => p.setSeg('attack')}>一覧を見る</button>
              <button className="btn coral primary" onClick={() => p.openAttackForm()}><Ico.plus size={18} />発作を記録</button>
            </div>
          </section>

          {p.premium ? (
            <section className="card" id="card-purine">
              <h2><img className="h-art" src={forkArt} alt="" />プリン体<span className="tag full">目安 {s.purineGoal} mg</span></h2>
              <div className="amount"><span className="big-num">{tot.purineMg}</span><span className="of">/ {s.purineGoal} mg</span></div>
              <div className={`meter purine${tot.purineMg > s.purineGoal ? ' over' : ''}`}><i style={{ width: `${purPct}%` }} /></div>
              {data.myFoods.length > 0 && (
                <>
                  <p className="small muted" style={{ margin: '10px 0 6px' }}>よく食べる物(自分で登録した量)</p>
                  <div className="chips">
                    {data.myFoods.map((f) => (
                      <button key={f.id} className="chip" onClick={() => p.update((d) => addFood(d, date, f.unit ? `${f.name}(${f.unit})` : f.name, f.mg))}>
                        {f.name}<small>{f.mg} mg{f.unit ? ` / ${f.unit}` : ''}</small>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="two" style={{ marginTop: 12 }}>
                <input className="input" placeholder="食品の名前" value={foodName} onChange={(e) => setFoodName(e.target.value)} aria-label="食品の名前" />
                <input className="input" placeholder="プリン体 mg" inputMode="decimal" value={foodMg} onChange={(e) => setFoodMg(e.target.value)} aria-label="プリン体の量" />
              </div>
              {foodErr && <p className="err">{foodErr}</p>}
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn small primary" onClick={addTypedFood}>この日に足す</button>
                <button className="link small" onClick={p.goFoods}>よく食べる物を登録</button>
              </div>
              {day.foods.length > 0 && (
                <ul className="list">
                  {day.foods.map((x) => (
                    <li key={x.id}>
                      <span className="grow">{x.name}</span>
                      <span className="v">{x.mg} mg</span>
                      <button className="x" aria-label="消す" onClick={() => p.update((d) => removeFood(d, date, x.id))}><Ico.close size={18} /></button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="small muted" style={{ margin: '8px 0 0' }}>食品ごとの量はアプリに入っていません。自分で調べた量を足し算します。</p>
              {s.purineGoal === GUIDE_PURINE.value && <Source source={GUIDE_PURINE.source} url={GUIDE_PURINE.url} />}
            </section>
          ) : (
            <LockedCard title="プリン体の記録" onUnlock={p.openPaywall}
              points={['食べた物のプリン体を足して、1日の目安と比べる', 'よく食べる物を登録して、1回押すだけで記録']}>
              食品ごとの量は、自分で調べた値を入れて使います(アプリには収録していません)。
            </LockedCard>
          )}
        </>
      )}
    </div>
  );
}

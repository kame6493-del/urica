import { useState } from 'react';
import type { AppData } from '../domain/types';
import {
  addDays, addDrink, addFood, addWater, dayTotals, dosesFor, firstRecordDate, fmtDate, fmtUa, getDay, labTrend,
  removeDrink, removeFood, soberDays, toggleDose,
} from '../domain/calc';
import { GUIDE_PURINE, GUIDE_WATER } from '../domain/guide';
import { LockedCard, Source, type Update } from './common';

/** お酒の器の大きさ(器の容量であって、健康の目安ではない) */
export const DRINK_PRESETS: { kind: string; ml: number; label: string }[] = [
  { kind: 'ビール', ml: 350, label: '缶 350' },
  { kind: 'ビール', ml: 500, label: '缶 500' },
  { kind: '発泡酒・新ジャンル', ml: 350, label: '缶 350' },
  { kind: '日本酒', ml: 180, label: '1合' },
  { kind: 'ワイン', ml: 120, label: 'グラス' },
  { kind: 'ハイボール・サワー', ml: 350, label: '缶 350' },
  { kind: '焼酎', ml: 100, label: '100' },
  { kind: 'ウイスキー', ml: 30, label: 'シングル' },
];

export function Today(p: {
  data: AppData; today: string; premium: boolean; update: Update;
  goUa: () => void; goMeds: () => void; goFoods: () => void; openPaywall: () => void;
}) {
  const { data, today } = p;
  const [date, setDate] = useState(today);
  const [foodName, setFoodName] = useState('');
  const [foodMg, setFoodMg] = useState('');
  const [foodErr, setFoodErr] = useState('');
  const day = getDay(data, date);
  const tot = dayTotals(day);
  const doses = dosesFor(data, date);
  const trend = labTrend(data.labs, data.settings.targetUa);
  const sober = soberDays(data, today, firstRecordDate(data));
  const s = data.settings;
  const waterPct = Math.min(100, (tot.waterMl / s.waterGoal) * 100);
  const purPct = Math.min(100, (tot.purineMg / s.purineGoal) * 100);
  const label = date === today ? '今日' : date === addDays(today, -1) ? 'きのう' : '';

  const addTypedFood = () => {
    const mg = Number(foodMg);
    if (!foodName.trim()) return setFoodErr('名前を入れてください');
    if (!foodMg || !Number.isFinite(mg) || mg < 0 || mg > 10000) return setFoodErr('プリン体の量(mg)を0〜10000で入れてください');
    p.update((d) => addFood(d, date, foodName.trim(), Math.round(mg * 10) / 10));
    setFoodName(''); setFoodMg(''); setFoodErr('');
  };

  return (
    <div className="page today">
      <div className="head">
        <h1>ウリカ手帳</h1>
        <span className="sub">{fmtDate(today, false)}</span>
      </div>

      <div className="daynav">
        <button className="icon" aria-label="前の日" onClick={() => setDate(addDays(date, -1))}>‹</button>
        <b>{fmtDate(date, false)}<small>{label || 'さかのぼって記録中'}</small></b>
        <button className="icon" aria-label="次の日" disabled={date >= today} onClick={() => setDate(addDays(date, 1))}>›</button>
      </div>

      <section className="card" id="card-meds">
        <h2>お薬{doses.length > 0 && <span className="tag green">{doses.filter((x) => x.taken).length}/{doses.length}</span>}</h2>
        {doses.length === 0 ? (
          <>
            <p className="muted small" style={{ margin: '0 0 10px' }}>飲んでいる薬と時刻を登録すると、ここで「飲んだ」を記録できます。</p>
            <button className="btn small" onClick={p.goMeds}>薬を登録する</button>
          </>
        ) : (
          doses.map((x) => (
            <button key={x.med.id + x.time} className={`dose${x.taken ? ' done' : ''}`}
              onClick={() => p.update((d) => toggleDose(d, date, x.med.id, x.time))}>
              <span className="check">✓</span>
              <span className="t">{x.time}</span>
              <span className="n">{x.med.name}{x.med.dose && <small>{x.med.dose}</small>}</span>
              <span className="small muted">{x.taken ? '飲んだ' : '未'}</span>
            </button>
          ))
        )}
      </section>

      <section className="card" id="card-water">
        <h2>水分<span className="tag">目安 {s.waterGoal.toLocaleString()} mL</span></h2>
        <div className="big-num">{tot.waterMl.toLocaleString()}<small>mL</small></div>
        <div className="meter"><i style={{ width: `${waterPct}%` }} /></div>
        <div className="btns3">
          <button className="btn small" onClick={() => p.update((d) => addWater(d, date, 200))}>+200 mL</button>
          <button className="btn small" onClick={() => p.update((d) => addWater(d, date, 500))}>+500 mL</button>
          <button className="btn small ghost" disabled={!tot.waterMl} onClick={() => p.update((d) => addWater(d, date, -200))}>−200 mL</button>
        </div>
        {s.waterGoal === GUIDE_WATER.value && <Source source={GUIDE_WATER.source} url={GUIDE_WATER.url} />}
      </section>

      <section className="card" id="card-drink">
        <h2>お酒<span className="tag coral">この7日の休肝日 {sober.sober}/{sober.counted || 7}</span></h2>
        <div className="chips">
          {DRINK_PRESETS.map((x) => (
            <button key={x.kind + x.ml} className="chip" onClick={() => p.update((d) => addDrink(d, date, x.kind, x.ml))}>
              {x.kind}<small>{x.label}{/^\d+$/.test(x.label) ? ' mL' : ''}</small>
            </button>
          ))}
        </div>
        {day.drinks.length === 0 ? (
          <p className="muted small" style={{ margin: '10px 0 0' }}>{label || 'この日'}はまだ飲んでいません。</p>
        ) : (
          <ul className="list">
            {day.drinks.map((x) => (
              <li key={x.id}>
                <span className="grow">{x.kind}</span>
                <span className="v">{x.ml} mL</span>
                <button className="x" aria-label="消す" onClick={() => p.update((d) => removeDrink(d, date, x.id))}>×</button>
              </li>
            ))}
            <li><span className="grow muted">合計</span><span className="v">{tot.alcoholMl} mL</span><span style={{ width: 44 }} /></li>
          </ul>
        )}
      </section>

      {p.premium ? (
        <section className="card" id="card-purine">
          <h2>プリン体<span className="tag full">目安 {s.purineGoal} mg</span></h2>
          <div className="big-num">{tot.purineMg}<small>mg</small></div>
          <div className={`meter purine${tot.purineMg > s.purineGoal ? ' over' : ''}`}><i style={{ width: `${purPct}%` }} /></div>
          {data.myFoods.length > 0 && (
            <div className="chips" style={{ marginTop: 10 }}>
              {data.myFoods.map((f) => (
                <button key={f.id} className="chip" onClick={() => p.update((d) => addFood(d, date, f.unit ? `${f.name}(${f.unit})` : f.name, f.mg))}>
                  {f.name}<small>{f.mg} mg{f.unit ? ` / ${f.unit}` : ''}</small>
                </button>
              ))}
            </div>
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
                  <button className="x" aria-label="消す" onClick={() => p.update((d) => removeFood(d, date, x.id))}>×</button>
                </li>
              ))}
            </ul>
          )}
          {s.purineGoal === GUIDE_PURINE.value && <Source source={GUIDE_PURINE.source} url={GUIDE_PURINE.url} />}
        </section>
      ) : (
        <LockedCard title="プリン体の記録" onUnlock={p.openPaywall}>
          食べた物のプリン体を足して、1日の目安({GUIDE_PURINE.value}mg)と比べられます。よく食べる物を登録しておけば1回押すだけ。
        </LockedCard>
      )}

      <section className="card" id="card-ua-mini">
        <h2>最新の尿酸値</h2>
        {trend.latest ? (
          <div className="row between">
            <div>
              <div className="big-num">{fmtUa(trend.latest.ua)}<small>mg/dL</small></div>
              <span className="small muted">{fmtDate(trend.latest.date)}</span>
            </div>
            <button className="btn small" onClick={p.goUa}>グラフを見る</button>
          </div>
        ) : (
          <div className="row between">
            <span className="muted small">検査の結果を入れると、グラフで変化が見えます。</span>
            <button className="btn small" onClick={p.goUa}>記録する</button>
          </div>
        )}
      </section>
    </div>
  );
}

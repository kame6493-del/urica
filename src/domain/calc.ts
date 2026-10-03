import type { AppData, Attack, DateStr, DayLog, Drink, FoodEntry, LabResult, Medicine } from './types';
import { GUIDE_URIC_LIMIT } from './guide';
import { newId } from './data';

/* ---------- 日付 ---------- */

const pad = (n: number) => String(n).padStart(2, '0');
export function toDateStr(d: Date): DateStr {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayStr(now = new Date()): DateStr {
  return toDateStr(now);
}
function parse(d: DateStr): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
}
export function addDays(d: DateStr, n: number): DateStr {
  const x = parse(d);
  x.setDate(x.getDate() + n);
  return toDateStr(x);
}
/** b - a の日数 */
export function daysBetween(a: DateStr, b: DateStr): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
}
export function fmtDate(d: DateStr, withYear = true): string {
  const [y, m, day] = d.split('-').map(Number);
  const w = '日月火水木金土'[parse(d).getDay()];
  return withYear ? `${y}年${m}月${day}日(${w})` : `${m}月${day}日(${w})`;
}
export const fmtUa = (v: number) => v.toFixed(1);

/* ---------- 無料と完全版の差 ---------- */

export type GraphRange = '6m' | '1y' | '3y' | 'all';
export const FREE_RANGES: GraphRange[] = ['6m', '1y'];
export const RANGE_LABEL: Record<GraphRange, string> = { '6m': '半年', '1y': '1年', '3y': '3年', all: '全期間' };
const RANGE_DAYS: Record<GraphRange, number> = { '6m': 183, '1y': 365, '3y': 365 * 3 + 1, all: Infinity };

export function rangeStart(range: GraphRange, today: DateStr, labs: LabResult[]): DateStr {
  if (range === 'all') return labs.length ? labs[0].date : addDays(today, -365);
  return addDays(today, -RANGE_DAYS[range]);
}

/* ---------- 尿酸値 ---------- */

export function sortedLabs(labs: LabResult[]): LabResult[] {
  return [...labs].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export interface LabTrend {
  latest: LabResult | null;
  prev: LabResult | null;
  diff: number | null;
  overLimit: boolean;
  overTarget: boolean | null;
}

export function labTrend(labs: LabResult[], target: number | null): LabTrend {
  const s = sortedLabs(labs);
  const latest = s.at(-1) ?? null;
  const prev = s.length > 1 ? s[s.length - 2] : null;
  return {
    latest,
    prev,
    diff: latest && prev ? Math.round((latest.ua - prev.ua) * 10) / 10 : null,
    overLimit: latest ? latest.ua > GUIDE_URIC_LIMIT.value : false,
    overTarget: latest && target !== null ? latest.ua > target : null,
  };
}

export interface ChartPoint { x: number; y: number; ua: number; date: DateStr }
export interface ChartModel {
  width: number;
  height: number;
  pad: { l: number; r: number; t: number; b: number };
  points: ChartPoint[];
  yMin: number;
  yMax: number;
  yTicks: { y: number; v: number }[];
  xTicks: { x: number; label: string }[];
  targetY: number | null;
  limitY: number | null;
  attacks: { x: number; date: DateStr }[];
}

/** 尿酸値の折れ線。目標の線(主治医と決めた値)と 7.0 の線、発作の日の印を入れる */
export function chartModel(
  labs: LabResult[], attacks: Attack[], from: DateStr, to: DateStr, target: number | null,
  width = 340, height = 220,
): ChartModel {
  const pad = { l: 34, r: 12, t: 12, b: 26 };
  const inRange = sortedLabs(labs).filter((l) => l.date >= from && l.date <= to);
  const vals = inRange.map((l) => l.ua);
  const refs = [GUIDE_URIC_LIMIT.value, ...(target !== null ? [target] : [])];
  let lo = Math.min(...vals, ...refs);
  let hi = Math.max(...vals, ...refs);
  lo = Math.max(0, Math.floor(lo - 0.5));
  hi = Math.ceil(hi + 0.5);
  if (hi - lo < 3) hi = lo + 3;
  const span = Math.max(1, daysBetween(from, to));
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const xOf = (d: DateStr) => pad.l + (Math.min(span, Math.max(0, daysBetween(from, d))) / span) * iw;
  const yOf = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * ih;

  const step = hi - lo > 8 ? 2 : 1;
  const yTicks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) yTicks.push({ y: yOf(v), v });

  const xTicks: { x: number; label: string }[] = [];
  const f = parse(from);
  const months = Math.max(1, Math.round(span / 30));
  const every = months <= 7 ? 1 : months <= 13 ? 2 : months <= 37 ? 6 : 12;
  const c = new Date(f.getFullYear(), f.getMonth() + 1, 1);
  while (toDateStr(c) <= to) {
    if (c.getMonth() % every === 0) {
      const label = c.getMonth() === 0 || every >= 6 ? `${String(c.getFullYear()).slice(2)}/${c.getMonth() + 1}` : `${c.getMonth() + 1}月`;
      xTicks.push({ x: xOf(toDateStr(c)), label });
    }
    c.setMonth(c.getMonth() + 1);
  }

  return {
    width, height, pad,
    points: inRange.map((l) => ({ x: xOf(l.date), y: yOf(l.ua), ua: l.ua, date: l.date })),
    yMin: lo, yMax: hi, yTicks, xTicks,
    targetY: target !== null ? yOf(target) : null,
    limitY: yOf(GUIDE_URIC_LIMIT.value),
    attacks: attacks.filter((a) => a.start >= from && a.start <= to).map((a) => ({ x: xOf(a.start), date: a.start })),
  };
}

/* ---------- 1日の記録 ---------- */

export function getDay(data: AppData, date: DateStr): DayLog {
  return data.days[date] ?? { date, waterMl: 0, drinks: [], foods: [] };
}

function putDay(data: AppData, day: DayLog): AppData {
  const days = { ...data.days };
  if (!day.waterMl && !day.drinks.length && !day.foods.length) delete days[day.date];
  else days[day.date] = day;
  return { ...data, days };
}

export function addWater(data: AppData, date: DateStr, ml: number): AppData {
  const d = getDay(data, date);
  return putDay(data, { ...d, waterMl: Math.max(0, Math.min(20000, d.waterMl + ml)) });
}

export function addDrink(data: AppData, date: DateStr, kind: string, ml: number): AppData {
  const d = getDay(data, date);
  const drink: Drink = { id: newId('d'), kind, ml };
  return putDay(data, { ...d, drinks: [...d.drinks, drink] });
}

export function removeDrink(data: AppData, date: DateStr, id: string): AppData {
  const d = getDay(data, date);
  return putDay(data, { ...d, drinks: d.drinks.filter((x) => x.id !== id) });
}

export function addFood(data: AppData, date: DateStr, name: string, mg: number): AppData {
  const d = getDay(data, date);
  const food: FoodEntry = { id: newId('f'), name, mg };
  return putDay(data, { ...d, foods: [...d.foods, food] });
}

export function removeFood(data: AppData, date: DateStr, id: string): AppData {
  const d = getDay(data, date);
  return putDay(data, { ...d, foods: d.foods.filter((x) => x.id !== id) });
}

export interface DayTotals { waterMl: number; drinks: number; alcoholMl: number; purineMg: number }
export function dayTotals(day: DayLog): DayTotals {
  return {
    waterMl: day.waterMl,
    drinks: day.drinks.length,
    alcoholMl: day.drinks.reduce((s, x) => s + x.ml, 0),
    purineMg: Math.round(day.foods.reduce((s, x) => s + x.mg, 0) * 10) / 10,
  };
}

/** 直近7日(今日を含む)でお酒を飲まなかった日の数。記録を付け始める前の日は数えない */
export function soberDays(data: AppData, today: DateStr, startedAt: DateStr | null): { sober: number; counted: number } {
  let sober = 0;
  let counted = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, -i);
    if (startedAt && d < startedAt) break;
    counted++;
    if (!getDay(data, d).drinks.length) sober++;
  }
  return { sober, counted };
}

/** 記録を付け始めた日(どの記録でもいちばん古い日) */
export function firstRecordDate(data: AppData): DateStr | null {
  const all = [
    ...Object.keys(data.days),
    ...data.labs.map((l) => l.date),
    ...data.doses.map((d) => d.date),
    ...data.attacks.map((a) => a.start),
  ].sort();
  return all[0] ?? null;
}

/* ---------- 服薬 ---------- */

export interface DueDose { med: Medicine; time: string; taken: boolean }

export function dosesFor(data: AppData, date: DateStr): DueDose[] {
  const taken = new Set(data.doses.filter((d) => d.date === date).map((d) => `${d.medId}|${d.time}`));
  const out: DueDose[] = [];
  for (const med of data.meds) {
    if (!med.active) continue;
    for (const time of med.times) out.push({ med, time, taken: taken.has(`${med.id}|${time}`) });
  }
  return out.sort((a, b) => a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name));
}

export function toggleDose(data: AppData, date: DateStr, medId: string, time: string, now = new Date()): AppData {
  const hit = data.doses.some((d) => d.date === date && d.medId === medId && d.time === time);
  const doses = hit
    ? data.doses.filter((d) => !(d.date === date && d.medId === medId && d.time === time))
    : [...data.doses, { date, medId, time, takenAt: now.toISOString() }];
  return { ...data, doses };
}

/** 期間中の飲んだ割合。初めて「飲んだ」を記録した日より前は数えない(使い始める前の日で分母を膨らませない) */
export function adherence(data: AppData, from: DateStr, to: DateStr): { due: number; taken: number; rate: number | null } {
  const start = data.doses.map((d) => d.date).sort()[0] ?? null;
  if (!start) return { due: 0, taken: 0, rate: null };
  let due = 0;
  let taken = 0;
  const takenSet = new Set(data.doses.map((d) => `${d.date}|${d.medId}|${d.time}`));
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (start && d < start) continue;
    for (const m of data.meds) {
      if (!m.active) continue;
      for (const t of m.times) {
        due++;
        if (takenSet.has(`${d}|${m.id}|${t}`)) taken++;
      }
    }
  }
  return { due, taken, rate: due ? Math.round((taken / due) * 100) : null };
}

/* ---------- 発作 ---------- */

export function attackDays(a: Attack, today: DateStr): number {
  return daysBetween(a.start, a.end ?? today) + 1;
}

export function attackSummary(attacks: Attack[], today: DateStr) {
  const sorted = [...attacks].sort((a, b) => b.start.localeCompare(a.start));
  const last = sorted[0] ?? null;
  const yearAgo = addDays(today, -365);
  const inYear = sorted.filter((a) => a.start > yearAgo);
  const siteCount = new Map<string, number>();
  for (const a of inYear) for (const s of a.sites) siteCount.set(s, (siteCount.get(s) ?? 0) + 1);
  return {
    last,
    /** 続いている発作があれば 0。終わっていれば終わった日からの日数 */
    daysSinceLast: last ? (last.end === null ? 0 : daysBetween(last.end, today)) : null,
    ongoing: sorted.filter((a) => a.end === null),
    countYear: inYear.length,
    topSites: [...siteCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3),
  };
}

/* ---------- 受診用のまとめ ---------- */

export interface Report {
  from: DateStr;
  to: DateStr;
  labs: LabResult[];
  attacks: Attack[];
  meds: Medicine[];
  adherence: ReturnType<typeof adherence>;
  drinkDays: number;
  recordedDays: number;
  avgAlcoholMl: number | null;
  avgWaterMl: number | null;
  avgPurineMg: number | null;
  target: number | null;
}

export function buildReport(data: AppData, from: DateStr, to: DateStr): Report {
  const days = Object.values(data.days).filter((d) => d.date >= from && d.date <= to);
  const withWater = days.filter((d) => d.waterMl > 0);
  const withFood = days.filter((d) => d.foods.length > 0);
  const drinkDays = days.filter((d) => d.drinks.length > 0);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
  return {
    from, to,
    labs: sortedLabs(data.labs).filter((l) => l.date >= from && l.date <= to),
    attacks: data.attacks.filter((a) => a.start <= to && (a.end ?? to) >= from).sort((a, b) => a.start.localeCompare(b.start)),
    meds: data.meds.filter((m) => m.active),
    adherence: adherence(data, from, to),
    drinkDays: drinkDays.length,
    recordedDays: days.length,
    avgAlcoholMl: avg(drinkDays.map((d) => dayTotals(d).alcoholMl)),
    avgWaterMl: avg(withWater.map((d) => d.waterMl)),
    avgPurineMg: avg(withFood.map((d) => dayTotals(d).purineMg)),
    target: data.settings.targetUa,
  };
}

/** 受診のときに見せる・送るための文章 */
export function reportText(r: Report, today: DateStr): string {
  const L: string[] = [];
  L.push('ウリカ手帳 受診用のまとめ');
  L.push(`期間: ${fmtDate(r.from)} 〜 ${fmtDate(r.to)}(作成 ${fmtDate(today)})`);
  L.push('');
  L.push('■ 尿酸値(mg/dL)');
  if (!r.labs.length) L.push('  記録なし');
  for (const l of r.labs) L.push(`  ${fmtDate(l.date)}  ${fmtUa(l.ua)}${l.note ? `  ${l.note}` : ''}`);
  if (r.target !== null) L.push(`  主治医と決めた目標: ${fmtUa(r.target)} 以下`);
  L.push('');
  L.push('■ 痛風発作');
  if (!r.attacks.length) L.push('  記録なし');
  for (const a of r.attacks) {
    const span = a.end ? `${fmtDate(a.start)}〜${fmtDate(a.end, false)}` : `${fmtDate(a.start)}〜(続いている)`;
    L.push(`  ${span}  ${a.sites.join('・') || '場所の記録なし'}  痛み ${a.pain}/10${a.note ? `  ${a.note}` : ''}`);
  }
  L.push('');
  L.push('■ 飲んでいる薬');
  if (!r.meds.length) L.push('  登録なし');
  for (const m of r.meds) L.push(`  ${m.name}${m.dose ? ` ${m.dose}` : ''}  ${m.times.join('・') || '時刻の登録なし'}`);
  if (r.adherence.rate !== null) L.push(`  飲んだ記録: ${r.adherence.taken}/${r.adherence.due} 回(${r.adherence.rate}%)`);
  L.push('');
  L.push('■ 生活の記録');
  L.push(`  記録した日: ${r.recordedDays}日 / お酒を飲んだ日: ${r.drinkDays}日`);
  if (r.avgAlcoholMl !== null) L.push(`  飲んだ日の量の平均: ${r.avgAlcoholMl} mL`);
  if (r.avgWaterMl !== null) L.push(`  水分の平均(記録した日): ${r.avgWaterMl} mL`);
  if (r.avgPurineMg !== null) L.push(`  プリン体の平均(食品を記録した日・自分で入れた値): ${r.avgPurineMg} mg`);
  L.push('');
  L.push('※本人が記録した内容です。アプリは診断・治療の判断をしません。');
  return L.join('\n');
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** 表計算ソフトで開ける形。種類ごとに行を分ける */
export function toCsv(data: AppData, from: DateStr, to: DateStr): string {
  const rows: (string | number)[][] = [['種類', '日付', '値', '単位', 'メモ']];
  for (const l of sortedLabs(data.labs)) if (l.date >= from && l.date <= to) rows.push(['尿酸値', l.date, fmtUa(l.ua), 'mg/dL', l.note]);
  for (const a of [...data.attacks].sort((x, y) => x.start.localeCompare(y.start))) {
    if (a.start < from || a.start > to) continue;
    rows.push(['発作', a.start, a.pain, '痛み(0-10)', `${a.end ? `〜${a.end}` : '続いている'} ${a.sites.join('・')} ${a.note}`.trim()]);
  }
  const medName = new Map(data.meds.map((m) => [m.id, m.name]));
  for (const d of [...data.doses].sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time))) {
    if (d.date < from || d.date > to) continue;
    rows.push(['服薬', d.date, d.time, '時刻', medName.get(d.medId) ?? '']);
  }
  for (const day of Object.values(data.days).sort((x, y) => x.date.localeCompare(y.date))) {
    if (day.date < from || day.date > to) continue;
    if (day.waterMl) rows.push(['水分', day.date, day.waterMl, 'mL', '']);
    for (const x of day.drinks) rows.push(['お酒', day.date, x.ml, 'mL', x.kind]);
    for (const x of day.foods) rows.push(['食品(プリン体)', day.date, x.mg, 'mg', x.name]);
  }
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

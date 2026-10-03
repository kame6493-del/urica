import type { AppData, Attack, DayLog, DoseLog, LabResult, Medicine, MyFood, Settings } from './types';
import { GUIDE_PURINE, GUIDE_WATER } from './guide';

export function defaultSettings(): Settings {
  return {
    targetUa: null,
    purineGoal: GUIDE_PURINE.value,
    waterGoal: GUIDE_WATER.value,
    remindOn: false,
    remindTime: '08:00',
    perDoseRemind: false,
    nextLab: null,
    labRemind: false,
    acceptedNotice: false,
  };
}

export function emptyData(): AppData {
  return { version: 1, labs: [], meds: [], doses: [], days: {}, attacks: [], myFoods: [], settings: defaultSettings() };
}

let seq = 0;
export function newId(prefix = 'x'): string {
  seq = (seq + 1) % 1e6;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isDate = (v: unknown): v is string => typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00'));
export const isTime = (v: unknown): v is string => typeof v === 'string' && TIME_RE.test(v);
const num = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null;
const str = (v: unknown, max = 200): string => (typeof v === 'string' ? v.slice(0, max) : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** 尿酸値として受け付ける範囲(入力の打ち間違いを弾くための幅。医学的な正常範囲ではない) */
export const UA_MIN = 0.1;
export const UA_MAX = 30;

/** 保存してあった物・読み込んだバックアップを、壊れた所を捨てて正しい形に直す */
export function normalize(raw: unknown): AppData {
  const r = obj(raw);
  const base = emptyData();
  const s = obj(r.settings);
  const d = base.settings;
  const settings: Settings = {
    targetUa: num(s.targetUa, UA_MIN, UA_MAX),
    purineGoal: num(s.purineGoal, 1, 5000) ?? d.purineGoal,
    waterGoal: num(s.waterGoal, 100, 10000) ?? d.waterGoal,
    remindOn: s.remindOn === true,
    remindTime: isTime(s.remindTime) ? s.remindTime : d.remindTime,
    perDoseRemind: s.perDoseRemind === true,
    nextLab: isDate(s.nextLab) ? s.nextLab : null,
    labRemind: s.labRemind === true,
    acceptedNotice: s.acceptedNotice === true,
  };

  const labs: LabResult[] = [];
  for (const x of arr(r.labs).map(obj)) {
    const ua = num(x.ua, UA_MIN, UA_MAX);
    if (!isDate(x.date) || ua === null) continue;
    labs.push({ id: str(x.id, 40) || newId('l'), date: x.date, ua, note: str(x.note) });
  }
  labs.sort((a, b) => a.date.localeCompare(b.date));

  const meds: Medicine[] = [];
  for (const x of arr(r.meds).map(obj)) {
    const name = str(x.name, 60).trim();
    if (!name) continue;
    const times = [...new Set(arr(x.times).filter(isTime))].sort();
    meds.push({ id: str(x.id, 40) || newId('m'), name, dose: str(x.dose, 60), times, active: x.active !== false });
  }

  const medIds = new Set(meds.map((m) => m.id));
  const doses: DoseLog[] = [];
  const seen = new Set<string>();
  for (const x of arr(r.doses).map(obj)) {
    if (!isDate(x.date) || !isTime(x.time) || typeof x.medId !== 'string' || !medIds.has(x.medId)) continue;
    const k = `${x.date}|${x.medId}|${x.time}`;
    if (seen.has(k)) continue;
    seen.add(k);
    doses.push({ date: x.date, medId: x.medId, time: x.time, takenAt: str(x.takenAt, 40) });
  }

  const days: Record<string, DayLog> = {};
  for (const [k, v] of Object.entries(obj(r.days))) {
    if (!isDate(k)) continue;
    const o = obj(v);
    const drinks = arr(o.drinks).map(obj).flatMap((x) => {
      const ml = num(x.ml, 1, 5000);
      const kind = str(x.kind, 30).trim();
      return ml !== null && kind ? [{ id: str(x.id, 40) || newId('d'), kind, ml }] : [];
    });
    const foods = arr(o.foods).map(obj).flatMap((x) => {
      const mg = num(x.mg, 0, 10000);
      const name = str(x.name, 60).trim();
      return mg !== null && name ? [{ id: str(x.id, 40) || newId('f'), name, mg }] : [];
    });
    const waterMl = num(o.waterMl, 0, 20000) ?? 0;
    if (!waterMl && !drinks.length && !foods.length) continue;
    days[k] = { date: k, waterMl, drinks, foods };
  }

  const attacks: Attack[] = [];
  for (const x of arr(r.attacks).map(obj)) {
    if (!isDate(x.start)) continue;
    const end = isDate(x.end) && x.end >= x.start ? x.end : null;
    const sites = arr(x.sites).filter((s): s is string => typeof s === 'string').map((s) => s.slice(0, 30));
    attacks.push({ id: str(x.id, 40) || newId('a'), start: x.start, end, sites, pain: Math.round(num(x.pain, 0, 10) ?? 0), note: str(x.note, 500) });
  }
  attacks.sort((a, b) => b.start.localeCompare(a.start));

  const myFoods: MyFood[] = [];
  for (const x of arr(r.myFoods).map(obj)) {
    const mg = num(x.mg, 0, 10000);
    const name = str(x.name, 60).trim();
    if (mg === null || !name) continue;
    myFoods.push({ id: str(x.id, 40) || newId('mf'), name, mg, unit: str(x.unit, 30) });
  }

  return { version: 1, labs, meds, doses, days, attacks, myFoods, settings };
}

/** バックアップ(機種変更・入れ直しのため)。中身はこの JSON だけ */
export function toBackup(data: AppData, now = new Date()): string {
  return JSON.stringify({ app: 'urica', exportedAt: now.toISOString(), data }, null, 1);
}

export function fromBackup(text: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('ファイルの形式が正しくありません');
  }
  const o = obj(parsed);
  if (o.app !== 'urica' || !o.data) throw new Error('ウリカ手帳のバックアップではありません');
  return normalize(o.data);
}

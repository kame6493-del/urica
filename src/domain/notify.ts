import type { AppData, DateStr } from './types';
import { addDays } from './calc';

export interface PlannedNotice {
  id: number;
  title: string;
  body: string;
  /** 毎日くり返す時刻 */
  daily?: { hour: number; minute: number };
  /** 1回だけ('YYYY-MM-DD' の hour:minute) */
  once?: { date: DateStr; hour: number; minute: number };
}

export const DAILY_ID = 5100;
const DOSE_BASE = 5200;
export const LAB_ID = 5900;
export const MAX_DOSE_NOTICES = 20;

const hm = (t: string) => {
  const [hour, minute] = t.split(':').map(Number);
  return { hour, minute };
};

/**
 * 予約する通知の一覧。無料は「1日1回の服薬のお知らせ」だけ。
 * 完全版は薬ごと・時刻ごとのお知らせと、次の検査日の前日のお知らせ。
 */
export function notificationPlan(data: AppData, premium: boolean, today: DateStr): PlannedNotice[] {
  const s = data.settings;
  const out: PlannedNotice[] = [];
  const meds = data.meds.filter((m) => m.active);
  const perDose = premium && s.perDoseRemind;

  if (s.remindOn && !perDose) {
    const names = meds.map((m) => m.name).join('・');
    out.push({
      id: DAILY_ID,
      title: 'お薬の時間です',
      body: names ? `${names} を飲んだら、アプリで印をつけましょう` : '飲んだら、アプリで印をつけましょう',
      daily: hm(s.remindTime),
    });
  }

  if (perDose) {
    const slots = new Map<string, string[]>();
    for (const m of meds) for (const t of m.times) slots.set(t, [...(slots.get(t) ?? []), m.name]);
    [...slots.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(0, MAX_DOSE_NOTICES).forEach(([t, names], i) => {
      out.push({ id: DOSE_BASE + i, title: `${t} のお薬`, body: `${names.join('・')} の時間です`, daily: hm(t) });
    });
  }

  if (premium && s.labRemind && s.nextLab) {
    const day = addDays(s.nextLab, -1);
    if (day >= today) {
      out.push({ id: LAB_ID, title: '明日は検査の日です', body: '結果が出たら尿酸値を記録しておきましょう', once: { date: day, hour: 19, minute: 0 } });
    }
  }
  return out;
}

/** 取り消す対象(予約し直す前に全部消す) */
export function allNoticeIds(): number[] {
  return [DAILY_ID, LAB_ID, ...Array.from({ length: MAX_DOSE_NOTICES }, (_, i) => DOSE_BASE + i)];
}

import { describe, expect, it } from 'vitest';
import { emptyData, fromBackup, normalize, toBackup } from './data';
import {
  addDays, addDrink, addFood, addWater, adherence, attackSummary, buildReport, chartModel, daysBetween, dayTotals,
  dosesFor, getDay, labTrend, rangeStart, removeDrink, removeFood, reportText, soberDays, toCsv, toggleDose,
} from './calc';
import { notificationPlan, DAILY_ID, LAB_ID } from './notify';
import { GUIDE_PURINE, GUIDE_URIC_LIMIT, GUIDE_WATER } from './guide';
import type { AppData } from './types';

function sample(): AppData {
  const d = emptyData();
  d.labs = [
    { id: 'l1', date: '2026-01-10', ua: 8.4, note: '' },
    { id: 'l2', date: '2026-04-12', ua: 7.1, note: '薬を開始' },
    { id: 'l3', date: '2026-07-15', ua: 6.2, note: '' },
  ];
  d.meds = [
    { id: 'm1', name: 'フェブキソスタット', dose: '20mg', times: ['08:00'], active: true },
    { id: 'm2', name: '胃薬', dose: '', times: ['08:00', '20:00'], active: true },
    { id: 'm3', name: '昔の薬', dose: '', times: ['12:00'], active: false },
  ];
  d.attacks = [{ id: 'a1', start: '2026-03-02', end: '2026-03-06', sites: ['右足の親指'], pain: 8, note: '飲み会の翌日' }];
  return d;
}

describe('日付', () => {
  it('月またぎ・うるう年をまたいで足し引きできる', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
  });
});

describe('出典つきの目安', () => {
  it('アプリに出す数字は出典の値と同じ', () => {
    expect(GUIDE_URIC_LIMIT.value).toBe(7.0);
    expect(GUIDE_PURINE.value).toBe(400);
    expect(GUIDE_WATER.value).toBe(2000);
    for (const g of [GUIDE_URIC_LIMIT, GUIDE_PURINE, GUIDE_WATER]) expect(g.url).toMatch(/^https:\/\/www\.tufu\.or\.jp\//);
  });
  it('目標値は初めは空(アプリから勧めない)', () => {
    expect(emptyData().settings.targetUa).toBeNull();
    expect(emptyData().settings.purineGoal).toBe(400);
  });
});

describe('尿酸値', () => {
  it('最新・前回との差・7.0超え・目標超えを出す', () => {
    const d = sample();
    let t = labTrend(d.labs, null);
    expect(t.latest?.ua).toBe(6.2);
    expect(t.diff).toBe(-0.9);
    expect(t.overLimit).toBe(false);
    expect(t.overTarget).toBeNull();
    t = labTrend(d.labs, 6.0);
    expect(t.overTarget).toBe(true);
    expect(labTrend([], 6).latest).toBeNull();
  });
  it('グラフ: 期間内の点だけ・目標と7.0の線が範囲に入る・発作の印', () => {
    const d = sample();
    const m = chartModel(d.labs, d.attacks, '2026-02-01', '2026-08-01', 6.0);
    expect(m.points.map((p) => p.ua)).toEqual([7.1, 6.2]);
    expect(m.yMin).toBeLessThanOrEqual(6.0);
    expect(m.yMax).toBeGreaterThanOrEqual(7.1);
    expect(m.targetY).not.toBeNull();
    expect(m.limitY!).toBeLessThan(m.targetY!);
    expect(m.attacks).toHaveLength(1);
    expect(m.points[0].x).toBeLessThan(m.points[1].x);
    expect(m.points[1].y).toBeGreaterThan(m.points[0].y);
    for (const p of m.points) {
      expect(p.x).toBeGreaterThanOrEqual(m.pad.l);
      expect(p.x).toBeLessThanOrEqual(m.width - m.pad.r);
    }
  });
  it('記録0件でもグラフの形は壊れない', () => {
    const m = chartModel([], [], '2026-01-01', '2026-07-01', null);
    expect(m.points).toHaveLength(0);
    expect(Number.isFinite(m.yMin) && Number.isFinite(m.yMax)).toBe(true);
    expect(m.yTicks.length).toBeGreaterThan(1);
  });
  it('期間の始まり', () => {
    const d = sample();
    expect(rangeStart('1y', '2026-10-03', d.labs)).toBe('2025-10-03');
    expect(rangeStart('all', '2026-10-03', d.labs)).toBe('2026-01-10');
  });
});

describe('1日の記録', () => {
  it('水分・お酒・食品を足して消せる。空になった日は残さない', () => {
    let d = emptyData();
    d = addWater(d, '2026-10-03', 500);
    d = addWater(d, '2026-10-03', 250);
    d = addDrink(d, '2026-10-03', 'ビール', 350);
    d = addFood(d, '2026-10-03', '鶏もも 100g', 122.9);
    d = addFood(d, '2026-10-03', '納豆', 50.5);
    const t = dayTotals(getDay(d, '2026-10-03'));
    expect(t).toEqual({ waterMl: 750, drinks: 1, alcoholMl: 350, purineMg: 173.4 });
    const day = getDay(d, '2026-10-03');
    d = removeDrink(d, '2026-10-03', day.drinks[0].id);
    for (const f of day.foods) d = removeFood(d, '2026-10-03', f.id);
    d = addWater(d, '2026-10-03', -9999);
    expect(d.days['2026-10-03']).toBeUndefined();
  });
  it('休肝日は記録を始めた日より前を数えない', () => {
    let d = emptyData();
    d = addDrink(d, '2026-10-01', 'ビール', 350);
    d = addWater(d, '2026-09-30', 200);
    expect(soberDays(d, '2026-10-03', '2026-09-30')).toEqual({ sober: 3, counted: 4 });
  });
});

describe('服薬', () => {
  it('今日飲む分を時刻順に並べ、印をつけたり外したりできる', () => {
    let d = sample();
    let due = dosesFor(d, '2026-10-03');
    expect(due.map((x) => `${x.time} ${x.med.name}`)).toEqual(['08:00 フェブキソスタット', '08:00 胃薬', '20:00 胃薬']);
    d = toggleDose(d, '2026-10-03', 'm1', '08:00');
    due = dosesFor(d, '2026-10-03');
    expect(due[0].taken).toBe(true);
    d = toggleDose(d, '2026-10-03', 'm1', '08:00');
    expect(dosesFor(d, '2026-10-03')[0].taken).toBe(false);
  });
  it('飲んだ割合: 記録を始める前の日は分母に入れない', () => {
    let d = emptyData();
    d.meds = [{ id: 'm1', name: 'A', dose: '', times: ['08:00', '20:00'], active: true }];
    d = toggleDose(d, '2026-10-02', 'm1', '08:00');
    d = toggleDose(d, '2026-10-02', 'm1', '20:00');
    d = toggleDose(d, '2026-10-03', 'm1', '08:00');
    const a = adherence(d, '2026-09-01', '2026-10-03');
    expect(a).toEqual({ due: 4, taken: 3, rate: 75 });
    expect(adherence(emptyData(), '2026-09-01', '2026-10-03').rate).toBeNull();
    // 尿酸値の記録がずっと前からあっても、服薬の分母は初めて飲んだ日から
    d.labs = [{ id: 'l', date: '2025-01-01', ua: 8, note: '' }];
    expect(adherence(d, '2025-01-01', '2026-10-03')).toEqual({ due: 4, taken: 3, rate: 75 });
  });
});

describe('発作', () => {
  it('最後の発作からの日数・1年の回数・多い場所', () => {
    const d = sample();
    d.attacks.push({ id: 'a2', start: '2026-09-20', end: null, sites: ['右足の親指', '右足首'], pain: 6, note: '' });
    const s = attackSummary(d.attacks, '2026-10-03');
    expect(s.last?.id).toBe('a2');
    expect(s.ongoing).toHaveLength(1);
    expect(s.daysSinceLast).toBe(0);
    expect(s.countYear).toBe(2);
    expect(s.topSites[0]).toEqual(['右足の親指', 2]);
  });
});

describe('受診用の書き出し', () => {
  it('期間内の尿酸値・発作・薬・飲酒をまとめ、医療判断をしない旨を入れる', () => {
    let d = sample();
    d = addDrink(d, '2026-07-01', 'ビール', 500);
    d = addWater(d, '2026-07-01', 1500);
    const r = buildReport(d, '2026-02-01', '2026-08-01');
    expect(r.labs).toHaveLength(2);
    expect(r.attacks).toHaveLength(1);
    expect(r.meds.map((m) => m.name)).toEqual(['フェブキソスタット', '胃薬']);
    expect(r.drinkDays).toBe(1);
    const t = reportText(r, '2026-08-02');
    expect(t).toContain('7.1');
    expect(t).toContain('右足の親指');
    expect(t).toContain('診断・治療の判断をしません');
  });
  it('CSV はカンマ・改行・引用符を崩さない', () => {
    let d = sample();
    d.labs[0].note = '朝, 空腹 "再検査"';
    d = addFood(d, '2026-01-10', '鶏,もも', 120);
    const csv = toCsv(d, '2026-01-01', '2026-12-31');
    expect(csv.startsWith('﻿種類,日付,値,単位,メモ')).toBe(true);
    expect(csv).toContain('"朝, 空腹 ""再検査"""');
    expect(csv).toContain('"鶏,もも"');
    expect(csv.split('\r\n').filter(Boolean).length).toBe(1 + 3 + 1 + 1);
  });
});

describe('保存・バックアップ', () => {
  it('バックアップを書き出して読み戻すと同じ中身になる', () => {
    let d = sample();
    d = addWater(d, '2026-10-03', 300);
    d.settings.targetUa = 6;
    expect(fromBackup(toBackup(d))).toEqual(normalize(d));
  });
  it('別のファイル・壊れたファイルは読み込まない', () => {
    expect(() => fromBackup('{"a":1}')).toThrow('ウリカ手帳のバックアップではありません');
    expect(() => fromBackup('not json')).toThrow('ファイルの形式が正しくありません');
  });
  it('壊れた記録は捨て、正しい記録は残す', () => {
    const d = normalize({
      labs: [{ date: '2026-01-01', ua: 7 }, { date: 'bad', ua: 7 }, { date: '2026-02-01', ua: 99 }, { date: '2026-03-01', ua: '7' }],
      meds: [{ id: 'm1', name: 'A', times: ['08:00', '25:00', '08:00'] }, { name: '' }],
      doses: [{ date: '2026-01-01', medId: 'm1', time: '08:00' }, { date: '2026-01-01', medId: 'm1', time: '08:00' }, { date: '2026-01-01', medId: 'zz', time: '08:00' }],
      days: { '2026-01-01': { waterMl: 500, drinks: [{ kind: 'ビール', ml: 350 }, { kind: '', ml: 1 }] }, nope: {} },
      attacks: [{ start: '2026-01-05', end: '2026-01-01', pain: 12, sites: ['右ひざ', 3] }],
      settings: { targetUa: 'x', purineGoal: -1, remindTime: '7:00' },
    });
    expect(d.labs).toHaveLength(1);
    expect(d.meds).toHaveLength(1);
    expect(d.meds[0].times).toEqual(['08:00']);
    expect(d.doses).toHaveLength(1);
    expect(d.days['2026-01-01'].drinks).toHaveLength(1);
    expect(Object.keys(d.days)).toEqual(['2026-01-01']);
    expect(d.attacks[0].end).toBeNull();
    expect(d.attacks[0].pain).toBe(0);
    expect(d.attacks[0].sites).toEqual(['右ひざ']);
    expect(d.settings.targetUa).toBeNull();
    expect(d.settings.purineGoal).toBe(400);
    expect(d.settings.remindTime).toBe('08:00');
    expect(normalize(null)).toEqual(emptyData());
  });
});

describe('通知', () => {
  it('無料は1日1回だけ。完全版の細かい設定は無料では効かない', () => {
    const d = sample();
    d.settings.remindOn = true;
    d.settings.perDoseRemind = true;
    d.settings.labRemind = true;
    d.settings.nextLab = '2026-10-20';
    const free = notificationPlan(d, false, '2026-10-03');
    expect(free.map((n) => n.id)).toEqual([DAILY_ID]);
    expect(free[0].body).toContain('フェブキソスタット');
    expect(free[0].body).not.toContain('昔の薬');
  });
  it('完全版は時刻ごとにまとめ、検査日の前日にも知らせる', () => {
    const d = sample();
    d.settings.remindOn = true;
    d.settings.perDoseRemind = true;
    d.settings.labRemind = true;
    d.settings.nextLab = '2026-10-20';
    const plan = notificationPlan(d, true, '2026-10-03');
    expect(plan.filter((n) => n.daily).map((n) => n.title)).toEqual(['08:00 のお薬', '20:00 のお薬']);
    expect(plan.find((n) => n.title === '08:00 のお薬')!.body).toBe('フェブキソスタット・胃薬 の時間です');
    expect(plan.find((n) => n.id === LAB_ID)!.once).toEqual({ date: '2026-10-19', hour: 19, minute: 0 });
    d.settings.nextLab = '2026-10-01';
    expect(notificationPlan(d, true, '2026-10-03').some((n) => n.id === LAB_ID)).toBe(false);
  });
  it('通知を切れば何も予約しない', () => {
    expect(notificationPlan(sample(), true, '2026-10-03')).toEqual([]);
  });
});

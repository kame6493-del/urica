import { Preferences } from '@capacitor/preferences';
import { emptyData } from '../domain/data';
import { addDays, addDrink, addFood, addWater, todayStr, toggleDose } from '../domain/calc';
import { KEY } from '../platform/storage';
import type { AppData } from '../domain/types';

/**
 * 画面確認・ストアの画面写真用の見本の記録(開発サーバーと E2E 用ビルドだけ)。
 * 人物・検査値は架空。食品のプリン体の値は「利用者が自分で入れた値」の見本で、アプリの収録データではない。
 */
export function demoData(today = todayStr()): AppData {
  let d = emptyData();
  d.settings = { ...d.settings, acceptedNotice: true, targetUa: 6.0, remindOn: true, perDoseRemind: true, labRemind: true, nextLab: addDays(today, 12) };
  const labs: [number, number, string][] = [
    [-420, 8.9, '健診で指摘'], [-360, 8.6, ''], [-300, 8.1, '薬を開始'], [-240, 7.4, ''], [-180, 6.9, ''],
    [-120, 6.6, '薬を増量'], [-75, 6.2, ''], [-30, 5.9, ''],
  ];
  d.labs = labs.map(([off, ua, note], i) => ({ id: `l${i}`, date: addDays(today, off), ua, note }));
  d.meds = [
    { id: 'm1', name: '尿酸を下げる薬', dose: '1錠', times: ['08:00'], active: true },
    { id: 'm2', name: '尿をアルカリにする薬', dose: '1包', times: ['08:00', '20:00'], active: true },
  ];
  d.attacks = [
    { id: 'a1', start: addDays(today, -330), end: addDays(today, -324), sites: ['右足の親指'], pain: 9, note: '前の晩に飲み会' },
    { id: 'a2', start: addDays(today, -150), end: addDays(today, -147), sites: ['右足の親指', '右足の甲'], pain: 6, note: '' },
  ];
  d.myFoods = [
    { id: 'f1', name: 'いつもの朝定食', mg: 95, unit: '1食' },
    { id: 'f2', name: '社食の日替わり', mg: 160, unit: '1食' },
    { id: 'f3', name: '納豆', mg: 40, unit: '1パック' },
  ];
  for (let i = 1; i <= 40; i++) {
    const day = addDays(today, -i);
    d = addWater(d, day, 1500 + ((i * 37) % 7) * 100);
    if (i % 3 === 0) d = addDrink(d, day, 'ビール', 350);
    if (i % 7 === 2) d = addDrink(d, day, 'ハイボール・サワー', 350);
    if (i % 2 === 0) d = addFood(d, day, 'いつもの朝定食(1食)', 95);
    for (const [m, t] of [['m1', '08:00'], ['m2', '08:00'], ['m2', '20:00']]) if ((i + t.length + m.length) % 11 !== 0) d = toggleDose(d, day, m, t);
  }
  d = addWater(d, today, 1000);
  d = addDrink(d, today, 'ビール', 350);
  d = addFood(d, today, 'いつもの朝定食(1食)', 95);
  d = addFood(d, today, '社食の日替わり(1食)', 160);
  d = toggleDose(d, today, 'm1', '08:00');
  d = toggleDose(d, today, 'm2', '08:00');
  return d;
}

export async function installDemo(params: URLSearchParams) {
  await Preferences.set({ key: KEY, value: JSON.stringify(demoData()) });
  if (params.get('premium') === '1') localStorage.setItem('urica.mockFull', '1');
  else localStorage.removeItem('urica.mockFull');
  history.replaceState(null, '', location.pathname);
}

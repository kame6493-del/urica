import { useRef, useState } from 'react';
import type { AppData, Medicine } from '../domain/types';
import { fromBackup, isTime, newId, toBackup, UA_MAX, UA_MIN } from '../domain/data';
import { fmtUa } from '../domain/calc';
import { FOOD_TABLE_LINK, GUIDE_PURINE, GUIDE_URIC_LIMIT, GUIDE_WATER, MEDICAL_NOTICE } from '../domain/guide';
import { shareTextFile } from '../platform/native';
import { LockedCard, Source, TopBar, type Update } from './common';

export type MorePage = 'meds' | 'notify' | 'target' | 'foods' | 'backup' | 'about' | 'report' | 'paywall';

export function More(p: { data: AppData; premium: boolean; go: (pg: MorePage) => void }) {
  const s = p.data.settings;
  return (
    <div className="page more">
      <div className="head"><h1>その他</h1>{p.premium ? <span className="tag full">完全版</span> : null}</div>
      {!p.premium && (
        <section className="card" style={{ background: 'var(--amber-soft)', borderColor: '#efd9a8' }}>
          <h2>完全版(買い切り)</h2>
          <p className="small" style={{ margin: '0 0 10px', color: 'var(--ink-2)' }}>受診用のまとめ・CSV書き出し・全期間のグラフ・プリン体の記録・薬ごとの通知。月額なし。</p>
          <button className="btn amber wide" onClick={() => p.go('paywall')}>くわしく見る</button>
        </section>
      )}
      <div className="menu">
        <button onClick={() => p.go('report')}><span className="grow">受診用のまとめ<small>尿酸値・発作・服薬・飲酒を1枚に。送る・CSV</small></span>{!p.premium && <span className="tag full">完全版</span>}</button>
        <button onClick={() => p.go('meds')}><span className="grow">お薬の登録<small>{p.data.meds.filter((m) => m.active).length}種類</small></span></button>
        <button onClick={() => p.go('notify')}><span className="grow">通知<small>{s.remindOn || s.perDoseRemind ? 'オン' : 'オフ'}</small></span></button>
        <button onClick={() => p.go('target')}><span className="grow">目標と目安<small>目標の尿酸値 {s.targetUa === null ? '未設定' : fmtUa(s.targetUa)}・水分・プリン体</small></span></button>
        <button onClick={() => p.go('foods')}><span className="grow">よく食べる物の登録<small>プリン体の量は自分で調べて入れます</small></span>{!p.premium && <span className="tag full">完全版</span>}</button>
      </div>
      <div className="menu">
        <button onClick={() => p.go('backup')}><span className="grow">バックアップ<small>機種変更・入れ直しのときに</small></span></button>
        <button onClick={() => p.go('about')}><span className="grow">このアプリについて<small>注意・出典・プライバシー</small></span></button>
      </div>
      <p className="disclaimer">{MEDICAL_NOTICE}</p>
    </div>
  );
}

/* ---------- お薬 ---------- */

export function MedsPage(p: { data: AppData; update: Update; onBack: () => void }) {
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [t, setT] = useState('20:00');
  const [err, setErr] = useState('');

  const add = () => {
    if (!name.trim()) return setErr('薬の名前を入れてください');
    if (!times.length) return setErr('飲む時刻を1つ以上入れてください');
    const med: Medicine = { id: newId('m'), name: name.trim(), dose: dose.trim(), times: [...times].sort(), active: true };
    p.update((d) => ({ ...d, meds: [...d.meds, med] }));
    setName(''); setDose(''); setTimes(['08:00']); setErr('');
  };
  const setMed = (id: string, fn: (m: Medicine) => Medicine) => p.update((d) => ({ ...d, meds: d.meds.map((m) => (m.id === id ? fn(m) : m)) }));

  return (
    <div className="page sub meds">
      <TopBar title="お薬の登録" onBack={p.onBack} />
      {p.data.meds.map((m) => (
        <section key={m.id} className="card" style={m.active ? undefined : { opacity: .6 }}>
          <h2>{m.name}{m.dose && <span className="small muted">{m.dose}</span>}<span className={`tag ${m.active ? 'green' : ''}`}>{m.active ? '飲んでいる' : 'やめた'}</span></h2>
          <div className="small" style={{ color: 'var(--ink-2)' }}>時刻: {m.times.join('・') || 'なし'}</div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn small ghost" onClick={() => setMed(m.id, (x) => ({ ...x, active: !x.active }))}>{m.active ? 'やめた' : 'また飲む'}</button>
            <button className="btn small ghost" style={{ color: 'var(--coral)' }} onClick={() => {
              if (confirm(`${m.name} を消しますか？ 飲んだ記録も消えます。やめた薬は「やめた」にすると記録が残ります。`)) {
                p.update((d) => ({ ...d, meds: d.meds.filter((x) => x.id !== m.id), doses: d.doses.filter((x) => x.medId !== m.id) }));
              }
            }}>消す</button>
          </div>
        </section>
      ))}
      <section className="card">
        <h2>薬を足す</h2>
        <label className="field"><span>薬の名前</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="お薬手帳の名前どおりに" /></label>
        <label className="field"><span>量(任意)</span><input className="input" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="例 1錠" /></label>
        <div className="field"><span>飲む時刻</span>
          <div className="chips" style={{ marginBottom: 8 }}>
            {times.map((x) => <button key={x} className="chip on" onClick={() => setTimes(times.filter((y) => y !== x))}>{x} ×</button>)}
          </div>
          <div className="row">
            <input className="input" type="time" value={t} onChange={(e) => setT(e.target.value)} style={{ maxWidth: 160 }} aria-label="時刻" />
            <button className="btn small" disabled={!isTime(t) || times.includes(t) || times.length >= 6} onClick={() => setTimes([...times, t].sort())}>時刻を足す</button>
          </div>
        </div>
        {err && <p className="err">{err}</p>}
        <button className="btn primary wide" onClick={add}>登録する</button>
        <p className="small muted">飲む量・時刻は主治医・薬剤師の指示どおりに入れてください。</p>
      </section>
    </div>
  );
}

/* ---------- 通知 ---------- */

export function NotifyPage(p: { data: AppData; premium: boolean; update: Update; onBack: () => void; openPaywall: () => void; notifyOk: boolean }) {
  const s = p.data.settings;
  const set = (patch: Partial<AppData['settings']>) => p.update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  return (
    <div className="page sub notify">
      <TopBar title="通知" onBack={p.onBack} />
      {!p.notifyOk && <div className="notice" style={{ background: 'var(--coral-soft)' }}>通知が許可されていません。端末の設定でこのアプリの通知をオンにしてください。</div>}
      <section className="card">
        <h2>1日1回のお知らせ</h2>
        <label className="check-line"><input type="checkbox" checked={s.remindOn} onChange={(e) => set({ remindOn: e.target.checked })} />お薬のお知らせを受け取る</label>
        <label className="field"><span>時刻</span>
          <input className="input" type="time" value={s.remindTime} disabled={!s.remindOn} onChange={(e) => isTime(e.target.value) && set({ remindTime: e.target.value })} style={{ maxWidth: 180 }} />
        </label>
        {p.premium && s.perDoseRemind && <p className="small muted">いまは「薬ごとの時刻に知らせる」が優先されます。</p>}
      </section>
      {p.premium ? (
        <section className="card">
          <h2>細かい設定<span className="tag full">完全版</span></h2>
          <label className="check-line"><input type="checkbox" checked={s.perDoseRemind} onChange={(e) => set({ perDoseRemind: e.target.checked })} />薬ごとに登録した時刻に知らせる</label>
          <p className="small muted" style={{ marginTop: 0 }}>同じ時刻の薬は1つの通知にまとめます。</p>
          <label className="check-line"><input type="checkbox" checked={s.labRemind} onChange={(e) => set({ labRemind: e.target.checked })} />次の検査日の前日に知らせる</label>
          <label className="field"><span>次の検査日</span>
            <input className="input" type="date" value={s.nextLab ?? ''} onChange={(e) => set({ nextLab: e.target.value || null })} style={{ maxWidth: 200 }} />
          </label>
        </section>
      ) : (
        <LockedCard title="細かい設定" onUnlock={p.openPaywall}>朝・夜など薬ごとの時刻に知らせる。次の検査日の前日に知らせる。</LockedCard>
      )}
    </div>
  );
}

/* ---------- 目標と目安 ---------- */

export function TargetPage(p: { data: AppData; update: Update; onBack: () => void }) {
  const s = p.data.settings;
  const [ua, setUa] = useState(s.targetUa === null ? '' : String(s.targetUa));
  const [pur, setPur] = useState(String(s.purineGoal));
  const [water, setWater] = useState(String(s.waterGoal));
  const [msg, setMsg] = useState('');
  const save = () => {
    const u = ua.trim() === '' ? null : Number(ua.replace(',', '.'));
    const pr = Number(pur);
    const w = Number(water);
    if (u !== null && (!Number.isFinite(u) || u < UA_MIN || u > UA_MAX)) return setMsg(`目標の尿酸値は ${UA_MIN}〜${UA_MAX} で入れるか、空にしてください`);
    if (!Number.isFinite(pr) || pr < 1 || pr > 5000) return setMsg('プリン体の目安は 1〜5000 mg で入れてください');
    if (!Number.isFinite(w) || w < 100 || w > 10000) return setMsg('水分の目安は 100〜10000 mL で入れてください');
    p.update((d) => ({ ...d, settings: { ...d.settings, targetUa: u === null ? null : Math.round(u * 10) / 10, purineGoal: Math.round(pr), waterGoal: Math.round(w) } }));
    setMsg('保存しました');
  };
  return (
    <div className="page sub target">
      <TopBar title="目標と目安" onBack={p.onBack} />
      <section className="card">
        <h2>目標の尿酸値</h2>
        <p className="small" style={{ marginTop: 0, color: 'var(--ink-2)' }}>主治医と決めた値を入れると、グラフに緑の線を引きます。アプリから値はおすすめしません。</p>
        <label className="field"><span>目標(mg/dL)・空なら線を引かない</span>
          <input className="input" inputMode="decimal" value={ua} onChange={(e) => setUa(e.target.value)} placeholder="主治医と決めた値" />
        </label>
        <p className="small muted" style={{ margin: 0 }}>赤い点線の {fmtUa(GUIDE_URIC_LIMIT.value)} は、高尿酸血症と呼ばれる境目です。</p>
        <Source source={GUIDE_URIC_LIMIT.source} url={GUIDE_URIC_LIMIT.url} />
      </section>
      <section className="card">
        <h2>1日の水分の目安</h2>
        <label className="field"><span>mL</span><input className="input" inputMode="numeric" value={water} onChange={(e) => setWater(e.target.value)} /></label>
        <p className="small" style={{ margin: 0, color: 'var(--ink-2)' }}>{GUIDE_WATER.text}</p>
        <Source source={GUIDE_WATER.source} url={GUIDE_WATER.url} />
        <button className="link small" onClick={() => setWater(String(GUIDE_WATER.value))}>{GUIDE_WATER.value.toLocaleString()} mL に戻す</button>
      </section>
      <section className="card">
        <h2>1日のプリン体の目安</h2>
        <label className="field"><span>mg</span><input className="input" inputMode="numeric" value={pur} onChange={(e) => setPur(e.target.value)} /></label>
        <p className="small" style={{ margin: 0, color: 'var(--ink-2)' }}>{GUIDE_PURINE.text}</p>
        <Source source={GUIDE_PURINE.source} url={GUIDE_PURINE.url} />
        <button className="link small" onClick={() => setPur(String(GUIDE_PURINE.value))}>{GUIDE_PURINE.value} mg に戻す</button>
      </section>
      <p className="small muted">腎臓の病気などで水分や食事の制限がある方は、主治医の指示を優先してください。</p>
      {msg && <p className={msg === '保存しました' ? 'small' : 'err'} style={msg === '保存しました' ? { color: 'var(--green)' } : undefined}>{msg}</p>}
      <button className="btn primary wide" onClick={save}>保存する</button>
    </div>
  );
}

/* ---------- よく食べる物 ---------- */

export function FoodsPage(p: { data: AppData; premium: boolean; update: Update; onBack: () => void; openPaywall: () => void }) {
  const [name, setName] = useState('');
  const [mg, setMg] = useState('');
  const [unit, setUnit] = useState('');
  const [err, setErr] = useState('');
  const add = () => {
    const v = Number(mg);
    if (!name.trim()) return setErr('名前を入れてください');
    if (!mg || !Number.isFinite(v) || v < 0 || v > 10000) return setErr('プリン体の量(mg)を 0〜10000 で入れてください');
    p.update((d) => ({ ...d, myFoods: [...d.myFoods, { id: newId('mf'), name: name.trim(), mg: Math.round(v * 10) / 10, unit: unit.trim() }] }));
    setName(''); setMg(''); setUnit(''); setErr('');
  };
  return (
    <div className="page sub foods">
      <TopBar title="よく食べる物の登録" onBack={p.onBack} />
      <div className="notice">
        このアプリには食品ごとのプリン体の量は入っていません。量は食品の表示や、次のような公開の表で調べて、食べる分量に直して入れてください。
        <br /><a href={FOOD_TABLE_LINK.url} target="_blank" rel="noopener noreferrer">{FOOD_TABLE_LINK.label}</a>(100gあたりの量。外部のページが開きます)
      </div>
      {!p.premium ? (
        <LockedCard title="よく食べる物の登録" onUnlock={p.openPaywall}>登録した食品は「今日」の画面で1回押すだけで記録できます。</LockedCard>
      ) : (
        <>
          <section className="card">
            <h2>食品を足す</h2>
            <label className="field"><span>名前</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例 いつもの朝ごはん" /></label>
            <div className="two">
              <label className="field"><span>プリン体(mg)</span><input className="input" inputMode="decimal" value={mg} onChange={(e) => setMg(e.target.value)} /></label>
              <label className="field"><span>分量(任意)</span><input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="例 1皿" /></label>
            </div>
            {err && <p className="err">{err}</p>}
            <button className="btn primary wide" onClick={add}>登録する</button>
          </section>
          {p.data.myFoods.length > 0 && (
            <section className="card">
              <h2>登録した食品<span className="tag">{p.data.myFoods.length}件</span></h2>
              <ul className="list">
                {p.data.myFoods.map((f) => (
                  <li key={f.id}>
                    <span className="grow">{f.name}{f.unit && <span className="small muted"> / {f.unit}</span>}</span>
                    <span className="v">{f.mg} mg</span>
                    <button className="x" aria-label="消す" onClick={() => p.update((d) => ({ ...d, myFoods: d.myFoods.filter((x) => x.id !== f.id) }))}>×</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- バックアップ ---------- */

export function BackupPage(p: { data: AppData; today: string; replace: (d: AppData) => void; onBack: () => void }) {
  const [msg, setMsg] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const exportNow = async () => {
    try {
      const r = await shareTextFile(`urica-backup-${p.today}.json`, toBackup(p.data), 'application/json');
      setMsg(r === 'cancelled' ? '' : 'バックアップを書き出しました。メールやファイルに保存しておいてください。');
    } catch (e) {
      setMsg(`書き出せませんでした(${(e as Error).message ?? e})`);
    }
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const d = fromBackup(await f.text());
      const n = d.labs.length + d.attacks.length + Object.keys(d.days).length;
      if (confirm(`バックアップ(記録 ${n} 件)を読み込みます。今の記録はすべて置き換わります。よろしいですか？`)) {
        p.replace(d);
        setMsg('読み込みました');
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      if (file.current) file.current.value = '';
    }
  };
  return (
    <div className="page sub backup">
      <TopBar title="バックアップ" onBack={p.onBack} />
      <div className="notice">記録はこの端末の中だけにあります(サーバーには送りません)。機種変更やアプリの入れ直しの前に、ファイルに書き出しておいてください。</div>
      <section className="card">
        <h2>書き出す</h2>
        <p className="small" style={{ marginTop: 0, color: 'var(--ink-2)' }}>すべての記録を1つのファイルにします。</p>
        <button className="btn primary wide" onClick={exportNow}>バックアップを書き出す</button>
      </section>
      <section className="card">
        <h2>読み込む</h2>
        <p className="small" style={{ marginTop: 0, color: 'var(--ink-2)' }}>書き出したファイルを選ぶと、記録が戻ります。</p>
        <input ref={file} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(e) => onFile(e.target.files?.[0])} data-testid="backup-file" />
        <button className="btn wide" onClick={() => file.current?.click()}>ファイルを選ぶ</button>
      </section>
      {msg && <p className="small" role="status">{msg}</p>}
    </div>
  );
}

/* ---------- このアプリについて ---------- */

export function AboutPage(p: { onBack: () => void; onClear: () => void; version: string }) {
  return (
    <div className="page sub about">
      <TopBar title="このアプリについて" onBack={p.onBack} />
      <section className="card">
        <h2>大切なお知らせ</h2>
        <p style={{ margin: 0 }}>{MEDICAL_NOTICE}</p>
      </section>
      <section className="card">
        <h2>アプリの中の数字の出どころ</h2>
        {[GUIDE_URIC_LIMIT, GUIDE_WATER, GUIDE_PURINE].map((g) => (
          <div key={g.url} style={{ marginBottom: 10 }}>
            <div className="small">{g.text}</div>
            <Source source={g.source} url={g.url} />
          </div>
        ))}
        <p className="small muted" style={{ margin: 0 }}>食品ごとのプリン体の量は収録していません。利用者が自分で調べて入れた値を足し算するだけです。</p>
      </section>
      <section className="card">
        <h2>プライバシー</h2>
        <p className="small" style={{ margin: 0 }}>記録はこの端末の中だけに保存します。アカウントはありません。開発者が記録を受け取ることはありません。広告もありません。</p>
      </section>
      <section className="card">
        <h2>すべての記録を消す</h2>
        <button className="btn small coral" onClick={p.onClear}>すべて消す</button>
      </section>
      <p className="center small muted">ウリカ手帳 {p.version}</p>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppData, Attack } from './domain/types';
import { emptyData } from './domain/data';
import { todayStr } from './domain/calc';
import { MEDICAL_NOTICE } from './domain/guide';
import { notificationPlan } from './domain/notify';
import { clearData, loadData, saveData } from './platform/storage';
import { loadBilling, resetMock, type BillingState } from './platform/billing';
import { applyNotices } from './platform/native';
import { Ico, Logo, TabIcon } from './ui/common';
import { Home } from './ui/Home';
import { Today, type RecordSeg } from './ui/Today';
import { LabForm, Uric } from './ui/Uric';
import { AttackForm } from './ui/Attacks';
import { AboutPage, BackupPage, FoodsPage, MedsPage, More, NotifyPage, TargetPage, type MorePage } from './ui/More';
import { Report } from './ui/Report';
import { Paywall, Thanks } from './ui/Paywall';
import person from './assets/art/person.png';
import fChart from './assets/art/f_chart.png';
import pills from './assets/art/empty_pills.png';
import footArt from './assets/art/empty_foot.png';

type Tab = 'home' | 'record' | 'graph' | 'report' | 'settings';
type Overlay = { kind: MorePage } | { kind: 'attackForm'; attack?: Attack } | { kind: 'labForm' } | { kind: 'thanks' } | null;
const VERSION = '1.1.0';

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [billing, setBilling] = useState<BillingState>({ status: 'unavailable', reason: '確認中…' });
  const [tab, setTab] = useState<Tab>('home');
  const [seg, setSeg] = useState<RecordSeg>('daily');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [notifyOk, setNotifyOk] = useState(true);
  const [toast, setToast] = useState('');
  const today = todayStr();
  const premium = billing.status === 'ready' && billing.premium;
  const dataRef = useRef<AppData | null>(null);

  useEffect(() => {
    loadData().then((d) => { dataRef.current = d; setData(d); });
    loadBilling().then(setBilling);
  }, []);

  const update = useCallback((fn: (d: AppData) => AppData) => {
    const cur = dataRef.current;
    if (!cur) return;
    const next = fn(cur);
    dataRef.current = next;
    setData(next);
    void saveData(next);
  }, []);

  // 通知は薬・設定・購入の状態が変わったときだけ予約し直す
  const planKey = useMemo(() => (data ? JSON.stringify(notificationPlan(data, premium, today)) : ''), [data, premium, today]);
  useEffect(() => {
    if (!data) return;
    void applyNotices(JSON.parse(planKey)).then(setNotifyOk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey]);

  useEffect(() => { window.scrollTo(0, 0); }, [tab, overlay, seg]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  if (!data) return <div className="splash"><Logo size={88} /></div>;

  if (!data.settings.acceptedNotice) {
    return (
      <div className="welcome">
        <Logo size={56} />
        <h1>ウリカ手帳</h1>
        <p className="lead">尿酸値と毎日を<br />やさしく記録</p>
        <img className="hero" src={person} alt="" />
        <div className="feat"><img src={fChart} alt="" /><div><b>尿酸値を記録</b><small>検査の結果をグラフに。目標の線と発作の日も一緒に</small></div></div>
        <div className="feat"><img src={pills} alt="" /><div><b>お薬を忘れない</b><small>飲んだ印と、時刻のお知らせ</small></div></div>
        <div className="feat"><img src={footArt} alt="" /><div><b>発作を振り返る</b><small>痛む場所を足の図で。水分・お酒も記録</small></div></div>
        <p className="small muted center" style={{ margin: '4px 0 10px' }}>記録はこの端末の中だけ。アカウントも広告もありません。</p>
        <div className="notice"><Ico.info size={18} /> {MEDICAL_NOTICE}</div>
        <button className="btn primary wide big" onClick={() => update((d) => ({ ...d, settings: { ...d.settings, acceptedNotice: true } }))}>注意を読みました。はじめる</button>
      </div>
    );
  }

  const openPaywall = () => setOverlay({ kind: 'paywall' });
  const close = () => setOverlay(null);
  const bought = () => {
    setBilling((b) => (b.status === 'ready' ? { ...b, premium: true } : b));
    setOverlay({ kind: 'thanks' });
  };
  const goAttacks = () => { setSeg('attack'); setTab('record'); };

  let body;
  if (overlay) {
    switch (overlay.kind) {
      case 'paywall': body = <Paywall billing={billing} onClose={close} onBought={bought} />; break;
      case 'thanks': body = <Thanks onClose={close} />; break;
      case 'meds': body = <MedsPage data={data} today={today} update={update} onBack={close} />; break;
      case 'notify': body = <NotifyPage data={data} premium={premium} update={update} onBack={close} openPaywall={openPaywall} notifyOk={notifyOk} />; break;
      case 'target': body = <TargetPage data={data} update={update} onBack={close} />; break;
      case 'foods': body = <FoodsPage data={data} premium={premium} update={update} onBack={close} openPaywall={openPaywall} />; break;
      case 'backup': body = <BackupPage data={data} today={today} replace={(d) => update(() => ({ ...d, settings: { ...d.settings, acceptedNotice: true } }))} onBack={close} />; break;
      case 'labForm': body = <LabForm data={data} today={today} update={update} onBack={close} onSaved={() => { setOverlay(null); setTab('graph'); setToast('検査値を保存しました'); }} />; break;
      case 'about': body = (
        <AboutPage version={VERSION} onBack={close} onClear={async () => {
          if (!confirm('すべての記録を消します。元に戻せません。よろしいですか？')) return;
          await clearData();
          resetMock();
          const d = { ...emptyData(), settings: { ...emptyData().settings, acceptedNotice: true } };
          dataRef.current = d;
          setData(d);
          void saveData(d);
          setOverlay(null);
          setTab('home');
          setToast('すべての記録を消しました');
        }} />
      ); break;
      case 'attackForm': body = (
        <AttackForm today={today} initial={overlay.attack} onCancel={close}
          onSave={(a) => { update((d) => ({ ...d, attacks: [a, ...d.attacks.filter((x) => x.id !== a.id)] })); setOverlay(null); goAttacks(); setToast('発作を記録しました'); }}
          onDelete={overlay.attack ? () => {
            const id = overlay.attack!.id;
            if (confirm('この発作の記録を消しますか？')) { update((d) => ({ ...d, attacks: d.attacks.filter((x) => x.id !== id) })); setOverlay(null); }
          } : undefined} />
      ); break;
    }
  } else if (tab === 'home') {
    body = <Home data={data} today={today} premium={premium} goRecord={() => { setSeg('daily'); setTab('record'); }} goAttacks={goAttacks}
      goGraph={() => setTab('graph')} openLabForm={() => setOverlay({ kind: 'labForm' })} />;
  } else if (tab === 'record') {
    body = <Today data={data} today={today} premium={premium} update={update} seg={seg} setSeg={setSeg}
      goMeds={() => setOverlay({ kind: 'meds' })} goFoods={() => setOverlay({ kind: 'foods' })} openPaywall={openPaywall}
      openAttackForm={(a) => setOverlay({ kind: 'attackForm', attack: a })} />;
  } else if (tab === 'graph') {
    body = <Uric data={data} today={today} premium={premium} update={update} openPaywall={openPaywall}
      goTarget={() => setOverlay({ kind: 'target' })} openForm={() => setOverlay({ kind: 'labForm' })} />;
  } else if (tab === 'report') {
    body = <Report data={data} today={today} premium={premium} openPaywall={openPaywall} />;
  } else {
    body = <More data={data} premium={premium} today={today} go={(pg) => setOverlay({ kind: pg })} />;
  }

  const tabs: [Tab, string, (p: { size?: number }) => React.ReactElement][] = [
    ['home', 'ホーム', TabIcon.home], ['record', '記録', TabIcon.record], ['graph', 'グラフ', TabIcon.graph],
    ['report', 'まとめ', TabIcon.report], ['settings', '設定', TabIcon.settings],
  ];
  return (
    <div className="app">
      {body}
      {!overlay && (
        <nav className="tabs">
          {tabs.map(([k, label, Icon]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => { if (k === 'record' && tab !== 'record') setSeg('daily'); setTab(k); }} aria-current={tab === k ? 'page' : undefined}>
              <Icon size={24} />{label}
            </button>
          ))}
        </nav>
      )}
      {toast && <div className="toast" role="status"><Ico.check size={18} />{toast}</div>}
    </div>
  );
}

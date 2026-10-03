import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppData, Attack } from './domain/types';
import { emptyData } from './domain/data';
import { todayStr } from './domain/calc';
import { MEDICAL_NOTICE } from './domain/guide';
import { notificationPlan } from './domain/notify';
import { clearData, loadData, saveData } from './platform/storage';
import { loadBilling, resetMock, type BillingState } from './platform/billing';
import { applyNotices } from './platform/native';
import { Logo, TabIcon } from './ui/common';
import { Today } from './ui/Today';
import { Uric } from './ui/Uric';
import { AttackForm, Attacks } from './ui/Attacks';
import { AboutPage, BackupPage, FoodsPage, MedsPage, More, NotifyPage, TargetPage, type MorePage } from './ui/More';
import { Report } from './ui/Report';
import { Paywall } from './ui/Paywall';

type Tab = 'today' | 'ua' | 'attack' | 'more';
type Overlay = { kind: MorePage } | { kind: 'attackForm'; attack?: Attack } | null;
const VERSION = '1.0.0';

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [billing, setBilling] = useState<BillingState>({ status: 'unavailable', reason: '確認中…' });
  const [tab, setTab] = useState<Tab>('today');
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

  useEffect(() => { window.scrollTo(0, 0); }, [tab, overlay]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  if (!data) return <div className="splash">ウリカ手帳</div>;

  if (!data.settings.acceptedNotice) {
    return (
      <div className="welcome">
        <Logo />
        <h1>ウリカ手帳</h1>
        <p style={{ margin: 0, color: 'var(--ink-2)' }}>尿酸値と痛風の、毎日の記録帳。</p>
        <ul>
          <li>検査の尿酸値をグラフに。目標の線と発作の日も一緒に</li>
          <li>お薬を飲んだ印と、お知らせ</li>
          <li>水分・お酒・発作の場所と痛み</li>
          <li>記録はこの端末の中だけ。アカウントも広告もありません</li>
        </ul>
        <div className="notice">{MEDICAL_NOTICE}</div>
        <button className="btn primary wide big" onClick={() => update((d) => ({ ...d, settings: { ...d.settings, acceptedNotice: true } }))}>わかりました。はじめる</button>
      </div>
    );
  }

  const openPaywall = () => setOverlay({ kind: 'paywall' });
  const close = () => setOverlay(null);
  const bought = () => {
    setBilling((b) => (b.status === 'ready' ? { ...b, premium: true } : b));
    setOverlay(null);
    setToast('完全版になりました。ありがとうございます');
  };

  let body;
  if (overlay) {
    switch (overlay.kind) {
      case 'paywall': body = <Paywall billing={billing} onClose={close} onBought={bought} />; break;
      case 'report': body = <Report data={data} today={today} premium={premium} onBack={close} openPaywall={openPaywall} />; break;
      case 'meds': body = <MedsPage data={data} update={update} onBack={close} />; break;
      case 'notify': body = <NotifyPage data={data} premium={premium} update={update} onBack={close} openPaywall={openPaywall} notifyOk={notifyOk} />; break;
      case 'target': body = <TargetPage data={data} update={update} onBack={close} />; break;
      case 'foods': body = <FoodsPage data={data} premium={premium} update={update} onBack={close} openPaywall={openPaywall} />; break;
      case 'backup': body = <BackupPage data={data} today={today} replace={(d) => update(() => ({ ...d, settings: { ...d.settings, acceptedNotice: true } }))} onBack={close} />; break;
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
          setTab('today');
          setToast('すべての記録を消しました');
        }} />
      ); break;
      case 'attackForm': body = (
        <AttackForm today={today} initial={overlay.attack} onCancel={close}
          onSave={(a) => { update((d) => ({ ...d, attacks: [a, ...d.attacks.filter((x) => x.id !== a.id)] })); setOverlay(null); setTab('attack'); setToast('発作を記録しました'); }}
          onDelete={overlay.attack ? () => {
            const id = overlay.attack!.id;
            if (confirm('この発作の記録を消しますか？')) { update((d) => ({ ...d, attacks: d.attacks.filter((x) => x.id !== id) })); setOverlay(null); }
          } : undefined} />
      ); break;
    }
  } else if (tab === 'today') {
    body = <Today data={data} today={today} premium={premium} update={update} goUa={() => setTab('ua')}
      goMeds={() => setOverlay({ kind: 'meds' })} goFoods={() => setOverlay({ kind: 'foods' })} openPaywall={openPaywall} />;
  } else if (tab === 'ua') {
    body = <Uric data={data} today={today} premium={premium} update={update} openPaywall={openPaywall} goTarget={() => setOverlay({ kind: 'target' })} />;
  } else if (tab === 'attack') {
    body = <Attacks data={data} today={today} update={update} openForm={(a) => setOverlay({ kind: 'attackForm', attack: a })} />;
  } else {
    body = <More data={data} premium={premium} go={(pg) => setOverlay({ kind: pg })} />;
  }

  const tabs: [Tab, string, () => React.ReactElement][] = [
    ['today', '今日', TabIcon.today], ['ua', '尿酸値', TabIcon.ua], ['attack', '発作', TabIcon.attack], ['more', 'その他', TabIcon.more],
  ];
  return (
    <div className="app">
      {body}
      {!overlay && (
        <nav className="tabs">
          {tabs.map(([k, label, Icon]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined}>
              <Icon />{label}
            </button>
          ))}
        </nav>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

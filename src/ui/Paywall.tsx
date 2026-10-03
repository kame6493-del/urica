import { useState } from 'react';
import { purchase, restore, type BillingState } from '../platform/billing';
import { TopBar } from './common';

const ROWS: [string, string, string][] = [
  ['尿酸値の記録とグラフ', '直近1年まで', '全期間'],
  ['目標の線・7.0の線・発作の印', '○', '○'],
  ['お薬・水分・お酒・発作の記録', '○', '○'],
  ['お薬の通知', '1日1回', '薬ごとの時刻'],
  ['検査日の前日の通知', '—', '○'],
  ['受診用のまとめ・CSV書き出し', '—', '○'],
  ['プリン体の記録・よく食べる物', '—', '○'],
  ['バックアップ', '○', '○'],
  ['広告', 'なし', 'なし'],
];

export function Paywall(p: { billing: BillingState; onClose: () => void; onBought: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const price = p.billing.status === 'ready' ? p.billing.price ?? '' : '';

  const buy = async () => {
    setBusy(true); setMsg('');
    try {
      if (await purchase(p.billing)) p.onBought();
    } catch (e) {
      setMsg(`購入できませんでした(${(e as Error).message ?? e})`);
    } finally { setBusy(false); }
  };
  const doRestore = async () => {
    setBusy(true); setMsg('');
    try {
      if (await restore()) p.onBought();
      else setMsg('このアカウントでの購入は見つかりませんでした');
    } catch (e) {
      setMsg(`復元できませんでした(${(e as Error).message ?? e})`);
    } finally { setBusy(false); }
  };

  return (
    <div className="page sub paywall">
      <TopBar title="完全版" onBack={p.onClose} />
      <section className="pw-hero">
        <div className="kicker">買い切り・月額なし</div>
        <h2>診察の5分で、<br />この数か月を正しく伝える。</h2>
      </section>
      <table className="pw-table">
        <thead><tr><th></th><th>無料</th><th>完全版</th></tr></thead>
        <tbody>
          {ROWS.map(([a, b, c]) => (
            <tr key={a}><td>{a}</td><td className={b === '○' ? 'yes' : ''}>{b}</td><td className={c === '○' ? 'yes' : ''}>{c}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="pw-cta">
        {p.billing.status === 'ready' ? (
          <button className="btn amber wide big" disabled={busy || (!p.billing.pkg && !price)} onClick={buy}>
            {busy ? '処理中…' : `${price || '完全版'} で買う(1回だけ)`}
          </button>
        ) : (
          <button className="btn ghost wide big" disabled>{p.billing.reason}</button>
        )}
        <button className="link center" style={{ textAlign: 'center' }} disabled={busy} onClick={doRestore}>以前に買った方はこちら(購入の復元)</button>
        {msg && <p className="err center">{msg}</p>}
      </div>
      <p className="muted small">一度買えば、同じストアのアカウントなら機種変更後も「購入の復元」で使えます。記録はこの端末の中だけに保存し、外へ送りません。</p>
    </div>
  );
}

import { useState } from 'react';
import { purchase, restore, type BillingState } from '../platform/billing';
import { Ico, TopBar } from './common';
import crown from '../assets/art/crown.png';
import crownParty from '../assets/art/crown_party.png';
import tagArt from '../assets/art/pw_tag.png';
import noadArt from '../assets/art/pw_noad.png';
import userArt from '../assets/art/pw_user.png';
import shieldArt from '../assets/art/pw_shield.png';
import fChart from '../assets/art/f_chart.png';
import fDoc from '../assets/art/f_doc.png';
import fExport from '../assets/art/f_export.png';
import fFork from '../assets/art/f_fork.png';
import fBell from '../assets/art/f_bell.png';
import fCal from '../assets/art/f_cal.png';

/** 無料と完全版の違い(中身は今までと同じ。見本の「機能の比較」の形にした) */
const ROWS: { art: string; name: string; free: string; full: string }[] = [
  { art: fChart, name: '尿酸値のグラフ', free: '1年まで', full: '3年・全期間' },
  { art: fDoc, name: '受診用のまとめ', free: '—', full: '○' },
  { art: fExport, name: '文章・CSVの書き出し', free: '—', full: '○' },
  { art: fFork, name: 'プリン体の記録・よく食べる物', free: '—', full: '○' },
  { art: fBell, name: 'お薬の通知', free: '1日1回', full: '薬ごとの時刻' },
  { art: fCal, name: '次の検査日のお知らせ', free: '—', full: '○' },
];
const BOTH = ['お薬・水分・お酒・発作の記録', '目標の線・7.0の線・発作の印', 'バックアップ'];

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
      <TopBar title="完全版のご購入" onBack={p.onClose} />
      <section className="pw-hero">
        <img className="pw-crown" src={crown} alt="" />
        <h2>ウリカ手帳 完全版<br /><small>(買い切り)</small></h2>
        <p>一度のご購入で、すべての機能が使えます。<br />月額の課金はありません。</p>
      </section>
      <div className="benefits">
        <div><img src={tagArt} alt="" /><b>買い切り</b><small>一度の購入でずっと</small></div>
        <div><img src={noadArt} alt="" /><b>広告なし</b><small>広告は出ません</small></div>
        <div><img src={userArt} alt="" /><b>登録なし</b><small>アカウント不要</small></div>
        <div><img src={shieldArt} alt="" /><b>データは端末内だけ</b><small>外部へ送りません</small></div>
      </div>

      <h2 className="sec">機能の比較</h2>
      <div className="pw-compare">
        <div className="pw-head"><span /><span>無料</span><span className="full"><img src={crown} alt="" />完全版</span></div>
        {ROWS.map((r) => (
          <div key={r.name} className="pw-row">
            <span className="pw-name"><img src={r.art} alt="" />{r.name}</span>
            <span className="pw-free">{r.free}</span>
            <span className="pw-full">{r.full === '○' ? <span className="ck big"><Ico.check size={16} /></span> : r.full}</span>
          </div>
        ))}
        <div className="pw-both">{BOTH.join('・')}は、無料のままずっと使えます。</div>
      </div>

      <div className="pw-cta">
        {p.billing.status === 'ready' ? (
          <button className="btn primary wide big" disabled={busy || (!p.billing.pkg && !price)} onClick={buy}>
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

/** 購入が終わったとき(見本の「購入完了画面」) */
export function Thanks(p: { onClose: () => void }) {
  return (
    <div className="page sub thanks">
      <TopBar title="完全版" onBack={p.onClose} />
      <section className="pw-hero">
        <img className="party" src={crownParty} alt="" />
        <h2>完全版になりました</h2>
        <p>ご購入ありがとうございます。すべての機能が使えるようになりました。</p>
      </section>
      <section className="card">
        <h2>使えるようになった機能</h2>
        <ul className="checks">
          {ROWS.map((r) => <li key={r.name}><span className="ck"><Ico.check size={14} /></span>{r.name}{r.full !== '○' ? `(${r.full})` : ''}</li>)}
        </ul>
      </section>
      <button className="btn primary wide big" onClick={p.onClose}>さっそく使ってみる</button>
    </div>
  );
}

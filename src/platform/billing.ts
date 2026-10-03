import { Capacitor } from '@capacitor/core';
import { Purchases, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import CONFIG from '../billing.config.json';

/**
 * 課金は買い切り(非消耗型)1つだけ。商品ID・entitlement・キーは src/billing.config.json にまとめてある。
 * キーが空なら「購入の準備中です」を出して何もしない(落ちない)。
 */
export const ENTITLEMENT = CONFIG.entitlement;
export const PRODUCT_ID = CONFIG.products;
export const DISPLAY_PRICE = CONFIG.displayPrice;

export type BillingState =
  | { status: 'unavailable'; reason: string }
  | { status: 'ready'; premium: boolean; price: string | null; pkg?: PurchasesPackage };

const platform = Capacitor.getPlatform();
const key = platform === 'ios' ? CONFIG.revenuecat.ios : platform === 'android' ? CONFIG.revenuecat.android : '';
/** 疑似購入は開発サーバーと E2E 用ビルド(--mode e2e)だけ。製品ビルドには入らない */
const mock = !Capacitor.isNativePlatform() && (import.meta.env.DEV || import.meta.env.VITE_MOCK_BILLING === '1');
const MOCK_KEY = 'urica.mockFull';

let configured = false;
async function ensure() {
  if (configured) return;
  await Purchases.configure({ apiKey: key });
  configured = true;
}

export async function loadBilling(): Promise<BillingState> {
  if (mock) return { status: 'ready', premium: localStorage.getItem(MOCK_KEY) === '1', price: DISPLAY_PRICE };
  if (!key) return { status: 'unavailable', reason: '購入の準備中です' };
  try {
    await ensure();
    const [{ customerInfo }, offerings] = await Promise.all([Purchases.getCustomerInfo(), Purchases.getOfferings()]);
    const offering = offerings.all[CONFIG.offering] ?? offerings.current;
    const pkg = offering?.availablePackages[0];
    return { status: 'ready', premium: ENTITLEMENT in customerInfo.entitlements.active, price: pkg?.product.priceString ?? null, pkg };
  } catch (e) {
    console.warn('[urica] billing', e);
    return { status: 'unavailable', reason: 'ストアに接続できませんでした' };
  }
}

export const isMock = mock;

/** true=有効になった / false=キャンセル。失敗は例外 */
export async function purchase(state: BillingState): Promise<boolean> {
  if (mock) {
    localStorage.setItem(MOCK_KEY, '1');
    return true;
  }
  if (state.status !== 'ready' || !state.pkg) throw new Error('この商品は購入できません');
  await ensure();
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: state.pkg });
    return ENTITLEMENT in customerInfo.entitlements.active;
  } catch (e) {
    if ((e as { userCancelled?: boolean })?.userCancelled) return false;
    throw e;
  }
}

export async function restore(): Promise<boolean> {
  if (mock) return localStorage.getItem(MOCK_KEY) === '1';
  if (!key) return false;
  await ensure();
  const { customerInfo } = await Purchases.restorePurchases();
  return ENTITLEMENT in customerInfo.entitlements.active;
}

export function resetMock() {
  if (mock) localStorage.removeItem(MOCK_KEY);
}

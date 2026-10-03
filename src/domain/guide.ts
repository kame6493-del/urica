/**
 * アプリの中で示す数字は、ここに書いた出典つきの物だけ。食品ごとのプリン体の量は収録しない
 * (商用アプリへの収録を認める利用条件を原文で確かめられた表が無かったため。RELEASE.md 参照)。
 */
export interface Guide {
  value: number;
  unit: string;
  text: string;
  source: string;
  url: string;
}

export const GUIDE_URIC_LIMIT: Guide = {
  value: 7.0,
  unit: 'mg/dL',
  text: '男女ともに血清尿酸値が7.0mg/dLを超えると、高尿酸血症と呼ばれます。',
  source: '公益財団法人 痛風・尿酸財団「血清尿酸値の正常値は？」',
  url: 'https://www.tufu.or.jp/gout/gout2/61',
};

export const GUIDE_PURINE: Guide = {
  value: 400,
  unit: 'mg',
  text: '『高尿酸血症・痛風の治療ガイドライン』の生活指導に、1日400mgを目安にしたプリン体の摂取制限が示されています。',
  source: '公益財団法人 痛風・尿酸財団「食品・飲料中のプリン体含有量」',
  url: 'https://www.tufu.or.jp/gout/gout4/447',
};

export const GUIDE_WATER: Guide = {
  value: 2000,
  unit: 'mL',
  text: '尿が1日2リットル以上になるのが理想で、少なくとも毎日2リットル以上の水分をとるように、とされています。',
  source: '公益財団法人 痛風・尿酸財団「日常注意するポイントは？」',
  url: 'https://www.tufu.or.jp/gout/gout2/65',
};

/** 食品ごとの量を調べるときの案内先(アプリには収録せず、外のページを開くだけ) */
export const FOOD_TABLE_LINK = {
  label: '痛風・尿酸財団「食品中のプリン体含有量 一覧表」',
  url: 'https://www.tufu.or.jp/gout/gout4/3220',
};

export const MEDICAL_NOTICE =
  'このアプリは記録のための道具です。診断・治療の判断はしません。薬の量や飲み方、目標の値は、必ず主治医・薬剤師の指示に従ってください。痛みが強いとき・いつもと違うときは医療機関に相談してください。';

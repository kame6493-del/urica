/** 日付は端末の暦日で 'YYYY-MM-DD'、時刻は 'HH:MM'。 */
export type DateStr = string;
export type TimeStr = string;

/** 検査の結果(血清尿酸値 mg/dL) */
export interface LabResult {
  id: string;
  date: DateStr;
  ua: number;
  note: string;
}

/** 飲んでいる薬。times はその薬を飲む時刻(通知にも使う) */
export interface Medicine {
  id: string;
  name: string;
  dose: string;
  times: TimeStr[];
  active: boolean;
}

/** 1回分の「飲んだ」印。date + medId + time で1つ */
export interface DoseLog {
  date: DateStr;
  medId: string;
  time: TimeStr;
  takenAt: string;
}

export interface Drink {
  id: string;
  kind: string;
  ml: number;
}

/** 自分で登録した食品(プリン体の量は利用者が自分で調べて入れる) */
export interface MyFood {
  id: string;
  name: string;
  mg: number;
  unit: string;
}

export interface FoodEntry {
  id: string;
  name: string;
  mg: number;
}

export interface DayLog {
  date: DateStr;
  waterMl: number;
  drinks: Drink[];
  foods: FoodEntry[];
}

export const SITES = [
  '右足の親指', '左足の親指', '右足の甲', '左足の甲', '右足首', '左足首',
  '右ひざ', '左ひざ', '右かかと', '左かかと', '手・指', 'その他',
] as const;

/** 痛風発作 */
export interface Attack {
  id: string;
  start: DateStr;
  end: DateStr | null;
  sites: string[];
  pain: number;
  note: string;
}

export interface Settings {
  /** 主治医と決めた目標。未設定は null(アプリから値を勧めない) */
  targetUa: number | null;
  /** 1日のプリン体の目安(mg)。既定は財団の解説にある 400 */
  purineGoal: number;
  /** 1日の水分の目安(mL)。既定は財団の解説にある 2,000 */
  waterGoal: number;
  /** 通知: 無料は1日1回、完全版は薬ごとの時刻 */
  remindOn: boolean;
  remindTime: TimeStr;
  perDoseRemind: boolean;
  /** 次の検査日の前日に知らせる(完全版) */
  nextLab: DateStr | null;
  labRemind: boolean;
  acceptedNotice: boolean;
}

export interface AppData {
  version: 1;
  labs: LabResult[];
  meds: Medicine[];
  doses: DoseLog[];
  days: Record<DateStr, DayLog>;
  attacks: Attack[];
  myFoods: MyFood[];
  settings: Settings;
}

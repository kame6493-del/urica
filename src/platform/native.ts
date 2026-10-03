import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { PlannedNotice } from '../domain/notify';
import { allNoticeIds } from '../domain/notify';

const native = Capacitor.isNativePlatform();

/** 通知を全部取り消してから、計画どおりに予約し直す。許可されなかったら false */
export async function applyNotices(plan: PlannedNotice[]): Promise<boolean> {
  if (!native) return true;
  try {
    await LocalNotifications.cancel({ notifications: allNoticeIds().map((id) => ({ id })) });
    if (!plan.length) return true;
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return false;
    await LocalNotifications.schedule({
      notifications: plan.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        schedule: p.daily
          ? { on: { hour: p.daily.hour, minute: p.daily.minute }, repeats: true, allowWhileIdle: true }
          : { at: atOf(p.once!), allowWhileIdle: true },
      })),
    });
    return true;
  } catch (e) {
    console.error('[urica] notices', e);
    return false;
  }
}

function atOf(o: { date: string; hour: number; minute: number }): Date {
  const [y, m, d] = o.date.split('-').map(Number);
  return new Date(y, m - 1, d, o.hour, o.minute);
}

/** 文字のファイルを渡す。端末では共有シート(メール・ファイル保存・AirDrop 等)、ブラウザではダウンロード */
export async function shareTextFile(fileName: string, text: string, mime: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (native) {
    const res = await Filesystem.writeFile({ path: fileName, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    try {
      await Share.share({ title: fileName, files: [res.uri] });
      return 'shared';
    } catch (e) {
      if (String((e as Error)?.message ?? e).toLowerCase().includes('cancel')) return 'cancelled';
      throw e;
    }
  }
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return 'downloaded';
}

/** 外のページ(出典)を開く。端末ではブラウザが開く */
export function openExternal(url: string) {
  window.open(url, '_blank', 'noopener');
}

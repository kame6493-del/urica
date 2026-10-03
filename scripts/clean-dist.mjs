// この環境の Node(Windows)は fs.rmSync / cpSync の再帰処理で、例外を出さずに exit 127 で落ちる。
// Vite も中身の残った出力先を空にする所で同じ落ち方をするため、ビルドの前に1ファイルずつ消しておく。
// 使い方: node scripts/clean-dist.mjs [フォルダ名(既定 dist)]
import { existsSync, readdirSync, rmdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

function remove(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) remove(p);
    else unlinkSync(p);
  }
  rmdirSync(dir);
}

const target = process.argv[2] || 'dist';
if (existsSync(target)) remove(target);

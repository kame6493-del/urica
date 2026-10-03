import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// 見本の記録(?demo=1)は開発サーバーと E2E 用ビルドだけ。製品ビルドでは import ごと消える
if (import.meta.env.DEV || import.meta.env.VITE_MOCK_BILLING === '1') {
  const params = new URLSearchParams(location.search);
  // 見本を書き終えてから描く(待たないと、空の記録を先に読んでしまう)
  if (params.get('demo') === '1') await (await import('./dev/demo')).installDemo(params);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

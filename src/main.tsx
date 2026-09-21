import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@app/App';
import '@shared/styles/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html.');

function render(root: HTMLElement): void {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Development-only mock sockets. The dynamic import sits behind a build-time constant,
// so production bundles never include the mock layer.
if (import.meta.env.DEV && import.meta.env.VITE_MOCK_SOCKETS === 'true') {
  void import('@shared/websocket/mock')
    .then(({ installMockSockets }) => installMockSockets())
    .finally(() => render(container));
} else {
  render(container);
}

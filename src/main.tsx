import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import './index.css';

// Filter benign Firestore offline status messages from triggering false positive error reports
const origError = console.error;
console.error = (...args: unknown[]) => {
  const str = args.map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.message : '')).join(' ');
  if (
    str.includes('Could not reach Cloud Firestore backend') ||
    str.includes("Backend didn't respond within 10 seconds") ||
    str.includes('the client is offline')
  ) {
    console.warn('[Firestore Notice]', ...args);
    return;
  }
  origError.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


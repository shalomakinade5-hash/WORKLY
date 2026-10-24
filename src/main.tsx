import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import { initializeServiceWorker } from './services/pwa.ts';
import './index.css';

// Initialize service worker once at startup
initializeServiceWorker();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

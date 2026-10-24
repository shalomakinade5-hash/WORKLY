import { registerSW } from 'virtual:pwa-register';

let updateServiceWorkerFn: ((reloadPage?: boolean) => Promise<void>) | undefined;

export function initializeServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  updateServiceWorkerFn = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('workly:sw-update-available'));
    },
    onOfflineReady() {
      console.log('Workly offline shell cached and ready.');
    },
    onRegisterError(error) {
      console.warn('Workly service worker registration error:', error);
    }
  });
}

export async function applyServiceWorkerUpdate(): Promise<void> {
  if (updateServiceWorkerFn) {
    await updateServiceWorkerFn(true);
  } else {
    window.location.reload();
  }
}

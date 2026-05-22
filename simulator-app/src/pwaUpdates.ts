import { registerSW } from 'virtual:pwa-register';

const CRITICAL_FLOW_GRACE_MS = 90_000;
const DEFERRED_RELOAD_RETRY_MS = 5_000;
const UPDATE_CHECK_INTERVAL_MS = 15 * 60_000;

export function initializePwaUpdates(): void {
  if (!('serviceWorker' in navigator)) return;

  let pendingReload = false;
  let reloaded = false;

  const reloadWhenSafe = () => {
    if (reloaded) return;
    if (isCriticalReturnFlowActive()) {
      pendingReload = true;
      window.setTimeout(reloadWhenSafe, DEFERRED_RELOAD_RETRY_MS);
      return;
    }

    reloaded = true;
    window.location.reload();
  };

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      reloadWhenSafe();
    },
    onOfflineReady() {},
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const checkForUpdate = () => {
        if (!navigator.onLine) return;
        void registration.update();
      };

      checkForUpdate();
      window.addEventListener('online', checkForUpdate);
      window.addEventListener('focus', checkForUpdate);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });
      window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
    },
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    reloadWhenSafe();
  });

  window.addEventListener('online', () => {
    void updateSW();
    if (pendingReload) reloadWhenSafe();
  });
  window.addEventListener('focus', () => {
    if (pendingReload) reloadWhenSafe();
  });
}

function isCriticalReturnFlowActive(): boolean {
  const url = new URL(window.location.href);
  const hasMagicLinkToken = url.searchParams.has('token');
  const isCheckoutReturn = url.searchParams.get('checkout') === 'success';

  if (!hasMagicLinkToken && !isCheckoutReturn) return false;

  const storageKey = 'pwa-critical-flow:first-seen';
  const now = Date.now();
  const firstSeen = Number(window.sessionStorage.getItem(storageKey) ?? now);
  window.sessionStorage.setItem(storageKey, String(firstSeen));

  return now - firstSeen < CRITICAL_FLOW_GRACE_MS;
}

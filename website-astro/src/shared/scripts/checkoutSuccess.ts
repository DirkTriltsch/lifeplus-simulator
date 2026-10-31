// Erfolgsseite: post-checkout einmal aufrufen (Session anlegen), dann
// /api/me pollen, bis das bezahlte Entitlement aktiv ist.
import { clearCheckoutReference, readCheckoutReference } from './checkoutReference';

type View = 'pending' | 'ready' | 'error';

const POLL_MS = 2000;
const POLL_MAX_MS = 60_000;

interface MeEntitlement {
  plan?: string;
  active?: boolean;
  source?: string;
}

/** Bezahltes Entitlement (kein Free/Trial). */
export function isPaidEntitlement(e: MeEntitlement | undefined | null): boolean {
  return Boolean(e && e.active && e.plan !== 'free' && (e.source === 'subscription' || e.source === 'one_shot_purchase'));
}

export function setupCheckoutSuccess(): void {
  const root = document.querySelector<HTMLElement>('[data-checkout-success]');
  if (!root) return;
  const apiBase = (root.dataset.apiBase ?? '').replace(/\/$/, '');
  const api = (p: string) => (apiBase ? apiBase + p : p);
  const show = (v: View) => {
    root.querySelectorAll<HTMLElement>('[data-view]').forEach((el) => (el.hidden = el.dataset.view !== v));
  };
  const retry = root.querySelector<HTMLButtonElement>('[data-retry]');
  const emailEl = root.querySelector<HTMLElement>('[data-email]');

  const ref = readCheckoutReference();
  if (emailEl && ref?.email) emailEl.textContent = ref.email;

  async function me(): Promise<boolean> {
    try {
      const res = await fetch(api('/api/me'), { credentials: 'include' });
      if (!res.ok) return false;
      const data = (await res.json()) as { entitlements?: MeEntitlement[] };
      return (data.entitlements ?? []).some(isPaidEntitlement);
    } catch {
      return false;
    }
  }

  async function postCheckout(): Promise<void> {
    if (!ref) return;
    try {
      await fetch(api('/api/billing/post-checkout'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ checkoutEmail: ref.email, intentId: ref.intentId, transactionId: ref.transactionId }),
      });
    } catch (err) {
      console.warn('[success] post-checkout unreachable:', err);
    }
  }

  async function run(): Promise<void> {
    show('pending');
    await postCheckout();
    const start = Date.now();
    while (Date.now() - start < POLL_MAX_MS) {
      if (await me()) {
        clearCheckoutReference();
        show('ready');
        return;
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    show('error');
  }

  retry?.addEventListener('click', () => void run());
  void run();
}

// Haelt die Referenz auf den gerade bezahlten Checkout bis zur
// Erfolgsseite im sessionStorage (Tab-lokal, wird beim Schliessen des Tabs
// verworfen). Enthaelt keine Geheimnisse: Intent-ID und Paddle-Transaktions-ID
// sind ohne gueltigen Paddle-Zahlungsstatus wertlos (post-checkout prueft
// serverseitig bei Paddle).

export interface CheckoutReference {
  intentId: string;
  transactionId: string;
  email: string;
}

export const CHECKOUT_REFERENCE_KEY = 'lf360.checkout.ref';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function storeCheckoutReference(ref: CheckoutReference, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(CHECKOUT_REFERENCE_KEY, JSON.stringify(ref));
  } catch {
    /* Storage blockiert (z. B. Privatmodus): Erfolgsseite faellt auf Hinweis zurueck */
  }
}

export function readCheckoutReference(storage: StorageLike | null = defaultStorage()): CheckoutReference | null {
  try {
    const raw = storage?.getItem(CHECKOUT_REFERENCE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<CheckoutReference>;
    if (
      typeof data.intentId === 'string' && data.intentId &&
      typeof data.transactionId === 'string' && data.transactionId &&
      typeof data.email === 'string' && data.email
    ) {
      return { intentId: data.intentId, transactionId: data.transactionId, email: data.email };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearCheckoutReference(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.removeItem(CHECKOUT_REFERENCE_KEY);
  } catch {
    /* ignorieren */
  }
}

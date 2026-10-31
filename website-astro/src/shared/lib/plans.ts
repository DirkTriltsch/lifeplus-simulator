// Plan-Katalog fuer Preisseite und Checkout (Anzeige-Werte).
//
// WICHTIG: Die tatsaechlich abgerechneten Betraege kommen immer aus dem
// Paddle-Katalog (Price-IDs in brand.yaml / Backend-Env). Diese Werte dienen
// nur der Anzeige vor der serverseitigen Paddle-Preisvorschau
// (/api/billing/preview-pricing) und muessen mit dem Paddle-Katalog
// uebereinstimmen. Aenderst du einen Preis in Paddle, aendere ihn hier.
//
// Preise sind NETTO (EUR, in Cent). Brutto = netto + 19 % USt. (DE). Die
// finale Steuer berechnet Paddle nach Land und USt-IdNr.

export type PlanId = 'monthly' | 'halfyear' | 'yearly';

export const PLAN_IDS: readonly PlanId[] = ['monthly', 'halfyear', 'yearly'];

export const VAT_RATE_DE = 0.19;

export interface PlanCatalogEntry {
  id: PlanId;
  /** Kurzname, z. B. "1 Monat". */
  name: string;
  /** Kurzlabel fuer Buttons, z. B. "Monats-Plan". */
  checkoutLabel: string;
  /** Laufzeit in Monaten. */
  months: number;
  /** "pro Monat" / "pro 6 Monate" / "pro Jahr". */
  interval: string;
  /** "/ Monat" / "/ 6 Mo." / "/ Jahr". */
  cycle: string;
  /** Netto je Abrechnungsperiode in Cent. */
  netCents: number;
}

export const PLAN_CATALOG: Record<PlanId, PlanCatalogEntry> = {
  monthly: {
    id: 'monthly',
    name: '1 Monat',
    checkoutLabel: 'Monats-Plan',
    months: 1,
    interval: 'pro Monat',
    cycle: '/ Monat',
    netCents: 1495,
  },
  halfyear: {
    id: 'halfyear',
    name: '6 Monate',
    checkoutLabel: 'Halbjahres-Plan',
    months: 6,
    interval: 'pro 6 Monate',
    cycle: '/ 6 Monate',
    netCents: 8223,
  },
  yearly: {
    id: 'yearly',
    name: '12 Monate',
    checkoutLabel: 'Jahres-Plan',
    months: 12,
    interval: 'pro Jahr',
    cycle: '/ Jahr',
    netCents: 14950,
  },
};

/** Rang fuer "Downgrade nicht moeglich"-Logik (hoeher = laengere Laufzeit). */
export const PLAN_RANK: Record<PlanId, number> = { monthly: 1, halfyear: 2, yearly: 3 };

export function isPlanId(value: unknown): value is PlanId {
  return value === 'monthly' || value === 'halfyear' || value === 'yearly';
}

export interface PlanAmounts {
  netCents: number;
  vatCents: number;
  grossCents: number;
}

/** Brutto/USt. fuer Deutschland. Rundung auf ganze Cent (nur Anzeige). */
export function amountsFor(plan: PlanId): PlanAmounts {
  const netCents = PLAN_CATALOG[plan].netCents;
  const vatCents = Math.round(netCents * VAT_RATE_DE);
  return { netCents, vatCents, grossCents: netCents + vatCents };
}

/** Formatiert Cent als "14,95 €" (de-DE, fester Aufbau, ohne Intl-Abhaengigkeit). */
export function formatEur(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const euros = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fraction = (abs % 100).toString().padStart(2, '0');
  return `${sign}${euros},${fraction} €`;
}

/** Netto pro Monat (Anzeige-Hilfe fuer Mehrmonatsplaene), in Cent, gerundet. */
export function netPerMonthCents(plan: PlanId): number {
  const entry = PLAN_CATALOG[plan];
  return Math.round(entry.netCents / entry.months);
}

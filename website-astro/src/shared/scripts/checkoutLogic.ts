export interface RenewalSource {
  next_billed_at?: string | null;
  nextBilledAt?: string | null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renewalLabelFromSource(
  source: RenewalSource | null | undefined,
  periodMonths: number,
  now: Date = new Date(),
): string {
  const paddleDate = parsePaddleDate(source?.next_billed_at ?? source?.nextBilledAt ?? null);
  return formatGermanDate(paddleDate ?? addMonths(now, periodMonths));
}

function parsePaddleDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addMonths(value: Date, months: number): Date {
  const next = new Date(value.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
}

function formatGermanDate(value: Date): string {
  return value.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ── Preis-Vorschau (rein, ohne DOM) ────────────────────────────

export const EU_REVERSE_CHARGE_COUNTRIES: ReadonlySet<string> = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR',
  'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE',
  'SI', 'SK',
]);

export const VAT_ID_RX = /^[A-Z]{2}[A-Z0-9]{8,12}$/;

/** Entfernt Leerzeichen und macht die USt-IdNr gross. */
export function normalizeVatId(raw: string): string {
  return raw.replace(/\s/g, '').toUpperCase();
}

/**
 * Reverse-Charge-Vorschau: nur wenn Rechnungsland und USt-IdNr-Land
 * uebereinstimmen und ein EU-Land ausserhalb DE sind. Die endgueltige
 * Pruefung (VIES) macht Paddle im Zahlungsfeld.
 */
export function isReverseChargePreview(countryCode: string, vatId: string | null): boolean {
  if (!vatId || !VAT_ID_RX.test(vatId)) return false;
  const country = countryCode.toUpperCase();
  return vatId.slice(0, 2) === country && EU_REVERSE_CHARGE_COUNTRIES.has(country);
}

/** Paddle liefert Betraege als Minor-Unit-Strings ("1495"). */
export function minorToCents(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : null;
  if (typeof value !== 'string' || !/^-?\d+$/.test(value)) return null;
  return Number(value);
}

export interface PaddleTotalsLike {
  subtotal?: string;
  discount?: string;
  tax?: string;
  total?: string;
}

export interface DisplayTotals {
  /** Netto nach Rabatt. */
  netCents: number;
  discountCents: number;
  taxCents: number;
  /** Heute faellig. */
  grossCents: number;
}

/**
 * Berechnet die angezeigten Summen. Mit Paddle-Totals (Server-Vorschau) werden
 * diese verwendet, sonst die Katalog-Werte (DE, 19 %). Bei Reverse-Charge-
 * Vorschau entfaellt die USt. und der Betrag ist netto.
 */
export function displayTotals(
  fallback: { netCents: number; vatCents: number; grossCents: number },
  totals: PaddleTotalsLike | null | undefined,
  reverseCharge: boolean,
): DisplayTotals {
  const subtotal = minorToCents(totals?.subtotal);
  const discount = minorToCents(totals?.discount) ?? 0;
  const tax = minorToCents(totals?.tax);
  const total = minorToCents(totals?.total);

  if (subtotal === null || tax === null || total === null) {
    // Keine (vollstaendige) Server-Vorschau: Katalogwerte.
    return reverseCharge
      ? { netCents: fallback.netCents, discountCents: 0, taxCents: 0, grossCents: fallback.netCents }
      : { netCents: fallback.netCents, discountCents: 0, taxCents: fallback.vatCents, grossCents: fallback.grossCents };
  }

  const netAfterDiscount = Math.max(0, subtotal - discount);
  if (reverseCharge) {
    return { netCents: netAfterDiscount, discountCents: discount, taxCents: 0, grossCents: netAfterDiscount };
  }
  return { netCents: netAfterDiscount, discountCents: discount, taxCents: tax, grossCents: total };
}

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

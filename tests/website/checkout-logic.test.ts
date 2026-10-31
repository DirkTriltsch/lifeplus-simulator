import { describe, expect, it } from 'vitest';
import {
  displayTotals,
  escapeHtml,
  isReverseChargePreview,
  minorToCents,
  normalizeVatId,
  renewalLabelFromSource,
} from '../../website-astro/src/shared/scripts/checkoutLogic';

describe('checkout logic', () => {
  it('escapes single quotes for attribute-safe HTML snippets', () => {
    expect(escapeHtml(`Dao's <Plan> & "Flow"`)).toBe('Dao&#39;s &lt;Plan&gt; &amp; &quot;Flow&quot;');
  });

  it('uses Paddle next billing date when present', () => {
    expect(
      renewalLabelFromSource({ next_billed_at: '2026-09-15T12:00:00Z' }, 1, new Date('2026-07-07T00:00:00Z')),
    ).toBe('15.09.2026');
  });

  it('falls back to runtime date plus plan period', () => {
    expect(
      renewalLabelFromSource(null, 6, new Date('2026-07-07T00:00:00Z')),
    ).toBe('07.01.2027');
  });
});

describe('checkout preview logic', () => {
  const fallback = { netCents: 1495, vatCents: 284, grossCents: 1779 };

  it('detects reverse charge only for matching non-DE EU country and VAT id', () => {
    expect(isReverseChargePreview('AT', 'ATU12345678')).toBe(true);
    expect(isReverseChargePreview('at', 'ATU12345678')).toBe(true);
    expect(isReverseChargePreview('DE', 'DE123456789')).toBe(false);
    expect(isReverseChargePreview('DE', 'ATU12345678')).toBe(false);
    expect(isReverseChargePreview('CH', 'CHE123456789')).toBe(false);
    expect(isReverseChargePreview('AT', null)).toBe(false);
    expect(isReverseChargePreview('AT', 'AT')).toBe(false);
  });

  it('normalizes VAT ids', () => {
    expect(normalizeVatId(' atu 1234 5678 ')).toBe('ATU12345678');
  });

  it('parses Paddle minor-unit strings', () => {
    expect(minorToCents('1495')).toBe(1495);
    expect(minorToCents('-300')).toBe(-300);
    expect(minorToCents('14.95')).toBeNull();
    expect(minorToCents(undefined)).toBeNull();
    expect(minorToCents(1495)).toBe(1495);
  });

  it('falls back to catalog amounts without server totals', () => {
    expect(displayTotals(fallback, null, false)).toEqual({
      netCents: 1495, discountCents: 0, taxCents: 284, grossCents: 1779,
    });
    expect(displayTotals(fallback, null, true)).toEqual({
      netCents: 1495, discountCents: 0, taxCents: 0, grossCents: 1495,
    });
  });

  it('uses Paddle totals and applies the discount to the net amount', () => {
    const totals = { subtotal: '1495', discount: '299', tax: '227', total: '1423' };
    expect(displayTotals(fallback, totals, false)).toEqual({
      netCents: 1196, discountCents: 299, taxCents: 227, grossCents: 1423,
    });
  });

  it('shows net as amount due on a reverse-charge preview', () => {
    const totals = { subtotal: '1495', discount: '0', tax: '284', total: '1779' };
    expect(displayTotals(fallback, totals, true)).toEqual({
      netCents: 1495, discountCents: 0, taxCents: 0, grossCents: 1495,
    });
  });

  it('ignores incomplete server totals', () => {
    expect(displayTotals(fallback, { subtotal: '1495' }, false).grossCents).toBe(1779);
  });
});

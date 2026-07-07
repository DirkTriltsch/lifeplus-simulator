import { describe, expect, it } from 'vitest';
import { escapeHtml, renewalLabelFromSource } from '../../website-astro/src/shared/scripts/checkoutLogic';

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

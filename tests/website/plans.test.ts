import { describe, expect, it } from 'vitest';
import {
  amountsFor,
  formatEur,
  isPlanId,
  netPerMonthCents,
  PLAN_CATALOG,
  PLAN_RANK,
} from '../../website-astro/src/shared/lib/plans';

describe('plan catalog', () => {
  it('computes gross from net with 19 % German VAT', () => {
    expect(amountsFor('monthly')).toEqual({ netCents: 1495, vatCents: 284, grossCents: 1779 });
    expect(amountsFor('halfyear')).toEqual({ netCents: 8223, vatCents: 1562, grossCents: 9785 });
    expect(amountsFor('yearly')).toEqual({ netCents: 14950, vatCents: 2841, grossCents: 17791 });
  });

  it('formats euro amounts in German notation', () => {
    expect(formatEur(1495)).toBe('14,95 €');
    expect(formatEur(14950)).toBe('149,50 €');
    expect(formatEur(123456)).toBe('1.234,56 €');
    expect(formatEur(-299)).toBe('-2,99 €');
    expect(formatEur(5)).toBe('0,05 €');
  });

  it('derives the monthly net equivalent', () => {
    expect(netPerMonthCents('monthly')).toBe(1495);
    expect(netPerMonthCents('halfyear')).toBe(1371);
    expect(netPerMonthCents('yearly')).toBe(1246);
  });

  it('keeps ranks ordered by term and recognises plan ids', () => {
    expect(PLAN_RANK.monthly).toBeLessThan(PLAN_RANK.halfyear);
    expect(PLAN_RANK.halfyear).toBeLessThan(PLAN_RANK.yearly);
    expect(isPlanId('yearly')).toBe(true);
    expect(isPlanId('weekly')).toBe(false);
    expect(Object.keys(PLAN_CATALOG)).toEqual(['monthly', 'halfyear', 'yearly']);
  });
});

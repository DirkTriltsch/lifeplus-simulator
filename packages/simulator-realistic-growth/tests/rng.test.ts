import { describe, expect, it } from 'vitest';
import { createRng } from '../src';

describe('createRng', () => {
  it('liefert reproduzierbare Zahlenfolge bei gleichem Seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const sequenceA = Array.from({ length: 5 }, () => a.next());
    const sequenceB = Array.from({ length: 5 }, () => b.next());

    expect(sequenceA).toEqual(sequenceB);
  });

  it('liefert unterschiedliche Folgen bei verschiedenen Seeds', () => {
    const a = createRng(1);
    const b = createRng(2);

    expect(a.next()).not.toBe(b.next());
  });

  it('liefert Werte im Bereich [0, 1)', () => {
    const rng = createRng(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

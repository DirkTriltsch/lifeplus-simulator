/**
 * Seeded Pseudo-Random Number Generator (Mulberry32).
 *
 * Verwenden statt Math.random(), damit Realistic-Growth-Strategien
 * reproduzierbare Ergebnisse liefern.
 */

export interface Rng {
  /** Liefert eine Zahl in [0, 1). */
  next(): number;
}

export function createRng(seed: number): Rng {
  let state = (seed | 0) || 1;
  return {
    next() {
      state = (state + 0x6d2b79f5) | 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

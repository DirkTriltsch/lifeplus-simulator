import type { Rng } from '../rng';

export interface DirichletOptions {
  varianceFactor?: number;
  seed?: number;
}

/**
 * Liefert n Gewichte, die zusammen 1 ergeben.
 *
 * - varianceFactor = 0: alle gleich (1/n).
 * - varianceFactor = 1: maximale Streuung (Exponential-Dirichlet).
 * - Werte dazwischen: lineare Interpolation zwischen Gleich- und Exponentialverteilung.
 */
export function dirichletWeights(
  n: number,
  varianceFactor: number,
  rng: Rng,
): number[] {
  if (n <= 0) return [];
  if (varianceFactor <= 0) {
    return Array.from({ length: n }, () => 1 / n);
  }

  const v = Math.min(1, varianceFactor);
  const uniformPart = (1 - v) / n;
  const exponential = Array.from({ length: n }, () =>
    -Math.log(Math.max(1e-10, rng.next())),
  );
  const expSum = exponential.reduce((a, b) => a + b, 0) || 1;

  return exponential.map((x) => uniformPart + v * (x / expSum));
}

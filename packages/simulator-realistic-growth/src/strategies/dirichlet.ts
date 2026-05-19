import type { GrowthModulator, Leg } from '@mlm/simulator-core';
import { createRng, type Rng } from '../rng';

const DEFAULT_VARIANCE = 0.4;
const DEFAULT_SEED = 42;

export interface DirichletOptions {
  varianceFactor?: number;
  seed?: number;
}

/**
 * Bricht die Standard-Gleichverteilung pro Jahr auf eine zieltreue Zufallsverteilung.
 *
 * - Level 0 bleibt symmetrisch: jeder direkte Member ist eine Wurzel eines Beins.
 * - Level 1+ wird pro Jahr neu nach `dirichletWeights(varianceFactor)` aufgeteilt.
 * - Die Summe pro Ebene bleibt exakt erhalten.
 */
export function createDirichletStrategy(
  options: DirichletOptions = {},
): GrowthModulator {
  const variance = clamp(options.varianceFactor ?? DEFAULT_VARIANCE, 0, 1);
  const seed = options.seed ?? DEFAULT_SEED;

  let rng = createRng(seed);
  let weights: number[] = [];
  let cacheKey = '';

  return {
    id: 'dirichlet',
    reset() {
      rng = createRng(seed);
      weights = [];
      cacheKey = '';
    },
    splitLegs({ membersByLevel, shoppersByLevel, directLegs, year, legs }): Leg[] {
      const legCount = Math.round(directLegs);
      if (legCount <= 0) return [];

      const nextKey = `${year}:${legCount}`;
      if (nextKey !== cacheKey) {
        weights = dirichletWeights(legCount, variance, rng);
        cacheKey = nextKey;
      }

      const wurzelShare = 1 / legCount;

      if (legs) {
        return redistributeExistingLegs(legs, weights);
      }

      return Array.from({ length: legCount }, (_, i) => ({
        id: `leg-${i + 1}`,
        membersByLevel: membersByLevel.map((v, level) =>
          level === 0 ? v * wurzelShare : v * weights[i],
        ),
        shoppersByLevel: shoppersByLevel.map((v, level) =>
          level === 0 ? v * wurzelShare : v * weights[i],
        ),
      }));
    },
  };
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function redistributeExistingLegs(
  legs: ReadonlyArray<Leg>,
  weights: number[],
): Leg[] {
  const next = legs.map((leg) => ({
    id: leg.id,
    membersByLevel: [...leg.membersByLevel],
    shoppersByLevel: [...leg.shoppersByLevel],
  }));

  redistributeLevels(next, 'membersByLevel', weights);
  redistributeLevels(next, 'shoppersByLevel', weights);

  return next;
}

function redistributeLevels(
  legs: Leg[],
  key: 'membersByLevel' | 'shoppersByLevel',
  weights: number[],
): void {
  const maxLevels = Math.max(0, ...legs.map((leg) => leg[key].length));
  for (let level = 1; level < maxLevels; level++) {
    const candidates = legs
      .map((leg, index) => ({ leg, index, value: leg[key][level] ?? 0 }))
      .filter((entry) => entry.value > 0);
    const total = candidates.reduce((sum, entry) => sum + entry.value, 0);
    const weightTotal =
      candidates.reduce((sum, entry) => sum + (weights[entry.index] ?? 0), 0) ||
      1;

    for (const { leg, index } of candidates) {
      leg[key][level] = total * ((weights[index] ?? 0) / weightTotal);
    }
  }
}

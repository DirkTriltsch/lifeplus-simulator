import type { GrowthModulator, Leg } from '@mlm/simulator-core';
import { createRng, type Rng } from '../rng';

const DEFAULTS = {
  momentumStrength: 0.6,
  randomStrength: 0.3,
  reversionStrength: 0.2,
  seed: 42,
};

export interface MomentumOptions {
  /** Hot-Hand-Staerke (0..1). Wie stark Vorjahreserfolg ins naechste Jahr wirkt. */
  momentumStrength?: number;
  /** Zufallsamplitude (0..1). */
  randomStrength?: number;
  /** Mean-Reversion-Staerke (0..1). Daempft Spitzen ab Jahr 3. */
  reversionStrength?: number;
  /** Seed fuer Reproduzierbarkeit. */
  seed?: number;
}

/**
 * Momentum-Strategie mit Hot-Hand und Reversion.
 *
 * Pro Jahr wird der Score eines Beins gebildet als:
 *
 *   score_i = base
 *           + momentumStrength * lastWeights_i      (Hot-Hand)
 *           + randomStrength   * noise_i            (Zufall)
 *           - reversionStrength * dominancePenalty  (Mean-Reversion ab Jahr 3)
 *
 * Anschliessend werden die scores zu Gewichten normalisiert. Die Aggregate
 * (membersByLevel, shoppersByLevel) werden mit diesen Gewichten asymmetrisch
 * auf die Beine verteilt; Level 0 bleibt symmetrisch.
 */
export function createMomentumStrategy(
  options: MomentumOptions = {},
): GrowthModulator {
  const momentumStrength = options.momentumStrength ?? DEFAULTS.momentumStrength;
  const randomStrength = options.randomStrength ?? DEFAULTS.randomStrength;
  const reversionStrength =
    options.reversionStrength ?? DEFAULTS.reversionStrength;
  const seed = options.seed ?? DEFAULTS.seed;

  let rng = createRng(seed);
  let lastWeights: number[] = [];
  let lastLegCount = 0;
  let lastYear = 0;

  return {
    id: 'momentum',
    reset() {
      rng = createRng(seed);
      lastWeights = [];
      lastLegCount = 0;
      lastYear = 0;
    },
    splitLegs({ membersByLevel, shoppersByLevel, directLegs, year, legs }): Leg[] {
      const legCount = Math.round(directLegs);
      if (legCount <= 0) return [];

      if (legCount !== lastLegCount) {
        lastWeights = Array.from({ length: legCount }, () => 1 / legCount);
        lastLegCount = legCount;
        lastYear = 0;
      }

      if (year !== lastYear) {
        lastWeights = computeMomentumWeights(
          legCount,
          lastWeights,
          year,
          momentumStrength,
          randomStrength,
          reversionStrength,
          rng,
        );
        lastYear = year;
      }

      const wurzelShare = 1 / legCount;

      if (legs) {
        return redistributeExistingLegs(legs, lastWeights);
      }

      return Array.from({ length: legCount }, (_, i) => ({
        id: `leg-${i + 1}`,
        membersByLevel: membersByLevel.map((v, level) =>
          level === 0 ? v * wurzelShare : v * lastWeights[i],
        ),
        shoppersByLevel: shoppersByLevel.map((v, level) =>
          level === 0 ? v * wurzelShare : v * lastWeights[i],
        ),
      }));
    },
  };
}

export function computeMomentumWeights(
  legCount: number,
  previous: number[],
  year: number,
  momentumStrength: number,
  randomStrength: number,
  reversionStrength: number,
  rng: Rng,
): number[] {
  const base = 1 / legCount;
  const reversionActive = year >= 3 ? reversionStrength : 0;

  const scores = previous.map((prev) => {
    const dominancePenalty = Math.max(0, prev - base);
    const noise = -Math.log(Math.max(1e-10, rng.next()));
    const score =
      base +
      momentumStrength * prev +
      randomStrength * noise * base -
      reversionActive * dominancePenalty;
    return Math.max(0, score);
  });

  const sum = scores.reduce((a, b) => a + b, 0) || 1;
  return scores.map((s) => s / sum);
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

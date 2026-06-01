import type { Rng } from '../rng';

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

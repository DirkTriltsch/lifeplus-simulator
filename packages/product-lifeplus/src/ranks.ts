/**
 * Rang- und Qualifikationsbestimmung.
 *
 * Der Verguetungsplan verlangt AV, QGV, QL und fuer Phase 3 bestimmte
 * Rang-Beine. Die App simuliert weiterhin aggregiert; die Anzahl Bronze- und
 * Diamond-Beine kommt daher aus einer strukturellen Schaetzung der Engine.
 */

import { PHASE2_RANKS, PHASE3_RANKS, PRELIM_RANKS } from './constants';

export interface RankInputs {
  /** Eigenes Aktivitaetsvolumen in IP pro Monat */
  av: number;
  /** Qualifiziertes Gruppenvolumen in IP pro Monat */
  qgv: number;
  /** Anzahl qualifizierter Beine */
  qualifiedLegs: number;
  /** Anzahl Beine mit mindestens Bronze-Rang */
  bronzeLegs: number;
  /** Anzahl Beine mit mindestens Diamond-Rang */
  diamondLegs: number;
}

export interface RankResult {
  name: string;
  phase2Rate: number;
  phase3Rate: number;
  qualifiedForPhase2: boolean;
  qualifiedForPhase3: boolean;
}

export function determineRank(inputs: RankInputs): RankResult {
  const { av, qgv, qualifiedLegs, bronzeLegs, diamondLegs } = inputs;

  let name = 'Member';
  let phase2Rate = 0;

  for (const rank of PRELIM_RANKS) {
    if (av >= rank.minAV && qgv >= rank.minQGV && qualifiedLegs >= rank.minQL) {
      name = rank.name;
    }
  }

  for (const rank of PHASE2_RANKS) {
    if (av >= rank.minAV && qgv >= rank.minQGV && qualifiedLegs >= rank.minQL) {
      name = rank.name;
      phase2Rate = rank.rate;
    }
  }

  let phase3Rate = 0;
  for (const rank of PHASE3_RANKS) {
    const hasVolume = av >= rank.minAV && qgv >= rank.minQGV;
    const additionalBronzeLegs = Math.max(0, bronzeLegs - diamondLegs);
    const hasLegs =
      qualifiedLegs >= rank.minQL &&
      diamondLegs >= rank.minDiamondLegs &&
      additionalBronzeLegs >= rank.minBronzeLegs;

    if (phase2Rate >= 0.12 && hasVolume && hasLegs) {
      name = rank.name;
      phase3Rate = rank.cumulativeRate;
    }
  }

  if (
    phase2Rate >= 0.12 &&
    av >= 150 &&
    qgv >= 25000 &&
    qualifiedLegs >= 12 &&
    diamondLegs >= 4
  ) {
    name = `${Math.floor(diamondLegs)}*Diamond`;
    phase3Rate = 0.08;
  }

  return {
    name,
    phase2Rate,
    phase3Rate,
    qualifiedForPhase2: phase2Rate > 0,
    qualifiedForPhase3: phase3Rate > 0,
  };
}

export function estimateLegRank(qgv: number, qualifiedLegs: number): string {
  let name = 'Member';

  for (const rank of PRELIM_RANKS) {
    if (qgv >= rank.minQGV && qualifiedLegs >= rank.minQL) {
      name = rank.name;
    }
  }

  for (const rank of PHASE2_RANKS) {
    if (qgv >= rank.minQGV && qualifiedLegs >= rank.minQL) {
      name = rank.name;
    }
  }

  return name;
}

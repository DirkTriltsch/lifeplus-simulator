/**
 * Verguetungsberechnung fuer einen Monat.
 */

import {
  PHASE1,
  PHASE1_QUALIFICATION,
  REFERRAL_THRESHOLD_IP,
} from './constants';
import type { NetworkSnapshot } from '@mlm/simulator-core';
import {
  determineEffectiveAV,
  determineRank,
  estimateLegRank,
  type RankResult,
} from './ranks';
import {
  allocatePhase2SlotRates,
  allocatePhase3SlotRates,
  normalizeRankName,
  phase2SlotCount,
  phase3SlotCount,
} from './payout-slots';

export interface CompensationInputs {
  /** Eigenes Aktivitaetsvolumen des Users in IP pro Monat */
  personalMonthlyIP: number;
  /** Monatlicher Umsatz pro Member in IP */
  memberMonthlyIP: number;
  /** Monatlicher Umsatz pro Shopper in IP */
  shopperMonthlyIP: number;
}

export interface MonthlyCompensation {
  phase1IP: number;
  phase2IP: number;
  phase3IP: number;
  totalIP: number;
  rank: RankResult;
  av: number;
  qgv: number;
  bronzeLegs: number;
  diamondLegs: number;
  networkSize: number;
  members: number;
  shoppers: number;
  directLegs: number;
}

function calculatePhase1(
  snapshot: NetworkSnapshot,
  inputs: CompensationInputs,
  qualifiedLegs: number,
): number {
  const { personalMonthlyIP, memberMonthlyIP, shopperMonthlyIP } = inputs;

  const memberReferralIP = Math.min(memberMonthlyIP, REFERRAL_THRESHOLD_IP);
  const memberShopDiscountIP = Math.max(
    0,
    memberMonthlyIP - REFERRAL_THRESHOLD_IP,
  );

  let total = 0;

  for (let level = 1; level <= 3; level++) {
    const idx = level - 1;
    const qualification =
      PHASE1_QUALIFICATION[`level${level}` as keyof typeof PHASE1_QUALIFICATION];

    if (
      personalMonthlyIP < qualification.minAV ||
      qualifiedLegs < qualification.minQL
    ) {
      continue;
    }

    const memberCount = snapshot.membersByLevel[idx] ?? 0;
    const shopperCount = snapshot.shoppersByLevel[idx] ?? 0;
    const sRate = PHASE1.shop[`level${level}` as keyof typeof PHASE1.shop];
    const rRate =
      PHASE1.referral[`level${level}` as keyof typeof PHASE1.referral];
    const sdRate =
      PHASE1.shopDiscount[`level${level}` as keyof typeof PHASE1.shopDiscount];

    total += shopperCount * shopperMonthlyIP * sRate;
    total += memberCount * memberReferralIP * rRate;
    total += memberCount * memberShopDiscountIP * sdRate;
  }

  return total;
}

function calculateCompressedPhase2(
  snapshot: NetworkSnapshot,
  inputs: CompensationInputs,
  rank: RankResult,
): number {
  if (phase2SlotCount(rank.name) <= 0) return 0;

  return calculateCompressedDeepBonus(snapshot, inputs, rank.name, allocatePhase2SlotRates);
}

function calculateCompressedPhase3(
  snapshot: NetworkSnapshot,
  inputs: CompensationInputs,
  rank: RankResult,
): number {
  if (phase3SlotCount(rank.name) <= 0) return 0;

  return calculateCompressedDeepBonus(snapshot, inputs, rank.name, allocatePhase3SlotRates);
}

function calculateCompressedDeepBonus(
  snapshot: NetworkSnapshot,
  inputs: CompensationInputs,
  ownRank: string,
  allocate: (ranksInPayoutOrder: string[]) => number[],
): number {
  const legs =
    snapshot.legs.length > 0
      ? snapshot.legs
      : [
          {
            id: 'aggregate',
            membersByLevel: snapshot.membersByLevel,
            shoppersByLevel: snapshot.shoppersByLevel,
          },
        ];
  let total = 0;

  for (const leg of legs) {
    const maxLevel = Math.max(
      leg.membersByLevel.length,
      leg.shoppersByLevel.length,
    );

    for (let orderLevel = 3; orderLevel < maxLevel; orderLevel++) {
      const volume =
        (leg.membersByLevel[orderLevel] ?? 0) * inputs.memberMonthlyIP +
        (leg.shoppersByLevel[orderLevel] ?? 0) * inputs.shopperMonthlyIP;
      if (volume <= 0) continue;

      const closerRanks = estimateCloserDeepRanks(leg, inputs, orderLevel);
      const rates = allocate([...closerRanks, ownRank]);
      total += volume * rates[rates.length - 1];
    }
  }

  return total;
}

function estimateCloserDeepRanks(
  leg: {
    membersByLevel: number[];
    shoppersByLevel: number[];
    ranksByLevel?: string[];
  },
  inputs: CompensationInputs,
  orderLevel: number,
): string[] {
  const ranks: string[] = [];

  for (let level = orderLevel - 4; level >= 0; level--) {
    ranks.push(estimateRankAtLevel(leg, inputs, level));
  }

  return ranks;
}

function estimateRankAtLevel(
  leg: {
    membersByLevel: number[];
    shoppersByLevel: number[];
    ranksByLevel?: string[];
  },
  inputs: CompensationInputs,
  level: number,
): string {
  const explicitRank = leg.ranksByLevel?.[level];
  if (explicitRank) return normalizeRankName(explicitRank);

  const memberCount = leg.membersByLevel[level] ?? 0;
  if (memberCount <= 0) return 'Member';

  const downlineMembers = leg.membersByLevel
    .slice(level + 1)
    .reduce((a, b) => a + b, 0);
  const downlineShoppers = leg.shoppersByLevel
    .slice(level + 1)
    .reduce((a, b) => a + b, 0);
  const qgv =
    (downlineMembers * inputs.memberMonthlyIP +
      downlineShoppers * inputs.shopperMonthlyIP) /
    memberCount;
  const qualifiedLegs = Math.floor(
    ((leg.membersByLevel[level + 1] ?? 0) / memberCount) + 1e-9,
  );

  return estimateLegRank(qgv, qualifiedLegs);
}

export function calculateMonthlyCompensation(
  snapshot: NetworkSnapshot,
  inputs: CompensationInputs,
): MonthlyCompensation {
  const { memberMonthlyIP, shopperMonthlyIP } = inputs;

  const totalMembers = snapshot.membersByLevel.reduce((a, b) => a + b, 0);
  const totalShoppers = snapshot.shoppersByLevel.reduce((a, b) => a + b, 0);
  const qgv = totalMembers * memberMonthlyIP + totalShoppers * shopperMonthlyIP;
  const directMembers = snapshot.directLegs;
  const qualifiedLegs = Math.floor(directMembers + 1e-9);
  const legStructure = estimateQualifiedLegStructure(snapshot, inputs, qualifiedLegs);
  const personalMonthlyIP = determineEffectiveAV({
    av: inputs.personalMonthlyIP,
    qgv,
    qualifiedLegs,
    bronzeLegs: legStructure.bronzeLegs,
    diamondLegs: legStructure.diamondLegs,
  });

  const rank = determineRank({
    av: personalMonthlyIP,
    qgv,
    qualifiedLegs,
    bronzeLegs: legStructure.bronzeLegs,
    diamondLegs: legStructure.diamondLegs,
  });

  const phase1IP = calculatePhase1(snapshot, inputs, qualifiedLegs);
  const phase2IP = calculateCompressedPhase2(snapshot, inputs, rank);
  const phase3IP = calculateCompressedPhase3(snapshot, inputs, rank);

  return {
    phase1IP,
    phase2IP,
    phase3IP,
    totalIP: phase1IP + phase2IP + phase3IP,
    rank,
    av: personalMonthlyIP,
    qgv,
    bronzeLegs: legStructure.bronzeLegs,
    diamondLegs: legStructure.diamondLegs,
    networkSize: totalMembers + totalShoppers,
    members: totalMembers,
    shoppers: totalShoppers,
    directLegs: directMembers,
  };
}

function estimateQualifiedLegStructure(
  snapshot: NetworkSnapshot,
  inputs: CompensationInputs,
  qualifiedLegs: number,
): { bronzeLegs: number; diamondLegs: number } {
  if (qualifiedLegs <= 0) {
    return { bronzeLegs: 0, diamondLegs: 0 };
  }

  const directMembers = snapshot.membersByLevel[0] ?? 0;
  if (directMembers <= 0) {
    return { bronzeLegs: 0, diamondLegs: 0 };
  }

  if (snapshot.legs.length > 0) {
    return estimateQualifiedLegStructureFromLegs(snapshot, inputs);
  }

  const downlineMembers = snapshot.membersByLevel
    .slice(1)
    .reduce((a, b) => a + b, 0);
  const downlineShoppers = snapshot.shoppersByLevel
    .slice(1)
    .reduce((a, b) => a + b, 0);
  const qgvPerLeg =
    (downlineMembers * inputs.memberMonthlyIP +
      downlineShoppers * inputs.shopperMonthlyIP) /
    directMembers;
  const qlPerLeg = Math.floor(((snapshot.membersByLevel[1] ?? 0) / directMembers) + 1e-9);
  const estimatedRank = estimateLegRank(qgvPerLeg, qlPerLeg);
  const bronzeLegs = isBronzeLegRank(estimatedRank) ? qualifiedLegs : 0;
  const diamondLegs = isDiamondLegRank(estimatedRank) ? qualifiedLegs : 0;

  return { bronzeLegs, diamondLegs };
}

function estimateQualifiedLegStructureFromLegs(
  snapshot: NetworkSnapshot,
  inputs: CompensationInputs,
): { bronzeLegs: number; diamondLegs: number } {
  let bronzeLegs = 0;
  let diamondLegs = 0;

  for (const leg of snapshot.legs) {
    const rootMembers = leg.membersByLevel[0] ?? 0;
    if (rootMembers < 1) continue;

    const downlineMembers = leg.membersByLevel
      .slice(1)
      .reduce((a, b) => a + b, 0);
    const downlineShoppers = leg.shoppersByLevel
      .slice(1)
      .reduce((a, b) => a + b, 0);
    const qgv =
      downlineMembers * inputs.memberMonthlyIP +
      downlineShoppers * inputs.shopperMonthlyIP;
    const qualifiedLegs = Math.floor((leg.membersByLevel[1] ?? 0) + 1e-9);
    const estimatedRank = leg.ranksByLevel?.[0]
      ? normalizeRankName(leg.ranksByLevel[0])
      : estimateLegRank(qgv, qualifiedLegs);

    if (isBronzeLegRank(estimatedRank)) {
      bronzeLegs++;
    }
    if (isDiamondLegRank(estimatedRank)) {
      diamondLegs++;
    }
  }

  return {
    bronzeLegs,
    diamondLegs,
  };
}

function isBronzeLegRank(rank: string): boolean {
  const normalized = normalizeRankName(rank);
  return (
    ['Bronze', 'Silver', 'Gold', 'Diamond', '1*Diamond', '2*Diamond', '3*Diamond'].includes(
      normalized,
    ) || isExtendedDiamondRank(normalized)
  );
}

function isDiamondLegRank(rank: string): boolean {
  const normalized = normalizeRankName(rank);
  return (
    ['Diamond', '1*Diamond', '2*Diamond', '3*Diamond'].includes(normalized) ||
    isExtendedDiamondRank(normalized)
  );
}

function isExtendedDiamondRank(rank: string): boolean {
  const match = rank.match(/^(\d+)\*Diamond$/);
  return match ? Number(match[1]) >= 4 : false;
}

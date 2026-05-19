/**
 * Verguetungsberechnung fuer einen Monat.
 */

import {
  PHASE1,
  PHASE1_QUALIFICATION,
  PHASE2_RANKS,
  PHASE3_RANKS,
  PRELIM_RANKS,
  REFERRAL_THRESHOLD_IP,
} from './constants';
import type { NetworkSnapshot } from '@mlm/simulator-core';
import { determineRank, estimateLegRank, type RankResult } from './ranks';

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

function calculateDeepLevelVolume(
  snapshot: NetworkSnapshot,
  inputs: CompensationInputs,
): number {
  const { memberMonthlyIP, shopperMonthlyIP } = inputs;
  const maxLevels = Math.max(
    snapshot.membersByLevel.length,
    snapshot.shoppersByLevel.length,
  );
  let volume = 0;

  for (let i = 3; i < maxLevels; i++) {
    volume += (snapshot.membersByLevel[i] ?? 0) * memberMonthlyIP;
    volume += (snapshot.shoppersByLevel[i] ?? 0) * shopperMonthlyIP;
  }

  return volume;
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
  const personalMonthlyIP = determineEffectivePersonalAV({
    requestedAV: inputs.personalMonthlyIP,
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
  const deepVolume = calculateDeepLevelVolume(snapshot, inputs);
  const phase2IP = deepVolume * rank.phase2Rate;
  const phase3IP = deepVolume * rank.phase3Rate;

  return {
    phase1IP,
    phase2IP,
    phase3IP,
    totalIP: phase1IP + phase2IP + phase3IP,
    rank,
    av: personalMonthlyIP,
    qgv,
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
  const bronzeLegs =
    ['Bronze', 'Silver', 'Gold', 'Diamond'].includes(estimatedRank)
      ? qualifiedLegs
      : 0;
  const diamondLegs = estimatedRank === 'Diamond' ? qualifiedLegs : 0;

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
    const estimatedRank = estimateLegRank(qgv, qualifiedLegs);

    if (['Bronze', 'Silver', 'Gold', 'Diamond'].includes(estimatedRank)) {
      bronzeLegs++;
    }
    if (estimatedRank === 'Diamond') {
      diamondLegs++;
    }
  }

  return {
    bronzeLegs,
    diamondLegs,
  };
}

function determineEffectivePersonalAV({
  requestedAV,
  qgv,
  qualifiedLegs,
  bronzeLegs,
  diamondLegs,
}: {
  requestedAV: number;
  qgv: number;
  qualifiedLegs: number;
  bronzeLegs: number;
  diamondLegs: number;
}): number {
  let requiredAV = 40;

  for (const rank of PRELIM_RANKS) {
    if (qgv >= rank.minQGV && qualifiedLegs >= rank.minQL) {
      requiredAV = Math.max(requiredAV, rank.minAV);
    }
  }

  for (const rank of PHASE2_RANKS) {
    if (qgv >= rank.minQGV && qualifiedLegs >= rank.minQL) {
      requiredAV = Math.max(requiredAV, rank.minAV);
    }
  }

  for (const rank of PHASE3_RANKS) {
    const hasVolumeAndLegs =
      qgv >= rank.minQGV &&
      qualifiedLegs >= rank.minQL &&
      diamondLegs >= rank.minDiamondLegs &&
      bronzeLegs >= rank.minBronzeLegs;

    if (hasVolumeAndLegs) {
      requiredAV = Math.max(requiredAV, rank.minAV);
    }
  }

  return Math.max(requestedAV, requiredAV);
}

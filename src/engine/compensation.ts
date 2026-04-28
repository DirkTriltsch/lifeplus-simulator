/**
 * Verguetungsberechnung fuer einen Monat.
 */

import { PHASE1, PHASE1_QUALIFICATION, REFERRAL_THRESHOLD_IP } from './constants';
import type { NetworkSnapshot } from './network';
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
  const { personalMonthlyIP, memberMonthlyIP, shopperMonthlyIP } = inputs;

  const totalMembers = snapshot.membersByLevel.reduce((a, b) => a + b, 0);
  const totalShoppers = snapshot.shoppersByLevel.reduce((a, b) => a + b, 0);
  const qgv = totalMembers * memberMonthlyIP + totalShoppers * shopperMonthlyIP;
  const directMembers = snapshot.directLegs;
  const qualifiedLegs = Math.floor(directMembers + 1e-9);
  const legStructure = estimateQualifiedLegStructure(snapshot, inputs, qualifiedLegs);

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

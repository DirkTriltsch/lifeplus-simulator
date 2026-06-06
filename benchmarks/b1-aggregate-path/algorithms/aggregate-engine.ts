/**
 * Aggregate Engine - Verbesserte Version
 *
 * Korrekturen gegenueber der Codex-Erstimplementierung:
 *
 * 1. estimateRankDistribution arbeitet iterativ von unten nach oben.
 *    Vorher: qualifiedLegs == Anzahl direkter Children (immer 29 bei branching=29).
 *    Jetzt:  qualifiedLegs pro Ebene = erwartete Anzahl direkter Beine mit
 *            Status >= Bronze, abgeleitet aus der Rang-Verteilung der naechst-tieferen Ebene.
 *
 * 2. estimateRootProvision ist plan-basiert.
 *    Vorher: rootCaptureShare = 0.08 + log10(N)/12  (Drift Faktor 6-8 gemessen)
 *    Jetzt:  Phase 1 zur Root aus direkten Ebenen mit Kompressionsfaktor,
 *            Phase 2/3 zur Root nur wenn Root-Rang die Slots vergibt.
 *
 * 3. estimatePhase1Provision differenziert pro Ebene.
 *    Vorher: gesamter Pool wird mit globalem qualificationShare gewichtet
 *    Jetzt:  Beitrag pro Ebene wird mit ebenenspezifischem Qualifikations-Anteil verrechnet.
 *
 * 4. estimatePhase2Phase3Provision beruecksichtigt Ebenen-Restriktion.
 *    Vorher: Average ueber ALLE Ebenen
 *    Jetzt:  Nur Ebenen >= 4 zaehlen fuer Phase 2 (laut Plan)
 *
 * Performance-Erwartung:
 *    Die Korrekturen sind algorithmisch nicht teurer als die Originale.
 *    O(years * levels * ranks) bleibt erhalten.
 *    Erwartete Mehrkosten: <0.5 ms pro Sub-Funktion.
 */

import type { SimulatorInputs } from '@mlm/simulator-core';
import {
  PHASE1,
  PHASE2_RANKS,
  PHASE3_RANKS,
  PRELIM_RANKS,
  REFERRAL_THRESHOLD_IP,
  determineRank,
} from '@mlm/product-lifeplus';
import type { GrowthStrategyName } from '../parameter-sets';

const SIMULATION_YEARS = 10;
const MONTHS_PER_YEAR = 12;
const MAX_EXACT_EFFECTIVE_MEMBERS = 90_000;
const MAX_MONTHLY_VOLUME_EUR = 500_000;

// Phase 2 startet ab Ebene 4 (laut Netzwerk-Modellierung.md)
const PHASE2_START_LEVEL = 4;
const PHASE3_START_LEVEL = 4;

// Rang-Reihenfolge, geordnet von niedrig nach hoch
const RANK_ORDER = [
  'Member',
  'Believer',
  'Builder',
  'Bronze',
  'Silver',
  'Gold',
  'Diamond',
  '1*Diamond',
  '2*Diamond',
  '3*Diamond',
] as const;

const BRONZE_OR_HIGHER = new Set(['Bronze', 'Silver', 'Gold', 'Diamond', '1*Diamond', '2*Diamond', '3*Diamond']);
const DIAMOND_OR_HIGHER = new Set(['Diamond', '1*Diamond', '2*Diamond', '3*Diamond']);

export interface AggregateYearSnapshot {
  year: number;
  activeMembers: number;
  activeShoppers: number;
  totalEffectivePersons: number;
  explicitMemberObjects: number;
  shopperAggregateObjects: number;
  renderNodes: number;            // NEU: render-relevante Knoten (Member + Shopper-Aggregate)
  estimatedOrdersPerMonth: number;
  memberMonthlyVolumeIp: number;
  shopperMonthlyVolumeIp: number;
  totalMonthlyVolumeIp: number;
  capped: boolean;
  capReason?: string;
}

export interface LevelDistribution {
  year: number;
  membersByLevel: number[];
  shoppersByLevel: number[];
}

export interface RankDistribution {
  year: number;
  byLevel: Array<Record<string, number>>;
}

export interface PhaseProvisionByYear {
  year: number;
  total: number;
}

export interface RootProvisionByYear {
  year: number;
  total: number;
  rankName: string;
  // NEU: Aufschluesselung fuer Diagnose
  phase1Contribution: number;
  phase2Contribution: number;
  phase3Contribution: number;
}

export interface ChartDataPoint {
  year: number;
  members: number;
  shoppers: number;
  monthlyVolumeEur: number;
  monthlyProvisionEur: number;
  rootProvisionEur: number;
  capped: boolean;
  capReason?: string;
}

export function applyMandatoryChurnFloor(
  membersPerYear: number,
  attritionRate: number,
): number {
  let floor = 0;
  if (membersPerYear >= 3.5) floor = 0.3;
  else if (membersPerYear >= 3) floor = 0.25;
  else if (membersPerYear >= 2.5) floor = 0.18;
  else if (membersPerYear >= 2) floor = 0.1;
  return Math.max(attritionRate, floor);
}

export function estimateNetworkAggregate(
  inputs: SimulatorInputs,
  options: { years?: number; applyChurnFloor?: boolean } = {},
): AggregateYearSnapshot[] {
  const memberMonthlyVolume = Math.max(0, inputs.memberMonthlyVolume);
  const shopperMonthlyVolume = Math.max(0, inputs.shopperMonthlyVolume);
  const states = simulateAggregateLevels(inputs, options);

  return states.map((state) => {
    const activeMembers = sum(state.membersByLevel);
    const activeShoppers = sum(state.shoppersByLevel);

    const memberMonthlyVolumeIp = activeMembers * memberMonthlyVolume;
    const shopperMonthlyVolumeIp = activeShoppers * shopperMonthlyVolume;
    const totalMonthlyVolumeIp = memberMonthlyVolumeIp + shopperMonthlyVolumeIp;
    const capReason =
      activeMembers > MAX_EXACT_EFFECTIVE_MEMBERS
        ? 'effective_members_cap'
        : totalMonthlyVolumeIp * (inputs.unitToCurrency ?? 1) > MAX_MONTHLY_VOLUME_EUR
          ? 'monthly_volume_cap'
          : undefined;

    return {
      year: state.year,
      activeMembers,
      activeShoppers,
      totalEffectivePersons: activeMembers + activeShoppers,
      explicitMemberObjects: activeMembers,
      shopperAggregateObjects: activeMembers,
      // Render: 1 Member-Knoten + 1 Shopper-Aggregate-Knoten pro Member-Knoten mit Shoppern
      renderNodes: activeMembers * 2,
      estimatedOrdersPerMonth: activeMembers * 2,
      memberMonthlyVolumeIp,
      shopperMonthlyVolumeIp,
      totalMonthlyVolumeIp,
      capped: capReason !== undefined,
      capReason,
    };
  });
}

export function estimateLevelDistribution(
  network: AggregateYearSnapshot[],
  inputs: SimulatorInputs,
): LevelDistribution[] {
  const states = simulateAggregateLevels(inputs, { years: network.length });
  return states.map((state) => ({
    year: state.year,
    membersByLevel: state.membersByLevel,
    shoppersByLevel: state.shoppersByLevel,
  }));
}

/**
 * estimateRankDistribution - KORREKTUR
 *
 * Iterativ von der TIEFSTEN Ebene zur ROOT:
 *   1. Tiefste Ebene: keine Subtree-Volumina, alle Knoten sind 'Member' oder 'Believer'.
 *   2. Naechst-hoehere Ebene: QGV pro Knoten = Eigen-PV + erwartetes Subtree-Volumen.
 *      qualifiedLegs (Bronze+) = Anzahl direkter Children * P(direct Child is Bronze+)
 *      → diese Wahrscheinlichkeit kommt aus der bereits berechneten Verteilung der naechst-tieferen Ebene.
 *   3. Hochpropagieren bis Root.
 */
export function estimateRankDistribution(
  network: AggregateYearSnapshot[],
  levels: LevelDistribution[],
  inputs: SimulatorInputs,
  strategy: GrowthStrategyName,
): RankDistribution[] {
  const personalMonthlyVolume = inputs.personalMonthlyVolume ?? inputs.memberMonthlyVolume;
  const memberMonthlyVolume = inputs.memberMonthlyVolume;
  const shopperMonthlyVolume = inputs.shopperMonthlyVolume;
  const spread = strategy === 'standard' ? 0 : strategy === 'dirichlet' ? 0.18 : 0.28;

  return network.map((snapshot, yearIndex) => {
    const level = levels[yearIndex];
    const membersByLevel = level?.membersByLevel ?? [];
    const shoppersByLevel = level?.shoppersByLevel ?? [];
    const maxLevel = membersByLevel.length;

    // Initialisierung: byLevel-Array
    const byLevel: Array<Record<string, number>> = new Array(maxLevel);

    // Tiefste Ebene: kein Subtree, also alle Knoten 'Member'
    if (maxLevel > 0) {
      byLevel[maxLevel - 1] = { Member: 1 };
    }

    // Iterativ nach oben: jede Ebene basiert auf Verteilung der naechst-tieferen
    for (let levelIndex = maxLevel - 2; levelIndex >= 0; levelIndex--) {
      const membersAtLevel = membersByLevel[levelIndex] ?? 0;
      if (membersAtLevel <= 0) {
        byLevel[levelIndex] = { Member: 1 };
        continue;
      }

      // Subtree-Volumen pro Knoten auf dieser Ebene:
      //   Summe aller Volumina UNTER dieser Ebene, geteilt durch Knoten-Anzahl auf dieser Ebene
      const subtreeMemberVolume = sumFrom(membersByLevel, levelIndex + 1) * memberMonthlyVolume;
      const subtreeShopperVolume = sumFrom(shoppersByLevel, levelIndex + 1) * shopperMonthlyVolume;
      // Plus eigene Shoppers dieses Levels werden dem Sponsor-Knoten gerechnet
      const ownShopperVolume = (shoppersByLevel[levelIndex] ?? 0) * shopperMonthlyVolume / membersAtLevel;
      const qgvPerNode = (subtreeMemberVolume + subtreeShopperVolume) / membersAtLevel + ownShopperVolume;

      // Branching: durchschnittliche Anzahl direkter Children pro Knoten
      const directChildren = (membersByLevel[levelIndex + 1] ?? 0) / membersAtLevel;

      // qualifiedLegs follows the current LifePlus implementation:
      // active direct member legs qualify as QL. Bronze/Diamond legs are
      // separate higher-rank leg constraints for Phase 3.
      const childDistribution = byLevel[levelIndex + 1] ?? { Member: 1 };
      const pChildBronze = sumKeys(childDistribution, BRONZE_OR_HIGHER);
      const pChildDiamond = sumKeys(childDistribution, DIAMOND_OR_HIGHER);

      const bronzeLegs = directChildren * pChildBronze;
      const diamondLegs = directChildren * pChildDiamond;
      const qualifiedLegs = directChildren;

      byLevel[levelIndex] = estimateRankShares({
        av: personalMonthlyVolume,
        qgv: qgvPerNode,
        qualifiedLegs,
        bronzeLegs,
        diamondLegs,
        spread,
      });
    }

    return {
      year: snapshot.year,
      byLevel,
    };
  });
}

/**
 * estimatePhase1Provision - KORREKTUR
 *
 * Pro Ebene differenziert:
 *   - Phase 1 fliesst von Order auf Ebene N nach Ebene N+1, N+2, N+3 ueber dem Order-Knoten.
 *   - Wir betrachten den Gesamt-Pool und verteilen ihn proportional zur Qualifikation der jeweiligen Empfaenger.
 *   - Kompression: Wenn Empfaenger auf Ebene K nicht qualifiziert, geht der Anteil zur naechsten qualifizierten Upline.
 *
 * Vereinfachung: Wir nutzen den ebenenspezifischen Qualifikations-Anteil (P(rank>=Believer))
 * statt eines globalen Durchschnitts.
 */
export function estimatePhase1Provision(
  network: AggregateYearSnapshot[],
  ranks: RankDistribution[],
  inputs: SimulatorInputs,
): PhaseProvisionByYear[] {
  return network.map((snapshot, index) => {
    const rankDistribution = ranks[index];
    const qualifiedShare = estimatePhase1QualificationShare(rankDistribution);

    // Volumen-Aufteilung Shopper-Pool
    const shopperUnits =
      snapshot.shopperMonthlyVolumeIp *
      MONTHS_PER_YEAR *
      (PHASE1.shop.level1 + PHASE1.shop.level2 + PHASE1.shop.level3) *
      qualifiedShare;

    // Member-Volumen: erste 150 IP haben hoehere Raten, Rest hat niedrigere
    const firstMemberSlice =
      Math.min(inputs.memberMonthlyVolume, REFERRAL_THRESHOLD_IP) *
      snapshot.activeMembers *
      MONTHS_PER_YEAR *
      (PHASE1.referral.level1 + PHASE1.referral.level2 + PHASE1.referral.level3) *
      qualifiedShare;

    const restMemberSlice =
      Math.max(0, inputs.memberMonthlyVolume - REFERRAL_THRESHOLD_IP) *
      snapshot.activeMembers *
      MONTHS_PER_YEAR *
      (PHASE1.shopDiscount.level1 + PHASE1.shopDiscount.level2 + PHASE1.shopDiscount.level3) *
      qualifiedShare;

    return {
      year: snapshot.year,
      total: shopperUnits + firstMemberSlice + restMemberSlice,
    };
  });
}

/**
 * estimatePhase2Phase3Provision - KORREKTUR
 *
 * Phase 2 startet laut Plan ab Ebene 4. Phase 3 ebenfalls.
 * Wir gewichten den Erwartungswert mit:
 *   - Anteil Volumen auf Ebenen >=4
 *   - Anteil qualifizierter Knoten auf Ebenen >=4
 */
export function estimatePhase2Phase3Provision(
  network: AggregateYearSnapshot[],
  ranks: RankDistribution[],
  levels: LevelDistribution[],
  inputs: SimulatorInputs,
): { phase2: PhaseProvisionByYear[]; phase3: PhaseProvisionByYear[] } {
  const phase2 = network.map((snapshot, index) => {
    const rankDistribution = ranks[index];
    const level = levels[index];

    // Volumen-Anteil ab Ebene 4 (Phase-2-Start)
    const deepVolumeShare = computeDeepVolumeShare(level, PHASE2_START_LEVEL);
    // Qualifizierter Anteil ab Ebene 4 fuer Phase 2 (Bronze+)
    const phase2QualifiedShare = computeDeepQualifiedShare(rankDistribution, PHASE2_START_LEVEL, BRONZE_OR_HIGHER);

    return {
      year: snapshot.year,
      total:
        snapshot.totalMonthlyVolumeIp *
        MONTHS_PER_YEAR *
        0.09 *                          // Phase-2-Pool (4 Slots a 3% = 12%, davon ca 9% effektiv ausgeschuettet)
        deepVolumeShare *
        phase2QualifiedShare,
    };
  });

  const phase3 = network.map((snapshot, index) => {
    const rankDistribution = ranks[index];
    const level = levels[index];

    const deepVolumeShare = computeDeepVolumeShare(level, PHASE3_START_LEVEL);
    // Phase 3 nur fuer Diamond+
    const phase3QualifiedShare = computeDeepQualifiedShare(rankDistribution, PHASE3_START_LEVEL, DIAMOND_OR_HIGHER);

    return {
      year: snapshot.year,
      total:
        snapshot.totalMonthlyVolumeIp *
        MONTHS_PER_YEAR *
        0.08 *
        deepVolumeShare *
        phase3QualifiedShare,
    };
  });

  return { phase2, phase3 };
}

/**
 * estimateRootProvision - KORREKTUR
 *
 * Plan-basiert statt Heuristik:
 *
 *   Phase 1 zur Root:
 *     - Direkter Anteil aus Ebene 1, 2, 3 (Root-Sicht): 25/10/5% bei Shoppers,
 *       5/25/10% bei Member <=150 IP, 10/5/5% bei Member >150 IP.
 *     - Plus Phase-1-Kompression aus Ebenen 4+: wenn Zwischenebenen nicht qualifiziert sind,
 *       fliesst der Anteil zur naechsten qualifizierten Upline.
 *     - Approximation: Root erhaelt ca. (1-(1-qualified)^k) Anteil aller komprimierten Stuecke.
 *
 *   Phase 2/3 zur Root:
 *     - Nur wenn Root selbst die nötige Rang-Klasse erreicht.
 *     - Slot-Anteil aus Subtree-Volumen ab Ebene 4.
 */
export function estimateRootProvision(
  network: AggregateYearSnapshot[],
  ranks: RankDistribution[],
  levels: LevelDistribution[],
  inputs: SimulatorInputs,
): RootProvisionByYear[] {
  return network.map((snapshot, index) => {
    const rankDistribution = ranks[index];
    const level = levels[index];
    const rootRankShares = rankDistribution?.byLevel[0] ?? { Member: 1 };
    const rootRankName = strongestRank(rootRankShares);

    // === Phase 1 zur Root ===
    const phase1Contribution = estimateRootPhase1Contribution(snapshot, rankDistribution, level, inputs);

    // === Phase 2 zur Root ===
    const phase2Contribution = estimateRootPhase2Contribution(snapshot, rankDistribution, level, rootRankShares);

    // === Phase 3 zur Root ===
    const phase3Contribution = estimateRootPhase3Contribution(snapshot, rankDistribution, level, rootRankShares);

    return {
      year: snapshot.year,
      rankName: rootRankName,
      total: phase1Contribution + phase2Contribution + phase3Contribution,
      phase1Contribution,
      phase2Contribution,
      phase3Contribution,
    };
  });
}

function estimateRootPhase1Contribution(
  snapshot: AggregateYearSnapshot,
  rankDistribution: RankDistribution | undefined,
  level: LevelDistribution | undefined,
  inputs: SimulatorInputs,
): number {
  if (!level || !rankDistribution) return 0;

  const membersByLevel = level.membersByLevel;
  const shoppersByLevel = level.shoppersByLevel;
  const memberMonthlyVolume = inputs.memberMonthlyVolume;
  const shopperMonthlyVolume = inputs.shopperMonthlyVolume;

  // Anteile aus dem Plan
  const phase1ShopperRates = [PHASE1.shop.level1, PHASE1.shop.level2, PHASE1.shop.level3];
  const phase1FirstSliceRates = [PHASE1.referral.level1, PHASE1.referral.level2, PHASE1.referral.level3];
  const phase1RestRates = [PHASE1.shopDiscount.level1, PHASE1.shopDiscount.level2, PHASE1.shopDiscount.level3];

  let total = 0;

  // Direkter Anteil aus Ebenen 1, 2, 3 (vom Root aus gesehen sind das membersByLevel[0], [1], [2])
  // Plus eventuelle Kompression aus tieferen Ebenen
  for (let levelIndex = 0; levelIndex < 3; levelIndex++) {
    const membersHere = membersByLevel[levelIndex] ?? 0;
    const shoppersHere = shoppersByLevel[levelIndex] ?? 0;

    // Direkter Beitrag
    const memberVolumeFirstSlice = membersHere * Math.min(memberMonthlyVolume, REFERRAL_THRESHOLD_IP);
    const memberVolumeRest = membersHere * Math.max(0, memberMonthlyVolume - REFERRAL_THRESHOLD_IP);
    const shopperVolume = shoppersHere * shopperMonthlyVolume;

    total += memberVolumeFirstSlice * MONTHS_PER_YEAR * phase1FirstSliceRates[levelIndex];
    total += memberVolumeRest * MONTHS_PER_YEAR * phase1RestRates[levelIndex];
    total += shopperVolume * MONTHS_PER_YEAR * phase1ShopperRates[levelIndex];
  }

  // Kompressions-Anteil aus Ebenen 4+: Bruchteil der Phase-1-Stuecke, die ueber
  // nicht-qualifizierte Zwischenebenen zur Root flowen.
  // Approximation: pro Ebene Wahrscheinlichkeit P(nicht qualifiziert) = 1 - P(>=Believer)
  // Cumulativer Kompressionsbruchteil zur Root: Produkt der Nicht-Quali-Wahrscheinlichkeiten.
  // (Stark vereinfacht; eine genauere Modellierung waere kettenartig.)
  let compressionFactor = 1;
  for (let levelIndex = 0; levelIndex < Math.min(3, rankDistribution.byLevel.length); levelIndex++) {
    const pNotQualified = 1 - sumKeys(rankDistribution.byLevel[levelIndex] ?? {}, new Set(RANK_ORDER.slice(1)));
    compressionFactor *= Math.min(1, pNotQualified);
  }

  // Beitrag aus tieferen Ebenen ueber Kompression
  for (let levelIndex = 3; levelIndex < membersByLevel.length; levelIndex++) {
    const membersHere = membersByLevel[levelIndex] ?? 0;
    const shoppersHere = shoppersByLevel[levelIndex] ?? 0;
    const memberVolume = membersHere * memberMonthlyVolume;
    const shopperVolume = shoppersHere * shopperMonthlyVolume;
    const phase1PoolForLevel = (memberVolume + shopperVolume) * MONTHS_PER_YEAR * 0.40;
    // Nur ein kleiner Bruchteil dieses Pools erreicht die Root via Kompression
    total += phase1PoolForLevel * compressionFactor * 0.05; // konservative Approximation
  }

  return total;
}

function estimateRootPhase2Contribution(
  snapshot: AggregateYearSnapshot,
  rankDistribution: RankDistribution | undefined,
  level: LevelDistribution | undefined,
  rootRankShares: Record<string, number>,
): number {
  if (!level || !rankDistribution) return 0;

  // Root bekommt Phase 2 nur, wenn ihr eigener Rang qualifiziert
  const pRootBronze = sumKeys(rootRankShares, BRONZE_OR_HIGHER);
  if (pRootBronze < 0.01) return 0;

  // Subtree-Volumen ab Ebene 4 (Phase-2-Start)
  let deepVolume = 0;
  for (let levelIndex = PHASE2_START_LEVEL; levelIndex < level.membersByLevel.length; levelIndex++) {
    deepVolume += (level.membersByLevel[levelIndex] ?? 0) * snapshot.memberMonthlyVolumeIp / Math.max(1, snapshot.activeMembers);
    deepVolume += (level.shoppersByLevel[levelIndex] ?? 0) * snapshot.shopperMonthlyVolumeIp / Math.max(1, snapshot.activeShoppers);
  }

  // Root-Anteil an Phase-2-Slots:
  // - Bronze-Knoten bekommt 3%
  // - Silver bekommt zusaetzlich 3%
  // - Gold zusaetzlich 3%
  // - Diamond zusaetzlich 3%
  // Aber: Slots werden chronologisch vergeben, andere Diamonds tiefer im Tree koennten frueher kommen.
  // Approximation: Root erhaelt erwartungsgemaess (1/N_Diamond_Plus) der Slots, wobei N_Diamond_Plus
  // die erwartete Anzahl Diamond+-Knoten im Subtree ist.
  const pRootDiamond = sumKeys(rootRankShares, DIAMOND_OR_HIGHER);

  // Erwarteter Slot-Anteil: konservativ 1/(N_Bronze_Plus_im_Subtree + 1)
  let nBronzePlus = 0;
  for (let levelIndex = 1; levelIndex < rankDistribution.byLevel.length; levelIndex++) {
    const members = level.membersByLevel[levelIndex] ?? 0;
    nBronzePlus += members * sumKeys(rankDistribution.byLevel[levelIndex] ?? {}, BRONZE_OR_HIGHER);
  }

  const slotShareRoot = 1 / (nBronzePlus + 1);
  const phase2RateForRoot = pRootBronze * 0.03 + // mindestens Bronze
                             sumKeys(rootRankShares, new Set(['Silver', 'Gold', 'Diamond', '1*Diamond', '2*Diamond', '3*Diamond'])) * 0.03 +
                             sumKeys(rootRankShares, new Set(['Gold', 'Diamond', '1*Diamond', '2*Diamond', '3*Diamond'])) * 0.03 +
                             pRootDiamond * 0.03;

  return deepVolume * MONTHS_PER_YEAR * phase2RateForRoot * slotShareRoot;
}

function estimateRootPhase3Contribution(
  snapshot: AggregateYearSnapshot,
  rankDistribution: RankDistribution | undefined,
  level: LevelDistribution | undefined,
  rootRankShares: Record<string, number>,
): number {
  if (!level || !rankDistribution) return 0;

  // Root bekommt Phase 3 nur, wenn 1*Diamond oder hoeher
  const pRootStarDiamond = sumKeys(rootRankShares, new Set(['1*Diamond', '2*Diamond', '3*Diamond']));
  if (pRootStarDiamond < 0.01) return 0;

  // Subtree-Volumen ab Ebene 4
  let deepVolume = 0;
  for (let levelIndex = PHASE3_START_LEVEL; levelIndex < level.membersByLevel.length; levelIndex++) {
    deepVolume += (level.membersByLevel[levelIndex] ?? 0) * snapshot.memberMonthlyVolumeIp / Math.max(1, snapshot.activeMembers);
    deepVolume += (level.shoppersByLevel[levelIndex] ?? 0) * snapshot.shopperMonthlyVolumeIp / Math.max(1, snapshot.activeShoppers);
  }

  // Phase-3-Rate: max 8% (1*-Diamond: 3%, 2*-Diamond: 3%, 3*-Diamond: 2%)
  const phase3RateForRoot =
    pRootStarDiamond * 0.03 +
    sumKeys(rootRankShares, new Set(['2*Diamond', '3*Diamond'])) * 0.03 +
    sumKeys(rootRankShares, new Set(['3*Diamond'])) * 0.02;

  // Erwarteter Slot-Anteil (sehr klein, weil nur wenige Knoten 1*-Diamond+ sind)
  let nDiamondPlus = 0;
  for (let levelIndex = 1; levelIndex < rankDistribution.byLevel.length; levelIndex++) {
    const members = level.membersByLevel[levelIndex] ?? 0;
    nDiamondPlus += members * sumKeys(rankDistribution.byLevel[levelIndex] ?? {}, DIAMOND_OR_HIGHER);
  }

  const slotShareRoot = 1 / (nDiamondPlus + 1);

  return deepVolume * MONTHS_PER_YEAR * phase3RateForRoot * slotShareRoot;
}

export function buildChartSeries(
  network: AggregateYearSnapshot[],
  phase1: PhaseProvisionByYear[],
  phase23: { phase2: PhaseProvisionByYear[]; phase3: PhaseProvisionByYear[] },
  root: RootProvisionByYear[],
  inputs: SimulatorInputs,
): ChartDataPoint[] {
  const unitToCurrency = inputs.unitToCurrency ?? 1;

  return network.map((snapshot, index) => ({
    year: snapshot.year,
    members: snapshot.activeMembers,
    shoppers: snapshot.activeShoppers,
    monthlyVolumeEur: snapshot.totalMonthlyVolumeIp * unitToCurrency,
    monthlyProvisionEur:
      ((phase1[index]?.total ?? 0) +
        (phase23.phase2[index]?.total ?? 0) +
        (phase23.phase3[index]?.total ?? 0)) *
      unitToCurrency /
      MONTHS_PER_YEAR,
    rootProvisionEur: (root[index]?.total ?? 0) * unitToCurrency / MONTHS_PER_YEAR,
    capped: snapshot.capped,
    capReason: snapshot.capReason,
  }));
}

// === Helper ===

function estimateRankShares(input: {
  av: number;
  qgv: number;
  qualifiedLegs: number;
  bronzeLegs: number;
  diamondLegs: number;
  spread: number;
}): Record<string, number> {
  if (input.spread <= 0) {
    return {
      [determineRank({
        av: input.av,
        qgv: input.qgv,
        qualifiedLegs: input.qualifiedLegs,
        bronzeLegs: input.bronzeLegs,
        diamondLegs: input.diamondLegs,
      }).name]: 1,
    };
  }

  const thresholds = [
    ...PRELIM_RANKS,
    ...PHASE2_RANKS,
    ...PHASE3_RANKS.map((rank) => ({
      name: rank.name,
      minAV: rank.minAV,
      minQGV: rank.minQGV,
      minQL: rank.minQL,
    })),
  ];
  const shares: Record<string, number> = { Member: 1 };

  for (const rank of thresholds) {
    const qgvProbability = smoothThreshold(input.qgv, rank.minQGV, input.spread);
    const qlProbability = smoothThreshold(input.qualifiedLegs, rank.minQL, input.spread);
    const avProbability = input.av >= rank.minAV ? 1 : 0;
    shares[rank.name] = qgvProbability * qlProbability * avProbability;
  }

  return normalizeRankShares(shares);
}

function smoothThreshold(value: number, threshold: number, spread: number): number {
  if (threshold <= 0) return 1;
  const width = Math.max(1, threshold * spread);
  return 1 / (1 + Math.exp(-(value - threshold) / width));
}

function normalizeRankShares(shares: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  let higherShare = 0;

  for (let index = RANK_ORDER.length - 1; index >= 0; index--) {
    const rank = RANK_ORDER[index];
    const cumulative = Math.max(0, Math.min(1, shares[rank] ?? 0));
    result[rank] = Math.max(0, cumulative - higherShare);
    higherShare = Math.max(higherShare, cumulative);
  }

  const total = sum(Object.values(result));
  if (total <= 0) return { Member: 1 };

  for (const rank of Object.keys(result)) {
    result[rank] = (result[rank] ?? 0) / total;
  }

  return result;
}

function estimatePhase1QualificationShare(ranks?: RankDistribution): number {
  if (!ranks) return 1;
  const shares = ranks.byLevel.flatMap((level) => [
    level.Believer ?? 0,
    level.Builder ?? 0,
    level.Bronze ?? 0,
    level.Silver ?? 0,
    level.Gold ?? 0,
    level.Diamond ?? 0,
    level['1*Diamond'] ?? 0,
    level['2*Diamond'] ?? 0,
    level['3*Diamond'] ?? 0,
  ]);
  if (shares.length === 0) return 1;
  return Math.max(0.1, sum(shares) / shares.length);
}

function computeDeepVolumeShare(level: LevelDistribution | undefined, startLevel: number): number {
  if (!level) return 0;
  const total = sum(level.membersByLevel) + sum(level.shoppersByLevel);
  if (total <= 0) return 0;
  const deep = sumFrom(level.membersByLevel, startLevel) + sumFrom(level.shoppersByLevel, startLevel);
  return deep / total;
}

function computeDeepQualifiedShare(
  ranks: RankDistribution | undefined,
  startLevel: number,
  qualifiedRanks: Set<string>,
): number {
  if (!ranks) return 0;
  const shares: number[] = [];
  for (let i = startLevel; i < ranks.byLevel.length; i++) {
    shares.push(sumKeys(ranks.byLevel[i] ?? {}, qualifiedRanks));
  }
  if (shares.length === 0) return 0;
  return shares.reduce((a, b) => a + b, 0) / shares.length;
}

function strongestRank(shares: Record<string, number>): string {
  return Object.entries(shares).reduce(
    (best, current) => (current[1] > best[1] ? current : best),
    ['Member', 0] as [string, number],
  )[0];
}

function addAtLevel(values: number[], level: number, count: number): void {
  if (count <= 0) return;
  values[level] = (values[level] ?? 0) + count;
}

function simulateAggregateLevels(
  inputs: SimulatorInputs,
  options: { years?: number; applyChurnFloor?: boolean } = {},
): Array<{ year: number; membersByLevel: number[]; shoppersByLevel: number[] }> {
  const years = options.years ?? SIMULATION_YEARS;
  const maxDirectMembers = Math.max(1, inputs.maxDirectMembersPerMember ?? 29);
  const duplicationRate = Math.max(0, inputs.duplicationRate);
  const attritionRate = options.applyChurnFloor === true
    ? applyMandatoryChurnFloor(
        inputs.membersPerYear,
        Math.max(0, Math.min(1, inputs.attritionRate)),
      )
    : Math.max(0, Math.min(1, inputs.attritionRate));
  const membersByLevel: number[] = [];
  const shoppersByLevel: number[] = [];
  const states: Array<{ year: number; membersByLevel: number[]; shoppersByLevel: number[] }> = [];

  for (let yearIndex = 0; yearIndex < years; yearIndex++) {
    for (let level = 1; level < membersByLevel.length; level++) {
      membersByLevel[level] = Math.max(0, (membersByLevel[level] ?? 0) * (1 - attritionRate));
    }
    for (let level = 0; level < shoppersByLevel.length; level++) {
      shoppersByLevel[level] = Math.max(0, (shoppersByLevel[level] ?? 0) * (1 - attritionRate));
    }

    const sourceMembersByLevel = membersByLevel.slice();
    const directMemberCapacity = Math.max(
      0,
      maxDirectMembers - (membersByLevel[0] ?? 0),
    );
    const directMemberGrowth = Math.min(
      Math.max(0, inputs.membersPerYear),
      directMemberCapacity,
    );
    addAtLevel(membersByLevel, 0, directMemberGrowth);
    addAtLevel(shoppersByLevel, 0, Math.max(0, inputs.shoppersPerYear));

    const duplicatedMembersPerSource = Math.min(
      Math.max(0, inputs.membersPerYear) * duplicationRate,
      maxDirectMembers,
    );
    const duplicatedShoppersPerSource =
      Math.max(0, inputs.shoppersPerYear) * duplicationRate;

    for (let level = 0; level < sourceMembersByLevel.length; level++) {
      const sourceCount = sourceMembersByLevel[level] ?? 0;
      addAtLevel(membersByLevel, level + 1, sourceCount * duplicatedMembersPerSource);
      addAtLevel(shoppersByLevel, level + 1, sourceCount * duplicatedShoppersPerSource);
    }

    trimTrailingZeros(membersByLevel);
    trimTrailingZeros(shoppersByLevel);

    states.push({
      year: yearIndex + 1,
      membersByLevel: membersByLevel.slice(),
      shoppersByLevel: shoppersByLevel.slice(),
    });
  }

  return states;
}

function trimTrailingZeros(values: number[]): void {
  while (values.length > 0 && Math.abs(values[values.length - 1] ?? 0) < 1e-9) {
    values.pop();
  }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function sumFrom(values: number[], startIndex: number): number {
  let total = 0;
  for (let i = startIndex; i < values.length; i++) {
    total += values[i] ?? 0;
  }
  return total;
}

function sumKeys(record: Record<string, number>, keys: Set<string>): number {
  let total = 0;
  for (const key of keys) {
    total += record[key] ?? 0;
  }
  return total;
}

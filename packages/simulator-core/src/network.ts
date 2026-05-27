/**
 * Netzwerk-Wachstumssimulation.
 *
 * Die Simulation arbeitet jahresbasiert, weil die Eingaben ebenfalls pro Jahr
 * erfolgen. Innerhalb eines Jahres bleiben die Werte stabil; am Jahresanfang
 * werden neue Members/Shopper erzeugt und austretende Shopper/Member behandelt.
 */

import type { GrowthModulator } from './pipeline';

export interface NetworkInputs {
  membersPerYear: number;
  shoppersPerYear: number;
  duplicationRate: number;
  attritionRate: number;
  /** Maximale Anzahl direkter Members pro Member. Default 29. */
  maxDirectMembersPerMember?: number;
}

const DEFAULT_MAX_DIRECT_MEMBERS_PER_MEMBER = 29;

/**
 * Ein einzelnes Bein des Users, d. h. ein direkter Member plus seine vollstaendige Downline.
 *
 * In der Standard-Strategie bleiben Beine deterministisch und behalten ihr
 * Geburtsjahr: frische Beine starten ohne rueckwirkende Downline, alte Beine
 * koennen dadurch voller sein. Realistic-Growth-Strategien koennen diese echte
 * Bein-Struktur zusaetzlich asymmetrisch modulieren.
 */
export interface Leg {
  id: string;
  /** Members im Sub-Baum dieses Beins. Index 0 = direkter Member (Wurzel des Beins). */
  membersByLevel: number[];
  /** Shopper im Sub-Baum dieses Beins. */
  shoppersByLevel: number[];
  /** Optional explizite Ranglinie pro Member-Level fuer echte Team-/Testfaelle. */
  ranksByLevel?: string[];
}

export interface NetworkSnapshot {
  membersByLevel: number[];
  shoppersByLevel: number[];
  /** Direkte Members des Users = Beine */
  directLegs: number;
  /** Beine des Users mit Sub-Baum. Frische Beine starten ohne rueckwirkende Downline. */
  legs: Leg[];
  memberGrowth: number;
  memberAttrition: number;
  shopperGrowth: number;
  shopperAttrition: number;
}

export interface SimulateNetworkOptions {
  growthModulator?: GrowthModulator;
}

export function simulateNetwork(
  inputs: NetworkInputs,
  totalMonths: number,
  options: SimulateNetworkOptions = {},
): NetworkSnapshot[] {
  const { membersPerYear, shoppersPerYear, duplicationRate, attritionRate } =
    inputs;
  const maxDirect = Math.max(
    1,
    inputs.maxDirectMembersPerMember ?? DEFAULT_MAX_DIRECT_MEMBERS_PER_MEMBER,
  );
  const modulator = options.growthModulator;

  let legs: Leg[] = [];
  let directRootShoppersByLevel: number[] = [];
  const snapshots: NetworkSnapshot[] = [];
  modulator?.reset?.();

  for (let month = 0; month < totalMonths; month++) {
    const isYearStart = month % 12 === 0;
    const year = Math.floor(month / 12) + 1;
    let memberGrowth = 0;
    let memberAttrition = 0;
    let shopperGrowth = 0;
    let shopperAttrition = 0;

    if (isYearStart) {
      modulator?.beforeYear?.(year);
    }

    if (isYearStart) {
      const shopperAttritionResult = applyLegShopperAttrition(legs, attritionRate);
      legs = shopperAttritionResult.legs;
      shopperAttrition += shopperAttritionResult.shopperAttrition;
      const rootShopperAttritionResult = applyShopperLevelAttrition(
        directRootShoppersByLevel,
        attritionRate,
      );
      directRootShoppersByLevel = rootShopperAttritionResult.shoppersByLevel;
      shopperAttrition += rootShopperAttritionResult.shopperAttrition;

      // Snapshot der Members VOR den direct-adds dieses Jahres. Nur diese werben jetzt;
      // frisch dazugekommene Direkt-Members werben erst ab dem Folgejahr.
      const sourceLegs = cloneLegs(legs);
      const membersBeforeGrowth = aggregateLegLevels(legs, 'membersByLevel');

      const currentDirect = sum(legs.map((leg) => leg.membersByLevel[0] ?? 0));
      const directCapacity = Math.max(0, maxDirect - currentDirect);
      const directMembers = Math.min(membersPerYear, directCapacity);
      const directShoppers = shoppersPerYear;

      const newLegs = createDirectLegs(legs.length, directMembers);
      if (directMembers > 0) {
        legs.push(...newLegs);
        memberGrowth += directMembers;
      }

      if (directShoppers > 0) {
        if (directMembers > 0 || legs.length > 0) {
          distributeAtLevel(
            directMembers > 0 ? newLegs : legs,
            'shoppersByLevel',
            0,
            directShoppers,
          );
        } else {
          addAtLevel(directRootShoppersByLevel, 0, directShoppers);
        }
        shopperGrowth += directShoppers;
      }

      for (let legIndex = 0; legIndex < sourceLegs.length; legIndex++) {
        const sourceLeg = sourceLegs[legIndex];
        const targetLeg = legs[legIndex];
        if (!targetLeg) continue;

        for (let level = 0; level < sourceLeg.membersByLevel.length; level++) {
          const sourceCount = sourceLeg.membersByLevel[level] ?? 0;
          if (sourceCount <= 0) continue;

          const existingChildren = membersBeforeGrowth[level + 1] ?? 0;
          const totalSourcesAtLevel = membersBeforeGrowth[level] ?? 0;
          const existingPerSource =
            totalSourcesAtLevel > 0 ? existingChildren / totalSourcesAtLevel : 0;
          const availablePerSource = Math.max(0, maxDirect - existingPerSource);
          const capacity = sourceCount * availablePerSource;

          const rawGrowth = sourceCount * membersPerYear * duplicationRate;
          const newMembers = Math.min(rawGrowth, capacity);
          const newShoppers = sourceCount * shoppersPerYear * duplicationRate;

          if (newMembers > 0) {
            addAtLevel(targetLeg.membersByLevel, level + 1, newMembers);
            memberGrowth += newMembers;
          }

          if (newShoppers > 0) {
            addAtLevel(targetLeg.shoppersByLevel, level + 1, newShoppers);
            shopperGrowth += newShoppers;
          }
        }
      }

      const attrition = applyLegMemberAttrition(legs, attritionRate);
      legs = attrition.legs;
      memberAttrition += attrition.memberAttrition;
    }

    const membersByLevel = aggregateLegLevels(legs, 'membersByLevel');
    const shoppersByLevel = aggregateLegLevels(legs, 'shoppersByLevel');
    mergeLevels(shoppersByLevel, directRootShoppersByLevel);
    const directLegs = membersByLevel[0] ?? 0;
    const snapshotLegs = modulator
      ? modulator.splitLegs({
          year,
          monthIndex: month,
          membersByLevel,
          shoppersByLevel,
          directLegs,
          legs: cloneLegs(legs),
          inputs,
        })
      : cloneLegs(legs);

    snapshots.push({
      membersByLevel: [...membersByLevel],
      shoppersByLevel,
      directLegs,
      legs: snapshotLegs,
      memberGrowth,
      memberAttrition,
      shopperGrowth,
      shopperAttrition,
    });

    if (month % 12 === 11) {
      modulator?.afterYear?.(year, snapshotLegs);
    }
  }

  return snapshots;
}

export function totalNetworkSize(snapshot: NetworkSnapshot): number {
  return totalMembers(snapshot) + totalShoppers(snapshot);
}

export function totalMembers(snapshot: NetworkSnapshot): number {
  return sum(snapshot.membersByLevel);
}

export function totalShoppers(snapshot: NetworkSnapshot): number {
  return sum(snapshot.shoppersByLevel);
}

/**
 * Wendet Fluktuation pro Bein an. Level 0 (Wurzel-Member) ist absichtlich geschuetzt:
 * jeder Bein-Wurzel-Member identifiziert das Bein selbst und darf nicht "austreten",
 * sonst loest sich das Bein auf und verliert seine Identitaet ueber die Jahre.
 * Fluktuation wirkt nur auf tiefere Ebenen; Vakanzen werden durch Children kompensiert
 * (Compression), aber niemals ueber den Cap hinaus.
 */
function applyLegMemberAttrition(
  legs: Leg[],
  attritionRate: number,
): { legs: Leg[]; memberAttrition: number } {
  if (attritionRate <= 0) {
    return { legs, memberAttrition: 0 };
  }

  let memberAttrition = 0;
  const nextLegs = legs.map((leg) => {
    const leavers = leg.membersByLevel.map((count, level) =>
      level === 0 ? 0 : count * attritionRate,
    );
    const membersByLevel = leg.membersByLevel.map((count, level) =>
      Math.max(0, count - leavers[level]),
    );
    memberAttrition += sum(leavers);

    for (let level = 1; level < leg.membersByLevel.length; level++) {
      const childLevel = level + 1;
      const vacancy = leavers[level] ?? 0;
      const childRemaining = membersByLevel[childLevel] ?? 0;
      const promotedFromChildLevel = Math.min(vacancy, childRemaining);
      if (promotedFromChildLevel <= 0) continue;

      membersByLevel[childLevel] -= promotedFromChildLevel;
      membersByLevel[level] += promotedFromChildLevel;
    }

    return {
      ...leg,
      membersByLevel: trimLevels(membersByLevel),
    };
  });

  return {
    legs: nextLegs,
    memberAttrition,
  };
}

/**
 * Shopper haben keine Downline-Identitaet und keine Compression. Fluktuation
 * wirkt deshalb direkt auf bestehende Shopper-Bestaende pro Bein und Ebene.
 * Neue Shopper des aktuellen Jahres werden erst nach diesem Schritt angelegt.
 */
function applyLegShopperAttrition(
  legs: Leg[],
  attritionRate: number,
): { legs: Leg[]; shopperAttrition: number } {
  if (attritionRate <= 0) {
    return { legs, shopperAttrition: 0 };
  }

  let shopperAttrition = 0;
  const nextLegs = legs.map((leg) => {
    const shoppersByLevel = leg.shoppersByLevel.map((count) => {
      const leavers = count * attritionRate;
      shopperAttrition += leavers;
      return Math.max(0, count - leavers);
    });

    return {
      ...leg,
      shoppersByLevel: trimLevels(shoppersByLevel),
    };
  });

  return {
    legs: nextLegs,
    shopperAttrition,
  };
}

function applyShopperLevelAttrition(
  shoppersByLevel: number[],
  attritionRate: number,
): { shoppersByLevel: number[]; shopperAttrition: number } {
  if (attritionRate <= 0) {
    return { shoppersByLevel, shopperAttrition: 0 };
  }

  let shopperAttrition = 0;
  const nextShoppersByLevel = shoppersByLevel.map((count) => {
    const leavers = count * attritionRate;
    shopperAttrition += leavers;
    return Math.max(0, count - leavers);
  });

  return {
    shoppersByLevel: trimLevels(nextShoppersByLevel),
    shopperAttrition,
  };
}

function addAtLevel(levels: number[], level: number, count: number): void {
  if (count <= 0) return;
  while (levels.length <= level) {
    levels.push(0);
  }
  levels[level] += count;
}

function trimLevels(levels: number[]): number[] {
  let last = levels.length - 1;
  while (last >= 0 && levels[last] === 0) {
    last--;
  }
  return levels.slice(0, last + 1);
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function mergeLevels(target: number[], source: number[]): void {
  for (let level = 0; level < source.length; level++) {
    addAtLevel(target, level, source[level] ?? 0);
  }
}

function createDirectLegs(existingLegCount: number, count: number): Leg[] {
  const fullLegs = Math.floor(count);
  const remainder = count - fullLegs;
  const legs = Array.from({ length: fullLegs }, (_, index) => ({
    id: `leg-${existingLegCount + index + 1}`,
    membersByLevel: [1],
    shoppersByLevel: [],
  }));

  if (remainder > 1e-9) {
    legs.push({
      id: `leg-${existingLegCount + fullLegs + 1}`,
      membersByLevel: [remainder],
      shoppersByLevel: [],
    });
  }

  return legs;
}

function cloneLegs(legs: Leg[]): Leg[] {
  return legs.map((leg) => ({
    id: leg.id,
    membersByLevel: [...leg.membersByLevel],
    shoppersByLevel: [...leg.shoppersByLevel],
    ranksByLevel: leg.ranksByLevel ? [...leg.ranksByLevel] : undefined,
  }));
}

function distributeAtLevel(
  legs: Leg[],
  key: 'membersByLevel' | 'shoppersByLevel',
  level: number,
  count: number,
): void {
  if (legs.length <= 0 || count <= 0) return;
  const rootTotal = sum(legs.map((leg) => leg.membersByLevel[0] ?? 0));
  const fallbackShare = count / legs.length;
  for (const leg of legs) {
    const rootShare =
      rootTotal > 0 ? ((leg.membersByLevel[0] ?? 0) / rootTotal) * count : fallbackShare;
    addAtLevel(leg[key], level, rootShare);
  }
}

function aggregateLegLevels(
  legs: Leg[],
  key: 'membersByLevel' | 'shoppersByLevel',
): number[] {
  const levels: number[] = [];
  for (const leg of legs) {
    for (let level = 0; level < leg[key].length; level++) {
      addAtLevel(levels, level, leg[key][level] ?? 0);
    }
  }
  return trimLevels(levels);
}

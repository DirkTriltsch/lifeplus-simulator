/**
 * Netzwerk-Wachstumssimulation.
 *
 * Die Simulation arbeitet jahresbasiert, weil die Eingaben ebenfalls pro Jahr
 * erfolgen. Innerhalb eines Jahres bleiben die Werte stabil; am Jahresanfang
 * werden neue Members/Shopper erzeugt und austretende Shopper/Member behandelt.
 */

export interface NetworkInputs {
  membersPerYear: number;
  shoppersPerYear: number;
  duplicationRate: number;
  attritionRate: number;
}

export interface NetworkSnapshot {
  membersByLevel: number[];
  shoppersByLevel: number[];
  /** Direkte Members des Users = Beine */
  directLegs: number;
  memberGrowth: number;
  memberAttrition: number;
  shopperGrowth: number;
  shopperAttrition: number;
}

interface ShopperCohort {
  level: number;
  count: number;
  ageMonths: number;
}

export function simulateNetwork(
  inputs: NetworkInputs,
  totalMonths: number,
): NetworkSnapshot[] {
  const { membersPerYear, shoppersPerYear, duplicationRate, attritionRate } =
    inputs;
  const monthlyShopperAttritionRate = Math.max(0, attritionRate / 12);

  let membersByLevel: number[] = [];
  let shopperCohorts: ShopperCohort[] = [];
  const snapshots: NetworkSnapshot[] = [];

  for (let month = 0; month < totalMonths; month++) {
    const isYearStart = month % 12 === 0;
    let memberGrowth = 0;
    let memberAttrition = 0;
    let shopperGrowth = 0;
    let shopperAttrition = 0;

    shopperCohorts = shopperCohorts.map((cohort) => ({
      ...cohort,
      ageMonths: cohort.ageMonths + 1,
    }));

    shopperCohorts = shopperCohorts
      .map((cohort) => {
        if (cohort.ageMonths <= 13 || monthlyShopperAttritionRate <= 0) {
          return cohort;
        }

        const leaving = cohort.count * monthlyShopperAttritionRate;
        shopperAttrition += leaving;

        return {
          ...cohort,
          count: Math.max(0, cohort.count - leaving),
        };
      })
      .filter((cohort) => cohort.count > 0);

    if (isYearStart) {
      const hadMembersBeforeRecruiting = sum(membersByLevel) > 0;

      const directMembers = membersPerYear;
      const directShoppers = shoppersPerYear;

      addAtLevel(membersByLevel, 0, directMembers);
      memberGrowth += directMembers;

      if (directShoppers > 0) {
        shopperCohorts.push({
          level: 0,
          count: directShoppers,
          ageMonths: 0,
        });
        shopperGrowth += directShoppers;
      }

      const sourceMembers = hadMembersBeforeRecruiting
        ? [...membersByLevel]
        : membersByLevel.map(() => 0);

      for (let level = 0; level < sourceMembers.length; level++) {
        const sourceCount = sourceMembers[level];
        if (sourceCount <= 0) continue;

        const newMembers = sourceCount * membersPerYear * duplicationRate;
        const newShoppers = sourceCount * shoppersPerYear * duplicationRate;

        addAtLevel(membersByLevel, level + 1, newMembers);
        memberGrowth += newMembers;

        if (newShoppers > 0) {
          shopperCohorts.push({
            level: level + 1,
            count: newShoppers,
            ageMonths: 0,
          });
          shopperGrowth += newShoppers;
        }
      }

      const attrition = applyMemberAttrition(membersByLevel, attritionRate);
      membersByLevel = attrition.membersByLevel;
      memberAttrition += attrition.memberAttrition;
    }

    snapshots.push({
      membersByLevel: [...membersByLevel],
      shoppersByLevel: cohortsToLevels(shopperCohorts),
      directLegs: membersByLevel[0] ?? 0,
      memberGrowth,
      memberAttrition,
      shopperGrowth,
      shopperAttrition,
    });
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

function applyMemberAttrition(
  membersByLevel: number[],
  attritionRate: number,
): { membersByLevel: number[]; memberAttrition: number } {
  if (attritionRate <= 0) {
    return { membersByLevel, memberAttrition: 0 };
  }

  const next = [...membersByLevel];
  let memberAttrition = 0;

  for (let level = 0; level < membersByLevel.length; level++) {
    const leaving = membersByLevel[level] * attritionRate;
    if (leaving <= 0) continue;

    next[level] -= leaving;
    memberAttrition += leaving;

    const childLevel = level + 1;
    const promotedFromChildLevel = membersByLevel[childLevel] * attritionRate;
    if (promotedFromChildLevel > 0) {
      next[childLevel] -= promotedFromChildLevel;
      next[level] += promotedFromChildLevel;
    }
  }

  return {
    membersByLevel: trimLevels(next.map((value) => Math.max(0, value))),
    memberAttrition,
  };
}

function addAtLevel(levels: number[], level: number, count: number): void {
  if (count <= 0) return;
  while (levels.length <= level) {
    levels.push(0);
  }
  levels[level] += count;
}

function cohortsToLevels(cohorts: ShopperCohort[]): number[] {
  const levels: number[] = [];
  for (const cohort of cohorts) {
    addAtLevel(levels, cohort.level, cohort.count);
  }
  return trimLevels(levels);
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

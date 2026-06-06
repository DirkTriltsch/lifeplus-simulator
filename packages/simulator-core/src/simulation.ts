/**
 * Haupt-Simulationslauf.
 */

import type {
  ProductDefinition,
  SimulatorInputs,
  TreeCompensationResult,
} from './contracts';
import type { Leg, NetworkSnapshot } from './network-snapshot';
import { personTreeToNetworkSnapshot, type PersonTreeSnapshot } from './person-tree';
import { simulatePersonTreeYearEnds, type TreeGrowthStrategy } from './tree-generator';

const DEFAULT_UNIT_TO_CURRENCY = 1;
const MONTHS_PER_YEAR = 12;
const MONTHS_PER_QUARTER = 3;
const DEFAULT_TOTAL_MONTHS = 120;

export interface QuarterResult {
  quarterIndex: number;
  year: number;
  quarterInYear: number;
  periodMonths: number;
  membersByLevel: number[];
  shoppersByLevel: number[];
  legs: Leg[];
  totalEUR: number;
  phase1EUR: number;
  phase2EUR: number;
  phase3EUR: number;
  rankName: string;
  av: number;
  qgv: number;
  bronzeLegs: number;
  diamondLegs: number;
  networkSize: number;
  directLegs: number;
  members: number;
  shoppers: number;
  memberGrowth: number;
  memberAttrition: number;
  shopperGrowth: number;
  shopperAttrition: number;
}

export interface YearSummary {
  year: number;
  members: number;
  directLegs: number;
  shoppers: number;
  networkSize: number;
  av: number;
  qgv: number;
  bronzeLegs: number;
  diamondLegs: number;
  memberGrowth: number;
  memberAttrition: number;
  shopperGrowth: number;
  shopperAttrition: number;
  rankName: string;
  totalEUR: number;
}

export interface SimulationResult {
  quarters: QuarterResult[];
  finalQuarter: QuarterResult;
  yearEnds: QuarterResult[];
  yearSummaries: YearSummary[];
  personYearEnds?: PersonTreeSnapshot[];
  treeCompensationYearEnds?: TreeCompensationResult[];
}

export interface RunSimulationOptions {
  simulationMode?: SimulationMode;
  treeGrowthStrategy?: TreeGrowthStrategy;
}

export type SimulationMode =
  | 'standard'
  | 'person-tree'
  | 'person-tree-random'
  | 'person-tree-momentum';

export function runSimulation(
  product: ProductDefinition,
  inputs: SimulatorInputs,
  totalMonths: number = DEFAULT_TOTAL_MONTHS,
  options: RunSimulationOptions = {},
): SimulationResult {
  const unitToCurrency = inputs.unitToCurrency ?? DEFAULT_UNIT_TO_CURRENCY;
  const totalYears = Math.max(1, Math.ceil(totalMonths / MONTHS_PER_YEAR));
  const mode = options.simulationMode ?? 'standard';

  if (mode === 'standard') {
    const snapshots = simulateAggregateYearEnds(inputs, totalYears);
    const annualQuarters = snapshots.map((snapshot, yearIndex) =>
      buildQuarterResult({
        snapshot,
        yearIndex,
        comp: product.simulator.plan.calculateMonth(snapshot, inputs),
        unitToCurrency,
      }),
    );

    return buildSimulationResult({
      annualQuarters,
      totalMonths,
    });
  }

  const personYearEnds = simulatePersonTreeYearEnds(inputs, totalYears, {
    growthStrategy: options.treeGrowthStrategy,
    memberAttritionEligibility: product.simulator.plan
      .selectTreeMemberChurnCandidates
      ? (snapshot) =>
          product.simulator.plan.selectTreeMemberChurnCandidates?.(
            snapshot,
            inputs,
          )
      : undefined,
  });
  const snapshots = personYearEnds.map(personTreeToNetworkSnapshot);
  const calculateTreeMonth = product.simulator.plan.calculateTreeMonth;
  const treeCompensationYearEnds = calculateTreeMonth
    ? personYearEnds.map((personYearEnd) =>
        calculateTreeMonth(personYearEnd, inputs),
      )
    : undefined;

  const annualQuarters: QuarterResult[] = snapshots.map((snapshot, yearIndex) =>
    buildQuarterResult({
      snapshot,
      yearIndex,
      comp:
        treeCompensationYearEnds?.[yearIndex] ??
        product.simulator.plan.calculateMonth(snapshot, inputs),
      unitToCurrency,
    }),
  );

  return buildSimulationResult({
    annualQuarters,
    totalMonths,
    personYearEnds,
    treeCompensationYearEnds,
  });
}

function buildSimulationResult(input: {
  annualQuarters: QuarterResult[];
  totalMonths: number;
  personYearEnds?: PersonTreeSnapshot[];
  treeCompensationYearEnds?: TreeCompensationResult[];
}): SimulationResult {
  const quarters = expandAnnualQuarters(input.annualQuarters, input.totalMonths);

  const yearEnds = quarters.filter((quarter) => quarter.quarterInYear === 4);
  const yearSummaries = yearEnds.map((yearEnd) => {
    const yearQuarters = quarters.filter((quarter) => quarter.year === yearEnd.year);

    return {
      year: yearEnd.year,
      members: yearEnd.members,
      directLegs: yearEnd.directLegs,
      shoppers: yearEnd.shoppers,
      networkSize: yearEnd.networkSize,
      av: yearEnd.av,
      qgv: yearEnd.qgv,
      bronzeLegs: yearEnd.bronzeLegs,
      diamondLegs: yearEnd.diamondLegs,
      memberGrowth: sum(yearQuarters.map((quarter) => quarter.memberGrowth)),
      memberAttrition: sum(yearQuarters.map((quarter) => quarter.memberAttrition)),
      shopperGrowth: sum(yearQuarters.map((quarter) => quarter.shopperGrowth)),
      shopperAttrition: sum(yearQuarters.map((quarter) => quarter.shopperAttrition)),
      rankName: yearEnd.rankName,
      totalEUR: yearEnd.totalEUR,
    };
  });

  return {
    quarters,
    finalQuarter: quarters[quarters.length - 1],
    yearEnds,
    yearSummaries,
    personYearEnds: input.personYearEnds,
    treeCompensationYearEnds: input.treeCompensationYearEnds,
  };
}

function buildQuarterResult(input: {
  snapshot: NetworkSnapshot;
  yearIndex: number;
  comp: {
    totalUnits: number;
    phase1Units: number;
    phase2Units: number;
    phase3Units: number;
    rankName: string;
    av: number;
    qgv: number;
    bronzeLegs?: number;
    diamondLegs?: number;
    networkSize: number;
    directLegs: number;
    members: number;
    shoppers: number;
  };
  unitToCurrency: number;
}): QuarterResult {
  const { snapshot, yearIndex, comp, unitToCurrency } = input;

  return {
    quarterIndex: (yearIndex + 1) * 4 - 1,
    year: yearIndex + 1,
    quarterInYear: 4,
    periodMonths: MONTHS_PER_QUARTER,
    membersByLevel: snapshot.membersByLevel,
    shoppersByLevel: snapshot.shoppersByLevel,
    legs: snapshot.legs,
    totalEUR: comp.totalUnits * unitToCurrency,
    phase1EUR: comp.phase1Units * unitToCurrency,
    phase2EUR: comp.phase2Units * unitToCurrency,
    phase3EUR: comp.phase3Units * unitToCurrency,
    rankName: comp.rankName,
    av: comp.av,
    qgv: comp.qgv,
    bronzeLegs: comp.bronzeLegs ?? 0,
    diamondLegs: comp.diamondLegs ?? 0,
    networkSize: comp.networkSize,
    directLegs: comp.directLegs,
    members: comp.members,
    shoppers: comp.shoppers,
    memberGrowth: snapshot.memberGrowth,
    memberAttrition: snapshot.memberAttrition,
    shopperGrowth: snapshot.shopperGrowth,
    shopperAttrition: snapshot.shopperAttrition,
  };
}

function expandAnnualQuarters(
  annualQuarters: QuarterResult[],
  totalMonths: number,
): QuarterResult[] {
  const quarters: QuarterResult[] = [];

  for (const annualQuarter of annualQuarters) {
    const yearStartMonthIndex = (annualQuarter.year - 1) * MONTHS_PER_YEAR;
    for (
      let quarterStartOffset = 0;
      quarterStartOffset < MONTHS_PER_YEAR;
      quarterStartOffset += MONTHS_PER_QUARTER
    ) {
      const quarterStartMonthIndex = yearStartMonthIndex + quarterStartOffset;
      if (quarterStartMonthIndex >= totalMonths) break;
      const quarterEndMonthIndex = Math.min(
        quarterStartMonthIndex + MONTHS_PER_QUARTER - 1,
        totalMonths - 1,
      );
      const isYearStart = quarterStartOffset === 0;
      const quarterIndex = Math.floor(quarterEndMonthIndex / MONTHS_PER_QUARTER);
      quarters.push({
        ...annualQuarter,
        quarterIndex,
        quarterInYear: (quarterIndex % 4) + 1,
        periodMonths: quarterEndMonthIndex - quarterStartMonthIndex + 1,
        memberGrowth: isYearStart ? annualQuarter.memberGrowth : 0,
        memberAttrition: isYearStart ? annualQuarter.memberAttrition : 0,
        shopperGrowth: isYearStart ? annualQuarter.shopperGrowth : 0,
        shopperAttrition: isYearStart ? annualQuarter.shopperAttrition : 0,
      });
    }
  }

  return quarters;
}

function simulateAggregateYearEnds(
  inputs: SimulatorInputs,
  totalYears: number,
): NetworkSnapshot[] {
  const maxDirectMembers = Math.max(
    1,
    inputs.maxDirectMembersPerMember ?? 29,
  );
  const duplicationRate = Math.max(0, inputs.duplicationRate);
  const attritionRate = Math.min(1, Math.max(0, inputs.attritionRate));
  const membersByLevel: number[] = [];
  const shoppersByLevel: number[] = [];
  const snapshots: NetworkSnapshot[] = [];

  for (let yearIndex = 0; yearIndex < totalYears; yearIndex++) {
    const memberAttrition = applyAggregateMemberAttrition(
      membersByLevel,
      attritionRate,
    );
    const shopperAttrition = applyAttrition(shoppersByLevel, attritionRate);
    const sourceMembersByLevel = membersByLevel.slice();

    const directMemberCapacity = Math.max(
      0,
      maxDirectMembers - (membersByLevel[0] ?? 0),
    );
    const directMemberGrowth = Math.min(
      Math.max(0, inputs.membersPerYear),
      directMemberCapacity,
    );
    const directShopperGrowth = Math.max(0, inputs.shoppersPerYear);
    addAtLevel(membersByLevel, 0, directMemberGrowth);
    addAtLevel(shoppersByLevel, 0, directShopperGrowth);

    const duplicatedMembersPerSource = Math.min(
      Math.max(0, inputs.membersPerYear) * duplicationRate,
      maxDirectMembers,
    );
    const duplicatedShoppersPerSource =
      Math.max(0, inputs.shoppersPerYear) * duplicationRate;
    let duplicatedMemberGrowth = 0;
    let duplicatedShopperGrowth = 0;

    for (let level = 0; level < sourceMembersByLevel.length; level++) {
      const sourceCount = sourceMembersByLevel[level] ?? 0;
      if (sourceCount <= 0) continue;

      const newMembers = sourceCount * duplicatedMembersPerSource;
      const newShoppers = sourceCount * duplicatedShoppersPerSource;
      addAtLevel(membersByLevel, level + 1, newMembers);
      addAtLevel(shoppersByLevel, level + 1, newShoppers);
      duplicatedMemberGrowth += newMembers;
      duplicatedShopperGrowth += newShoppers;
    }

    trimTrailingZeros(membersByLevel);
    trimTrailingZeros(shoppersByLevel);

    snapshots.push({
      membersByLevel: membersByLevel.slice(),
      shoppersByLevel: shoppersByLevel.slice(),
      directLegs: membersByLevel[0] ?? 0,
      legs: buildAggregateLegs(membersByLevel, shoppersByLevel),
      memberGrowth: directMemberGrowth + duplicatedMemberGrowth,
      memberAttrition,
      shopperGrowth: directShopperGrowth + duplicatedShopperGrowth,
      shopperAttrition,
    });
  }

  return snapshots;
}

function buildAggregateLegs(
  membersByLevel: number[],
  shoppersByLevel: number[],
): Leg[] {
  const directMembers = membersByLevel[0] ?? 0;
  if (directMembers <= 0) return [];

  const fullLegs = Math.floor(directMembers);
  const fractionalLeg = directMembers - fullLegs;
  const legWeights = [
    ...Array.from({ length: fullLegs }, () => 1),
    ...(fractionalLeg > 1e-9 ? [fractionalLeg] : []),
  ];

  return legWeights.map((weight, index) => ({
    id: `leg-${index + 1}`,
    membersByLevel: membersByLevel.map((count, level) =>
      level === 0 ? weight : (count * weight) / directMembers,
    ),
    shoppersByLevel: shoppersByLevel.map((count, level) =>
      level === 0 ? 0 : (count * weight) / directMembers,
    ),
  }));
}

function applyAggregateMemberAttrition(
  membersByLevel: number[],
  attritionRate: number,
): number {
  let attrition = 0;

  for (let level = 1; level < membersByLevel.length; level++) {
    const lost = (membersByLevel[level] ?? 0) * attritionRate;
    membersByLevel[level] = Math.max(0, (membersByLevel[level] ?? 0) - lost);
    attrition += lost;
  }

  trimTrailingZeros(membersByLevel);
  return attrition;
}

function applyAttrition(values: number[], attritionRate: number): number {
  let attrition = 0;

  for (let index = 0; index < values.length; index++) {
    const lost = (values[index] ?? 0) * attritionRate;
    values[index] = Math.max(0, (values[index] ?? 0) - lost);
    attrition += lost;
  }

  trimTrailingZeros(values);
  return attrition;
}

function addAtLevel(values: number[], level: number, count: number): void {
  if (count <= 0) return;
  values[level] = (values[level] ?? 0) + count;
}

function trimTrailingZeros(values: number[]): void {
  while (values.length > 0 && Math.abs(values[values.length - 1] ?? 0) < 1e-9) {
    values.pop();
  }
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

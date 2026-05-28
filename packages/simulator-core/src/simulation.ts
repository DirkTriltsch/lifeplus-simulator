/**
 * Haupt-Simulationslauf.
 */

import type {
  ProductDefinition,
  SimulatorInputs,
  TreeCompensationResult,
} from './contracts';
import { simulateNetwork, type Leg, type NetworkInputs } from './network';
import { personTreeToNetworkSnapshot, type PersonTreeSnapshot } from './person-tree';
import type { GrowthModulator } from './pipeline';
import { simulatePersonTree, type TreeGrowthStrategy } from './tree-generator';

const DEFAULT_UNIT_TO_CURRENCY = 1;
const MONTHS_PER_YEAR = 12;
const DEFAULT_TOTAL_MONTHS = 120;

export interface MonthResult {
  monthIndex: number;
  year: number;
  monthInYear: number;
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
  months: MonthResult[];
  finalMonth: MonthResult;
  yearEnds: MonthResult[];
  yearSummaries: YearSummary[];
  personMonths?: PersonTreeSnapshot[];
  personYearEnds?: PersonTreeSnapshot[];
  treeCompensations?: TreeCompensationResult[];
  treeCompensationYearEnds?: TreeCompensationResult[];
}

export interface RunSimulationOptions {
  growthModulator?: GrowthModulator;
  treeGrowthStrategy?: TreeGrowthStrategy;
}

export function runSimulation(
  product: ProductDefinition,
  inputs: SimulatorInputs,
  totalMonths: number = DEFAULT_TOTAL_MONTHS,
  options: RunSimulationOptions = {},
): SimulationResult {
  const unitToCurrency = inputs.unitToCurrency ?? DEFAULT_UNIT_TO_CURRENCY;

  const networkInputs: NetworkInputs = {
    membersPerYear: inputs.membersPerYear,
    shoppersPerYear: inputs.shoppersPerYear,
    duplicationRate: inputs.duplicationRate,
    attritionRate: inputs.attritionRate,
    maxDirectMembersPerMember: inputs.maxDirectMembersPerMember,
  };

  const personMonths = options.growthModulator
    ? undefined
    : simulatePersonTree(inputs, totalMonths, {
        growthStrategy: options.treeGrowthStrategy,
      });
  const snapshots = options.growthModulator
    ? simulateNetwork(networkInputs, totalMonths, {
        growthModulator: options.growthModulator,
      })
    : personMonths?.map(personTreeToNetworkSnapshot) ?? [];
  const calculateTreeMonth = product.simulator.plan.calculateTreeMonth;
  const treeCompensations =
    personMonths && calculateTreeMonth
      ? calculateAnnualTreeCompensations(personMonths, inputs, calculateTreeMonth)
      : undefined;

  const months: MonthResult[] = snapshots.map((snapshot, monthIndex) => {
    const comp =
      treeCompensations?.[monthIndex] ??
      product.simulator.plan.calculateMonth(snapshot, inputs);

    return {
      monthIndex,
      year: Math.floor(monthIndex / MONTHS_PER_YEAR) + 1,
      monthInYear: (monthIndex % MONTHS_PER_YEAR) + 1,
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
  });

  const yearEnds = months.filter((m) => m.monthInYear === MONTHS_PER_YEAR);
  const yearSummaries = yearEnds.map((yearEnd) => {
    const yearMonths = months.filter((m) => m.year === yearEnd.year);

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
      memberGrowth: sum(yearMonths.map((m) => m.memberGrowth)),
      memberAttrition: sum(yearMonths.map((m) => m.memberAttrition)),
      shopperGrowth: sum(yearMonths.map((m) => m.shopperGrowth)),
      shopperAttrition: sum(yearMonths.map((m) => m.shopperAttrition)),
      rankName: yearEnd.rankName,
      totalEUR: yearEnd.totalEUR,
    };
  });

  return {
    months,
    finalMonth: months[months.length - 1],
    yearEnds,
    yearSummaries,
    personMonths,
    personYearEnds: personMonths?.filter((m) => m.monthInYear === MONTHS_PER_YEAR),
    treeCompensations,
    treeCompensationYearEnds: treeCompensations?.filter(
      (_comp, index) => (index % MONTHS_PER_YEAR) + 1 === MONTHS_PER_YEAR,
    ),
  };
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function calculateAnnualTreeCompensations(
  personMonths: PersonTreeSnapshot[],
  inputs: SimulatorInputs,
  calculateTreeMonth: NonNullable<
    ProductDefinition['simulator']['plan']['calculateTreeMonth']
  >,
): TreeCompensationResult[] {
  const compensations: TreeCompensationResult[] = [];
  let index = 0;

  while (index < personMonths.length) {
    const year = personMonths[index].year;
    let endIndex = index;

    while (
      endIndex + 1 < personMonths.length &&
      personMonths[endIndex + 1].year === year
    ) {
      endIndex++;
    }

    const yearEndCompensation = calculateTreeMonth(personMonths[endIndex], inputs);
    for (let monthIndex = index; monthIndex <= endIndex; monthIndex++) {
      compensations[monthIndex] = yearEndCompensation;
    }
    index = endIndex + 1;
  }

  return compensations;
}

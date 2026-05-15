/**
 * Haupt-Simulationslauf.
 */

import type { ProductDefinition, SimulatorInputs } from './contracts';
import { simulateNetwork, type NetworkInputs } from './network';

const DEFAULT_UNIT_TO_CURRENCY = 1;
const MONTHS_PER_YEAR = 12;
const DEFAULT_TOTAL_MONTHS = 120;

export interface MonthResult {
  monthIndex: number;
  year: number;
  monthInYear: number;
  membersByLevel: number[];
  shoppersByLevel: number[];
  totalEUR: number;
  phase1EUR: number;
  phase2EUR: number;
  phase3EUR: number;
  rankName: string;
  av: number;
  qgv: number;
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
}

export function runSimulation(
  product: ProductDefinition,
  inputs: SimulatorInputs,
  totalMonths: number = DEFAULT_TOTAL_MONTHS,
): SimulationResult {
  const unitToCurrency = inputs.unitToCurrency ?? DEFAULT_UNIT_TO_CURRENCY;

  const networkInputs: NetworkInputs = {
    membersPerYear: inputs.membersPerYear,
    shoppersPerYear: inputs.shoppersPerYear,
    duplicationRate: inputs.duplicationRate,
    attritionRate: inputs.attritionRate,
  };

  const snapshots = simulateNetwork(networkInputs, totalMonths);

  const months: MonthResult[] = snapshots.map((snapshot, monthIndex) => {
    const comp = product.simulator.plan.calculateMonth(snapshot, inputs);

    return {
      monthIndex,
      year: Math.floor(monthIndex / MONTHS_PER_YEAR) + 1,
      monthInYear: (monthIndex % MONTHS_PER_YEAR) + 1,
      membersByLevel: snapshot.membersByLevel,
      shoppersByLevel: snapshot.shoppersByLevel,
      totalEUR: comp.totalUnits * unitToCurrency,
      phase1EUR: comp.phase1Units * unitToCurrency,
      phase2EUR: comp.phase2Units * unitToCurrency,
      phase3EUR: comp.phase3Units * unitToCurrency,
      rankName: comp.rankName,
      av: comp.av,
      qgv: comp.qgv,
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
  };
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

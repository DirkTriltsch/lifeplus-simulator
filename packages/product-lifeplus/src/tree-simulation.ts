import {
  personTreeToNetworkSnapshot,
  simulatePersonTree,
  type MonthResult,
  type SimulationResult,
  type SimulatorInputs,
  type YearSummary,
} from '@mlm/simulator-core';
import { calculateTreeCompensation } from './tree-compensation';

const DEFAULT_UNIT_TO_CURRENCY = 1;
const DEFAULT_TOTAL_MONTHS = 120;
const MONTHS_PER_YEAR = 12;

export function runLifeplusTreeSimulation(
  inputs: SimulatorInputs,
  totalMonths: number = DEFAULT_TOTAL_MONTHS,
): SimulationResult {
  const unitToCurrency = inputs.unitToCurrency ?? DEFAULT_UNIT_TO_CURRENCY;
  const treeSnapshots = simulatePersonTree(inputs, totalMonths);

  const months: MonthResult[] = treeSnapshots.map((treeSnapshot) => {
    const networkSnapshot = personTreeToNetworkSnapshot(treeSnapshot);
    const comp = calculateTreeCompensation(treeSnapshot, {
      rootPersonalMonthlyVolume:
        inputs.personalMonthlyVolume ?? inputs.memberMonthlyVolume,
    });

    return {
      monthIndex: treeSnapshot.monthIndex,
      year: treeSnapshot.year,
      monthInYear: treeSnapshot.monthInYear,
      membersByLevel: networkSnapshot.membersByLevel,
      shoppersByLevel: networkSnapshot.shoppersByLevel,
      legs: networkSnapshot.legs,
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
      memberGrowth: treeSnapshot.memberGrowth,
      memberAttrition: treeSnapshot.memberAttrition,
      shopperGrowth: treeSnapshot.shopperGrowth,
      shopperAttrition: treeSnapshot.shopperAttrition,
    };
  });
  const yearEnds = months.filter((month) => month.monthInYear === MONTHS_PER_YEAR);
  const yearSummaries = buildYearSummaries(months, yearEnds);

  return {
    months,
    finalMonth: months[months.length - 1],
    yearEnds,
    yearSummaries,
  };
}

function buildYearSummaries(
  months: MonthResult[],
  yearEnds: MonthResult[],
): YearSummary[] {
  return yearEnds.map((yearEnd) => {
    const yearMonths = months.filter((month) => month.year === yearEnd.year);

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
      memberGrowth: sum(yearMonths.map((month) => month.memberGrowth)),
      memberAttrition: sum(yearMonths.map((month) => month.memberAttrition)),
      shopperGrowth: sum(yearMonths.map((month) => month.shopperGrowth)),
      shopperAttrition: sum(yearMonths.map((month) => month.shopperAttrition)),
      rankName: yearEnd.rankName,
      totalEUR: yearEnd.totalEUR,
    };
  });
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

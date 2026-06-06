import {
  personTreeToNetworkSnapshot,
  simulatePersonTreeYearEnds,
  type QuarterResult,
  type SimulationResult,
  type SimulatorInputs,
  type YearSummary,
} from '@mlm/simulator-core';
import { calculateTreeCompensation } from './tree-compensation';

const DEFAULT_UNIT_TO_CURRENCY = 1;
const DEFAULT_TOTAL_MONTHS = 120;
const MONTHS_PER_YEAR = 12;
const MONTHS_PER_QUARTER = 3;

export function runLifeplusTreeSimulation(
  inputs: SimulatorInputs,
  totalMonths: number = DEFAULT_TOTAL_MONTHS,
): SimulationResult {
  const unitToCurrency = inputs.unitToCurrency ?? DEFAULT_UNIT_TO_CURRENCY;
  const totalYears = Math.max(1, Math.ceil(totalMonths / MONTHS_PER_YEAR));
  const treeSnapshots = simulatePersonTreeYearEnds(inputs, totalYears, {
    memberAttritionEligibility: (snapshot) =>
      selectLifeplusMemberChurnCandidates(snapshot, inputs),
  });

  const annualQuarters: QuarterResult[] = treeSnapshots.map((treeSnapshot) => {
    const networkSnapshot = personTreeToNetworkSnapshot(treeSnapshot);
    const comp = calculateTreeCompensation(treeSnapshot, {
      rootPersonalMonthlyVolume:
        inputs.personalMonthlyVolume ?? inputs.memberMonthlyVolume,
    });

    return {
      quarterIndex: treeSnapshot.year * 4 - 1,
      year: treeSnapshot.year,
      quarterInYear: 4,
      periodMonths: MONTHS_PER_QUARTER,
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
  const quarters = expandAnnualQuarters(annualQuarters, totalMonths);
  const yearEnds = quarters.filter((quarter) => quarter.quarterInYear === 4);
  const yearSummaries = buildYearSummaries(quarters, yearEnds);

  return {
    quarters,
    finalQuarter: quarters[quarters.length - 1],
    yearEnds,
    yearSummaries,
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

function buildYearSummaries(
  quarters: QuarterResult[],
  yearEnds: QuarterResult[],
): YearSummary[] {
  return yearEnds.map((yearEnd) => {
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
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function selectLifeplusMemberChurnCandidates(
  snapshot: Parameters<typeof calculateTreeCompensation>[0],
  inputs: SimulatorInputs,
): string[] {
  const churnableRanks = new Set(['Member', 'Believer', 'Builder', 'Bronze']);
  const activeMemberIds = new Set(
    snapshot.persons
      .filter((person) => person.active && person.kind === 'member')
      .map((person) => person.id),
  );
  const comp = calculateTreeCompensation(snapshot, {
    rootPersonalMonthlyVolume:
      inputs.personalMonthlyVolume ?? inputs.memberMonthlyVolume,
  });

  return comp.rankStates
    .filter(
      (state) =>
        activeMemberIds.has(state.personId) &&
        churnableRanks.has(state.rank.name),
    )
    .map((state) => state.personId);
}

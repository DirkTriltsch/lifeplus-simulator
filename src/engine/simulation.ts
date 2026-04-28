/**
 * Haupt-Simulationslauf.
 */

import { simulateNetwork, type NetworkInputs } from './network';
import {
  calculateMonthlyCompensation,
  type CompensationInputs,
  type MonthlyCompensation,
} from './compensation';
import { DEFAULT_IP_TO_EUR, MONTHS_PER_YEAR, TOTAL_MONTHS } from './constants';

export interface SimulationInputs {
  membersPerYear: number;
  shoppersPerYear: number;
  duplicationRate: number;
  attritionRate: number;
  memberMonthlyIP: number;
  shopperMonthlyIP: number;
  /** Eigenes Aktivitaetsvolumen. Default: memberMonthlyIP. */
  personalMonthlyIP?: number;
  ipToEur?: number;
}

export interface MonthResult {
  monthIndex: number;
  year: number;
  monthInYear: number;
  totalEUR: number;
  phase1EUR: number;
  phase2EUR: number;
  phase3EUR: number;
  rankName: string;
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
  inputs: SimulationInputs,
  totalMonths: number = TOTAL_MONTHS,
): SimulationResult {
  const ipToEur = inputs.ipToEur ?? DEFAULT_IP_TO_EUR;

  const networkInputs: NetworkInputs = {
    membersPerYear: inputs.membersPerYear,
    shoppersPerYear: inputs.shoppersPerYear,
    duplicationRate: inputs.duplicationRate,
    attritionRate: inputs.attritionRate,
  };

  const compensationInputs: CompensationInputs = {
    personalMonthlyIP: inputs.personalMonthlyIP ?? inputs.memberMonthlyIP,
    memberMonthlyIP: inputs.memberMonthlyIP,
    shopperMonthlyIP: inputs.shopperMonthlyIP,
  };

  const snapshots = simulateNetwork(networkInputs, totalMonths);

  const months: MonthResult[] = snapshots.map((snapshot, monthIndex) => {
    const comp: MonthlyCompensation = calculateMonthlyCompensation(
      snapshot,
      compensationInputs,
    );

    return {
      monthIndex,
      year: Math.floor(monthIndex / MONTHS_PER_YEAR) + 1,
      monthInYear: (monthIndex % MONTHS_PER_YEAR) + 1,
      totalEUR: comp.totalIP * ipToEur,
      phase1EUR: comp.phase1IP * ipToEur,
      phase2EUR: comp.phase2IP * ipToEur,
      phase3EUR: comp.phase3IP * ipToEur,
      rankName: comp.rank.name,
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

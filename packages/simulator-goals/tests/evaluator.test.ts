import { describe, expect, it } from 'vitest';
import type {
  QuarterResult,
  SimulationResult,
  SimulatorInputs,
} from '@mlm/simulator-core';
import { evaluateGoals, type Goal } from '../src';

function makeQuarter(quarterIndex: number, totalEUR: number): QuarterResult {
  return {
    quarterIndex,
    year: Math.floor(quarterIndex / 4) + 1,
    quarterInYear: (quarterIndex % 4) + 1,
    periodMonths: 3,
    membersByLevel: [],
    shoppersByLevel: [],
    legs: [],
    totalEUR,
    phase1EUR: totalEUR,
    phase2EUR: 0,
    phase3EUR: 0,
    rankName: 'Member',
    av: 0,
    qgv: 0,
    bronzeLegs: 0,
    diamondLegs: 0,
    networkSize: 0,
    directLegs: 0,
    members: 0,
    shoppers: 0,
    memberGrowth: 0,
    memberAttrition: 0,
    shopperGrowth: 0,
    shopperAttrition: 0,
  };
}

function makeResult(
  quarterlyEUR: (quarter: number) => number,
  totalQuarters = 40,
): SimulationResult {
  const quarters = Array.from(
    { length: totalQuarters },
    (_, i) => makeQuarter(i, quarterlyEUR(i)),
  );
  const yearEnds = quarters.filter((q) => q.quarterInYear === 4);
  return {
    quarters,
    finalQuarter: quarters[quarters.length - 1],
    yearEnds,
    yearSummaries: yearEnds.map((m) => ({
      year: m.year,
      members: 0,
      directLegs: 0,
      shoppers: 0,
      networkSize: 0,
      av: 0,
      qgv: 0,
      bronzeLegs: 0,
      diamondLegs: 0,
      memberGrowth: 0,
      memberAttrition: 0,
      shopperGrowth: 0,
      shopperAttrition: 0,
      rankName: 'Member',
      totalEUR: m.totalEUR,
    })),
  };
}

const baseInputs: SimulatorInputs = {
  membersPerYear: 2,
  shoppersPerYear: 3,
  duplicationRate: 1,
  attritionRate: 0,
  memberMonthlyVolume: 45,
  shopperMonthlyVolume: 45,
  monthlyProductCostEUR: 100,
};

describe('evaluateGoals', () => {
  it('productsRefinanced verwendet inputs.monthlyProductCostEUR statt goal.amountEUR', () => {
    const goal: Goal = {
      id: 'p',
      label: 'Produkte',
      kind: 'productsRefinanced',
      amountEUR: 999, // wird ignoriert
    };
    const result = makeResult((m) => (m >= 5 ? 120 : 50));

    const [progress] = evaluateGoals(result, [goal], baseInputs);

    expect(progress.achieved).toBe(true);
    expect(progress.achievedInQuarterIndex).toBe(5);
    expect(progress.achievedAfterYears).toBe(1.5);
  });

  it('monthlyIncome misst Brutto-Provision', () => {
    const goal: Goal = {
      id: 'i',
      label: 'Income',
      kind: 'monthlyIncome',
      amountEUR: 1000,
    };
    const result = makeResult((m) => (m >= 30 ? 1500 : 200));

    const [progress] = evaluateGoals(result, [goal], baseInputs);

    expect(progress.achieved).toBe(true);
    expect(progress.achievedInQuarterIndex).toBe(30);
    expect(progress.currentValueEUR).toBe(1500);
  });

  it('monthlySurplus zieht productCost ab', () => {
    const goal: Goal = {
      id: 's',
      label: 'Surplus',
      kind: 'monthlySurplus',
      amountEUR: 1400,
    };
    // Surplus = totalEUR - 100; bei 1500 EUR -> Surplus 1400, gerade erreicht
    const result = makeResult((m) => (m >= 24 ? 1500 : 200));

    const [progress] = evaluateGoals(result, [goal], baseInputs);

    expect(progress.achieved).toBe(true);
    expect(progress.achievedInQuarterIndex).toBe(24);
  });

  it('yearlySurplus summiert ueber das Jahr', () => {
    const goal: Goal = {
      id: 'y',
      label: 'Urlaub',
      kind: 'yearlySurplus',
      amountEUR: 2000,
    };
    // Surplus 250 pro Monat, vier Quartale zu je drei Monaten -> 3000 EUR/Jahr.
    const result = makeResult(() => 350);

    const [progress] = evaluateGoals(result, [goal], baseInputs);

    expect(progress.achieved).toBe(true);
    expect(progress.achievedInYear).toBe(1);
  });

  it('yearlySurplus gewichtet Quartalsperioden mit drei Monaten', () => {
    const goal: Goal = {
      id: 'yq',
      label: 'Urlaub',
      kind: 'yearlySurplus',
      amountEUR: 2000,
    };
    const quarters = [0, 1, 2, 3].map((quarterIndex) => makeQuarter(quarterIndex, 350));
    const result: SimulationResult = {
      quarters,
      finalQuarter: quarters[quarters.length - 1],
      yearEnds: [quarters[quarters.length - 1]],
      yearSummaries: [],
    };

    const [progress] = evaluateGoals(result, [goal], baseInputs);

    expect(progress.achieved).toBe(true);
    expect(progress.achievedInQuarterIndex).toBe(3);
    expect(progress.achievedAfterYears).toBe(1);
    expect(progress.currentValueEUR).toBe(3000);
  });

  it('requiresRefinanced verzoegert das Ziel, bis auch Refinanzierung erreicht ist', () => {
    const goal: Goal = {
      id: 's',
      label: 'Surplus',
      kind: 'monthlySurplus',
      amountEUR: 50, // sehr niedrig
      requiresRefinanced: true,
    };
    // totalEUR steigt von 60 (surplus -40) auf 200 (surplus 100) in Quartal 20.
    // Refinanzierung (totalEUR >= 100) auch ab Quartal 20.
    // Surplus-Bedingung (surplus >= 50, also totalEUR >= 150) ab Quartal 30.
    const result = makeResult((m) => {
      if (m >= 30) return 200;
      if (m >= 20) return 120;
      return 60;
    });

    const [progress] = evaluateGoals(result, [goal], baseInputs);

    expect(progress.achieved).toBe(true);
    expect(progress.achievedInQuarterIndex).toBe(30);
  });

  it('blockedByRefinanced wird gesetzt, wenn das Ziel selbst erreicht waere, aber Refinanzierung nicht', () => {
    const goal: Goal = {
      id: 'i',
      label: 'Income',
      kind: 'monthlyIncome',
      amountEUR: 50, // sehr niedrig
      requiresRefinanced: true,
    };
    // totalEUR steigt nie ueber 80 -> Refinanzierung (>=100) nie erreicht.
    const result = makeResult(() => 80);

    const [progress] = evaluateGoals(result, [goal], baseInputs);

    expect(progress.achieved).toBe(false);
    expect(progress.blockedByRefinanced).toBe(true);
  });

  it('amountEUR === 0 deaktiviert das Ziel', () => {
    const goal: Goal = {
      id: 'i',
      label: 'Disabled',
      kind: 'monthlyIncome',
      amountEUR: 0,
    };
    const result = makeResult(() => 1000);

    const [progress] = evaluateGoals(result, [goal], baseInputs);

    expect(progress.achieved).toBe(false);
    expect(progress.percentage).toBe(0);
  });

  it('liefert percentage als ungebremsten Fortschrittswert', () => {
    const goal: Goal = {
      id: 'i',
      label: 'Income',
      kind: 'monthlyIncome',
      amountEUR: 1000,
    };
    const result = makeResult(() => 1500);

    const [progress] = evaluateGoals(result, [goal], baseInputs);

    expect(progress.percentage).toBeCloseTo(1.5);
  });
});

import type { QuarterResult, SimulationResult, SimulatorInputs } from '@mlm/simulator-core';
import type { Goal, GoalProgress } from './contracts';

const DEFAULT_PRODUCT_COST_EUR = 100;

export function evaluateGoals(
  result: SimulationResult,
  goals: Goal[],
  inputs: SimulatorInputs,
): GoalProgress[] {
  const productCost = inputs.monthlyProductCostEUR ?? DEFAULT_PRODUCT_COST_EUR;
  const refinancedFromQuarter = firstQuarterWhere(
    result.quarters,
    (m) => m.totalEUR >= productCost,
  )?.quarterIndex;

  return goals.map((goal) =>
    evaluateGoal(goal, result, productCost, refinancedFromQuarter),
  );
}

function evaluateGoal(
  goal: Goal,
  result: SimulationResult,
  productCost: number,
  refinancedFromQuarter: number | undefined,
): GoalProgress {
  const targetAmount =
    goal.kind === 'productsRefinanced' ? productCost : goal.amountEUR;

  if (targetAmount <= 0) {
    return {
      goal,
      achieved: false,
      currentValueEUR: 0,
      percentage: 0,
    };
  }

  const { firstHitQuarterIndex, currentValueEUR } = computeGoalSeries(
    goal,
    result,
    productCost,
  );

  const needsRefinanced = goal.requiresRefinanced ?? false;
  let effectiveHitQuarter = firstHitQuarterIndex;
  let blockedByRefinanced = false;

  if (needsRefinanced && firstHitQuarterIndex !== undefined) {
    if (refinancedFromQuarter === undefined) {
      effectiveHitQuarter = undefined;
      blockedByRefinanced = true;
    } else {
      effectiveHitQuarter = Math.max(firstHitQuarterIndex, refinancedFromQuarter);
    }
  }

  const achieved = effectiveHitQuarter !== undefined;
  const quarterSnapshot =
    achieved && effectiveHitQuarter !== undefined
      ? result.quarters.find((quarter) => quarter.quarterIndex === effectiveHitQuarter)
      : undefined;

  return {
    goal,
    achieved,
    achievedInQuarterIndex: quarterSnapshot?.quarterIndex,
    achievedInQuarter: quarterSnapshot?.quarterInYear,
    achievedInYear: quarterSnapshot?.year,
    achievedAfterYears: quarterSnapshot
      ? quarterSnapshot.year - 1 + quarterSnapshot.quarterInYear / 4
      : undefined,
    currentValueEUR,
    percentage: currentValueEUR / targetAmount,
    blockedByRefinanced: blockedByRefinanced || undefined,
  };
}

function computeGoalSeries(
  goal: Goal,
  result: SimulationResult,
  productCost: number,
): { firstHitQuarterIndex: number | undefined; currentValueEUR: number } {
  const targetAmount =
    goal.kind === 'productsRefinanced' ? productCost : goal.amountEUR;

  if (goal.kind === 'yearlySurplus') {
    const surplusByYear = new Map<number, number>();
    for (const m of result.quarters) {
      const surplus = (m.totalEUR - productCost) * periodMonths(m);
      surplusByYear.set(m.year, (surplusByYear.get(m.year) ?? 0) + surplus);
    }

    let firstHitQuarterIndex: number | undefined;
    for (const m of result.quarters) {
      const yearSurplus = surplusByYear.get(m.year) ?? 0;
      if (yearSurplus >= targetAmount) {
        firstHitQuarterIndex = lastQuarterOfYear(result.quarters, m.year)?.quarterIndex;
        break;
      }
    }

    const finalYear = result.finalQuarter.year;
    const currentValueEUR = surplusByYear.get(finalYear) ?? 0;

    return { firstHitQuarterIndex, currentValueEUR };
  }

  const valueOf = (m: QuarterResult): number =>
    goal.kind === 'monthlySurplus' ? m.totalEUR - productCost : m.totalEUR;

  const firstHitQuarterIndex = firstQuarterWhere(
    result.quarters,
    (m) => valueOf(m) >= targetAmount,
  )?.quarterIndex;

  return {
    firstHitQuarterIndex,
    currentValueEUR: valueOf(result.finalQuarter),
  };
}

function firstQuarterWhere(
  quarters: QuarterResult[],
  predicate: (m: QuarterResult) => boolean,
): QuarterResult | undefined {
  for (const m of quarters) {
    if (predicate(m)) return m;
  }
  return undefined;
}

function lastQuarterOfYear(
  quarters: QuarterResult[],
  year: number,
): QuarterResult | undefined {
  let last: QuarterResult | undefined;
  for (const m of quarters) {
    if (m.year === year && (!last || m.quarterIndex > last.quarterIndex)) {
      last = m;
    }
  }
  return last;
}

function periodMonths(quarter: QuarterResult): number {
  return quarter.periodMonths;
}

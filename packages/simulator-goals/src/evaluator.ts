import type { MonthResult, SimulationResult, SimulatorInputs } from '@mlm/simulator-core';
import type { Goal, GoalProgress } from './contracts';

const DEFAULT_PRODUCT_COST_EUR = 100;

export function evaluateGoals(
  result: SimulationResult,
  goals: Goal[],
  inputs: SimulatorInputs,
): GoalProgress[] {
  const productCost = inputs.monthlyProductCostEUR ?? DEFAULT_PRODUCT_COST_EUR;
  const refinancedFromMonth = firstMonthIndexWhere(
    result.months,
    (m) => m.totalEUR >= productCost,
  );

  return goals.map((goal) =>
    evaluateGoal(goal, result, productCost, refinancedFromMonth),
  );
}

function evaluateGoal(
  goal: Goal,
  result: SimulationResult,
  productCost: number,
  refinancedFromMonth: number | undefined,
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

  const { firstHitMonthIndex, currentValueEUR } = computeGoalSeries(
    goal,
    result,
    productCost,
  );

  const needsRefinanced = goal.requiresRefinanced ?? false;
  let effectiveHitMonth = firstHitMonthIndex;
  let blockedByRefinanced = false;

  if (needsRefinanced && firstHitMonthIndex !== undefined) {
    if (refinancedFromMonth === undefined) {
      effectiveHitMonth = undefined;
      blockedByRefinanced = true;
    } else {
      effectiveHitMonth = Math.max(firstHitMonthIndex, refinancedFromMonth);
    }
  }

  const achieved = effectiveHitMonth !== undefined;
  const monthSnapshot =
    achieved && effectiveHitMonth !== undefined
      ? result.months[effectiveHitMonth]
      : undefined;

  return {
    goal,
    achieved,
    achievedInMonth: monthSnapshot?.monthIndex,
    achievedInYear: monthSnapshot?.year,
    currentValueEUR,
    percentage: currentValueEUR / targetAmount,
    blockedByRefinanced: blockedByRefinanced || undefined,
  };
}

function computeGoalSeries(
  goal: Goal,
  result: SimulationResult,
  productCost: number,
): { firstHitMonthIndex: number | undefined; currentValueEUR: number } {
  const targetAmount =
    goal.kind === 'productsRefinanced' ? productCost : goal.amountEUR;

  if (goal.kind === 'yearlySurplus') {
    const surplusByYear = new Map<number, number>();
    for (const m of result.months) {
      const surplus = m.totalEUR - productCost;
      surplusByYear.set(m.year, (surplusByYear.get(m.year) ?? 0) + surplus);
    }

    let firstHitMonthIndex: number | undefined;
    for (const m of result.months) {
      const yearSurplus = surplusByYear.get(m.year) ?? 0;
      if (yearSurplus >= targetAmount) {
        firstHitMonthIndex = lastMonthIndexOfYear(result.months, m.year);
        break;
      }
    }

    const finalYear = result.finalMonth.year;
    const currentValueEUR = surplusByYear.get(finalYear) ?? 0;

    return { firstHitMonthIndex, currentValueEUR };
  }

  const valueOf = (m: MonthResult): number =>
    goal.kind === 'monthlySurplus' ? m.totalEUR - productCost : m.totalEUR;

  const firstHitMonthIndex = firstMonthIndexWhere(
    result.months,
    (m) => valueOf(m) >= targetAmount,
  );

  return {
    firstHitMonthIndex,
    currentValueEUR: valueOf(result.finalMonth),
  };
}

function firstMonthIndexWhere(
  months: MonthResult[],
  predicate: (m: MonthResult) => boolean,
): number | undefined {
  for (const m of months) {
    if (predicate(m)) return m.monthIndex;
  }
  return undefined;
}

function lastMonthIndexOfYear(months: MonthResult[], year: number): number {
  let last = 0;
  for (const m of months) {
    if (m.year === year && m.monthIndex > last) {
      last = m.monthIndex;
    }
  }
  return last;
}

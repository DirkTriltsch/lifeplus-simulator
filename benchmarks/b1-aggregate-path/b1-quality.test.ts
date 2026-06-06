import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { runSimulation, type SimulationMode } from '@mlm/simulator-core';
import { lifeplusProduct } from '@mlm/product-lifeplus';
import { createTreeGrowthStrategy } from '@mlm/simulator-realistic-growth';
import { writeCsv } from '../shared/csv-writer';
import { B1_PARAMETER_SETS, B1_STRATEGIES, type GrowthStrategyName } from './parameter-sets';
import {
  buildChartSeries,
  estimateLevelDistribution,
  estimateNetworkAggregate,
  estimatePhase1Provision,
  estimatePhase2Phase3Provision,
  estimateRankDistribution,
  estimateRootProvision,
} from './algorithms/aggregate-engine';

/**
 * Aenderungen gegenueber Codex-Erstversion:
 *
 * 1. Multi-Strategy: B1-Q laeuft jetzt mit standard, dirichlet, momentum
 *    - standard: 1 Run, deterministisch
 *    - dirichlet/momentum: 10 Tree-Samples mit unterschiedlichen Seeds, gemittelt
 *
 * 2. Getrennte Drift- und Capped-Klassifikation:
 *    - VORHER: capped => sofort 'Capped', maskiert echte Drift-Werte
 *    - JETZT:  drift_class = Klasse aus Doc 13 §4.5 (Pass/Warnung/Fail)
 *              capped     = unabhaengiger Boolean
 *    - Pass/Fail beruht primaer auf drift_class.
 *
 * 3. CSV-Spalte phase1/phase2/phase3 Diff einzeln, statt nur Root-Provision-Diff
 *
 * 4. estimatePhase2Phase3Provision und estimateRootProvision haben neue Signaturen
 */

const TOTAL_MONTHS = 120;
const QUALITY_SET_IDS = new Set(['P1', 'P2', 'P4']);
const STOCHASTIC_SAMPLE_SEEDS = [42, 43, 44, 45, 46, 47, 48, 49, 50, 51];

type DriftClass = 'Pass' | 'Warnung' | 'Fail';

interface QualityRow {
  benchmark_id: string;
  parameter_set: string;
  strategy: GrowthStrategyName;
  seed: string;
  sample_count: number;
  year: number;
  aggregate_members: number;
  tree_members: number;
  members_diff_pct: number;
  aggregate_shoppers: number;
  tree_shoppers: number;
  shoppers_diff_pct: number;
  aggregate_monthly_volume_ip: number;
  tree_monthly_volume_ip: number;
  volume_diff_pct: number;
  aggregate_phase1_monthly: number;
  tree_phase1_monthly: number;
  phase1_diff_pct: number;
  aggregate_phase2_monthly: number;
  tree_phase2_monthly: number;
  phase2_diff_pct: number;
  aggregate_phase3_monthly: number;
  tree_phase3_monthly: number;
  phase3_diff_pct: number;
  aggregate_root_monthly_provision: number;
  tree_root_monthly_provision: number;
  root_provision_diff_pct: number;
  aggregate_rank: string;
  tree_rank: string;
  drift_class: DriftClass;
  capped: boolean;
  passed: boolean;
  notes: string;
}

describe('B1-Q aggregate path quality benchmark', () => {
  it(
    'compares aggregate against tree for all three strategies with drift class separation',
    () => {
      const rows: QualityRow[] = [];

      for (const parameterSet of B1_PARAMETER_SETS.filter((set) =>
        QUALITY_SET_IDS.has(set.id),
      )) {
        for (const strategy of B1_STRATEGIES) {
          const aggregate = runAggregate(parameterSet.inputs, strategy);
          const treeReference = collectTreeReference(parameterSet.inputs, strategy);

          for (const [index, aggregatePoint] of aggregate.chart.entries()) {
            const treeYear = treeReference.years[index];
            if (!treeYear) continue;

            const row = computeQualityRow({
              benchmarkId: 'B1-Q',
              parameterSet,
              strategy,
              sampleCount: treeReference.sampleCount,
              yearIndex: index,
              aggregatePoint,
              aggregateRoot: aggregate.root[index],
              aggregatePhase1: aggregate.phase1[index],
              aggregatePhase2: aggregate.phase23.phase2[index],
              aggregatePhase3: aggregate.phase23.phase3[index],
              treeYear,
              inputs: parameterSet.inputs,
            });
            rows.push(row);
          }
        }
      }

      writeCsv(
        resolve('benchmarks/results/2026-06/b1-quality-results.csv'),
        rows,
      );

      expect(rows.length).toBeGreaterThan(0);
    },
    600_000, // 10 Minuten: stochastische Strategien mit 10 Samples sind teuer
  );
});

function runAggregate(
  inputs: (typeof B1_PARAMETER_SETS)[number]['inputs'],
  strategy: GrowthStrategyName,
) {
  const network = estimateNetworkAggregate(inputs);
  const levels = estimateLevelDistribution(network, inputs);
  const ranks = estimateRankDistribution(network, levels, inputs, strategy);
  const phase1 = estimatePhase1Provision(network, ranks, inputs);
  const phase23 = estimatePhase2Phase3Provision(network, ranks, levels, inputs);
  const root = estimateRootProvision(network, ranks, levels, inputs);
  const chart = buildChartSeries(network, phase1, phase23, root, inputs);
  return { network, levels, ranks, phase1, phase23, root, chart };
}

interface TreeYearAggregate {
  members: number;
  shoppers: number;
  monthlyVolume: number;
  monthlyPhase1: number;
  monthlyPhase2: number;
  monthlyPhase3: number;
  rootMonthlyProvision: number;
  rankName: string;
}

interface TreeReference {
  years: TreeYearAggregate[];
  sampleCount: number;
}

/**
 * Fuer 'standard' wird genau ein Tree-Run gemacht (deterministisch).
 * Fuer 'dirichlet'/'momentum' werden 10 Runs gemittelt.
 */
function collectTreeReference(
  inputs: (typeof B1_PARAMETER_SETS)[number]['inputs'],
  strategy: GrowthStrategyName,
): TreeReference {
  const seeds = strategy === 'standard' ? [42] : STOCHASTIC_SAMPLE_SEEDS;
  const sampleCount = seeds.length;

  const accumulator: TreeYearAggregate[] = [];

  for (const seed of seeds) {
    const tree = runSimulation(
      lifeplusProduct,
      inputs,
      TOTAL_MONTHS,
      {
        simulationMode: 'person-tree' satisfies SimulationMode,
        treeGrowthStrategy:
          strategy === 'standard'
            ? undefined
            : createTreeGrowthStrategy({ strategy, seed }),
      },
    );

    for (const [yearIndex, treeYear] of tree.yearEnds.entries()) {
      const monthlyVolume =
        treeYear.members * inputs.memberMonthlyVolume +
        treeYear.shoppers * inputs.shopperMonthlyVolume;

      const phase1 = treeYear.phase1EUR ?? 0;
      const phase2 = treeYear.phase2EUR ?? 0;
      const phase3 = treeYear.phase3EUR ?? 0;
      const rootProvision = treeYear.rootProvisionEUR ?? treeYear.totalEUR;

      if (!accumulator[yearIndex]) {
        accumulator[yearIndex] = {
          members: 0,
          shoppers: 0,
          monthlyVolume: 0,
          monthlyPhase1: 0,
          monthlyPhase2: 0,
          monthlyPhase3: 0,
          rootMonthlyProvision: 0,
          rankName: treeYear.rankName,
        };
      }

      accumulator[yearIndex].members += treeYear.members;
      accumulator[yearIndex].shoppers += treeYear.shoppers;
      accumulator[yearIndex].monthlyVolume += monthlyVolume;
      accumulator[yearIndex].monthlyPhase1 += phase1 / 12;
      accumulator[yearIndex].monthlyPhase2 += phase2 / 12;
      accumulator[yearIndex].monthlyPhase3 += phase3 / 12;
      accumulator[yearIndex].rootMonthlyProvision += rootProvision / 12;
      // Rang: vom ersten Sample uebernehmen (deterministisch fuer standard,
      //       fuer stochastische Strategien ist der haeufigste Rang nuetzlicher,
      //       das uebersteigt aber die Zielsetzung dieses Benchmarks)
      if (seed === seeds[0]) {
        accumulator[yearIndex].rankName = treeYear.rankName;
      }
    }
  }

  // Mittelwert bilden
  const years = accumulator.map((entry) => ({
    members: entry.members / sampleCount,
    shoppers: entry.shoppers / sampleCount,
    monthlyVolume: entry.monthlyVolume / sampleCount,
    monthlyPhase1: entry.monthlyPhase1 / sampleCount,
    monthlyPhase2: entry.monthlyPhase2 / sampleCount,
    monthlyPhase3: entry.monthlyPhase3 / sampleCount,
    rootMonthlyProvision: entry.rootMonthlyProvision / sampleCount,
    rankName: entry.rankName,
  }));

  return { years, sampleCount };
}

interface QualityRowParams {
  benchmarkId: string;
  parameterSet: (typeof B1_PARAMETER_SETS)[number];
  strategy: GrowthStrategyName;
  sampleCount: number;
  yearIndex: number;
  aggregatePoint: ReturnType<typeof runAggregate>['chart'][number];
  aggregateRoot: ReturnType<typeof runAggregate>['root'][number] | undefined;
  aggregatePhase1: ReturnType<typeof runAggregate>['phase1'][number] | undefined;
  aggregatePhase2: ReturnType<typeof runAggregate>['phase23']['phase2'][number] | undefined;
  aggregatePhase3: ReturnType<typeof runAggregate>['phase23']['phase3'][number] | undefined;
  treeYear: TreeYearAggregate;
  inputs: (typeof B1_PARAMETER_SETS)[number]['inputs'];
}

function computeQualityRow(params: QualityRowParams): QualityRow {
  const {
    benchmarkId,
    parameterSet,
    strategy,
    sampleCount,
    yearIndex,
    aggregatePoint,
    aggregateRoot,
    aggregatePhase1,
    aggregatePhase2,
    aggregatePhase3,
    treeYear,
  } = params;

  const unitToCurrency = params.inputs.unitToCurrency ?? 1;
  const aggregatePhase1Monthly =
    (aggregateRoot?.phase1Contribution ?? aggregatePhase1?.total ?? 0) *
    unitToCurrency /
    12;
  const aggregatePhase2Monthly =
    (aggregateRoot?.phase2Contribution ?? aggregatePhase2?.total ?? 0) *
    unitToCurrency /
    12;
  const aggregatePhase3Monthly =
    (aggregateRoot?.phase3Contribution ?? aggregatePhase3?.total ?? 0) *
    unitToCurrency /
    12;

  const membersDiff = pctDiff(aggregatePoint.members, treeYear.members);
  const shoppersDiff = pctDiff(aggregatePoint.shoppers, treeYear.shoppers);
  const volumeDiff = pctDiff(aggregatePoint.monthlyVolumeEur, treeYear.monthlyVolume);
  const phase1Diff = pctDiff(aggregatePhase1Monthly, treeYear.monthlyPhase1);
  const phase2Diff = pctDiff(aggregatePhase2Monthly, treeYear.monthlyPhase2);
  const phase3Diff = pctDiff(aggregatePhase3Monthly, treeYear.monthlyPhase3);
  const rootDiff = pctDiff(aggregatePoint.rootProvisionEur, treeYear.rootMonthlyProvision);

  const driftClass = classifyDrift({
    membersDiffPct: membersDiff,
    shoppersDiffPct: shoppersDiff,
    volumeDiffPct: volumeDiff,
    phase1DiffPct: phase1Diff,
    phase2DiffPct: phase2Diff,
    phase3DiffPct: phase3Diff,
    rootProvisionDiffPct: rootDiff,
  });

  return {
    benchmark_id: benchmarkId,
    parameter_set: parameterSet.id,
    strategy,
    seed: strategy === 'standard' ? 'none' : 'avg(42..51)',
    sample_count: sampleCount,
    year: aggregatePoint.year,
    aggregate_members: round(aggregatePoint.members),
    tree_members: round(treeYear.members),
    members_diff_pct: membersDiff,
    aggregate_shoppers: round(aggregatePoint.shoppers),
    tree_shoppers: round(treeYear.shoppers),
    shoppers_diff_pct: shoppersDiff,
    aggregate_monthly_volume_ip: round(aggregatePoint.monthlyVolumeEur),
    tree_monthly_volume_ip: round(treeYear.monthlyVolume),
    volume_diff_pct: volumeDiff,
    aggregate_phase1_monthly: round(aggregatePhase1Monthly),
    tree_phase1_monthly: round(treeYear.monthlyPhase1),
    phase1_diff_pct: phase1Diff,
    aggregate_phase2_monthly: round(aggregatePhase2Monthly),
    tree_phase2_monthly: round(treeYear.monthlyPhase2),
    phase2_diff_pct: phase2Diff,
    aggregate_phase3_monthly: round(aggregatePhase3Monthly),
    tree_phase3_monthly: round(treeYear.monthlyPhase3),
    phase3_diff_pct: phase3Diff,
    aggregate_root_monthly_provision: round(aggregatePoint.rootProvisionEur),
    tree_root_monthly_provision: round(treeYear.rootMonthlyProvision),
    root_provision_diff_pct: rootDiff,
    aggregate_rank: aggregateRoot?.rankName ?? 'unknown',
    tree_rank: treeYear.rankName,
    drift_class: driftClass,
    capped: aggregatePoint.capped,
    passed: driftClass === 'Pass',
    notes: parameterSet.purpose,
  };
}

/**
 * Drift-Klassifikation aus Doc 13 §4.5.
 *
 * Pass:    alle Toleranzen unter Warn-Schwelle
 * Warnung: mindestens eine Toleranz zwischen Warn- und Fail-Schwelle
 * Fail:    mindestens eine Toleranz ueber Fail-Schwelle
 */
function classifyDrift(input: {
  membersDiffPct: number;
  shoppersDiffPct: number;
  volumeDiffPct: number;
  phase1DiffPct: number;
  phase2DiffPct: number;
  phase3DiffPct: number;
  rootProvisionDiffPct: number;
}): DriftClass {
  // Fail-Schwellen (Doc 13 §4.5)
  if (
    input.membersDiffPct >= 5 ||
    input.shoppersDiffPct >= 5 ||
    input.volumeDiffPct >= 2 ||
    input.phase1DiffPct >= 5 ||
    input.phase2DiffPct >= 15 ||
    input.phase3DiffPct >= 25 ||
    input.rootProvisionDiffPct >= 25
  ) {
    return 'Fail';
  }
  // Warn-Schwellen
  if (
    input.membersDiffPct >= 1 ||
    input.shoppersDiffPct >= 1 ||
    input.volumeDiffPct >= 0.5 ||
    input.phase1DiffPct >= 1 ||
    input.phase2DiffPct >= 5 ||
    input.phase3DiffPct >= 10 ||
    input.rootProvisionDiffPct >= 10
  ) {
    return 'Warnung';
  }
  return 'Pass';
}

function pctDiff(aggregate: number, reference: number): number {
  if (reference === 0) return aggregate === 0 ? 0 : 100;
  return round((Math.abs(aggregate - reference) / Math.abs(reference)) * 100);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

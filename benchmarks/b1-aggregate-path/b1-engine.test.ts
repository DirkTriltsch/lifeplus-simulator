import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { benchmark } from '../shared/benchmark';
import { writeCsv } from '../shared/csv-writer';
import { collectBenchmarkEnvironment } from '../shared/benchmark-env';
import { measureMemoryMb } from '../shared/memory-meter';
import { B1_PARAMETER_SETS, B1_STRATEGIES } from './parameter-sets';
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
 * - render_nodes nutzt finalSnapshot.renderNodes (NEU in AggregateYearSnapshot) statt total_objects
 * - memory_mb wird gemessen (Indikator, kein Pass/Fail)
 * - estimatePhase2Phase3Provision-Signatur erweitert um levels und inputs
 * - estimateRootProvision-Signatur erweitert um levels und inputs
 * - toter Code (runProvision) entfernt
 */

interface ResultRow {
  benchmark_id: string;
  sub_test: string;
  parameter_set: string;
  strategy: string;
  seed: string;
  year: string;
  runs: number;
  median_ms: number;
  p95_ms: number;
  min_ms: number;
  max_ms: number;
  passed: boolean;
  members_per_year: number;
  shoppers_per_year: number;
  duplication_rate: number;
  churn_rate: number;
  active_members: number;
  total_shoppers: number;
  total_objects: number;
  render_nodes: number;
  orders_count: number;
  memory_mb: number | string;
  notes: string;
}

describe('B1-E aggregate path engine benchmark', () => {
  it('meets the final B1-E thresholds for product-mode sets', () => {
    const rows: ResultRow[] = [];
    const failures: string[] = [];

    for (const parameterSet of B1_PARAMETER_SETS) {
      for (const strategy of B1_STRATEGIES) {
        const subResults = runSubBenchmarks(parameterSet.inputs, strategy);

        const memoryBefore = measureMemoryMb();
        const pipelineResult = benchmark(`B1-E-total ${parameterSet.id} ${strategy}`, () => {
          runPipeline(parameterSet.inputs, strategy);
        });
        const memoryAfter = measureMemoryMb();
        const memoryDelta = Math.round((memoryAfter - memoryBefore) * 100) / 100;

        const finalSnapshot = runPipeline(parameterSet.inputs, strategy).network.at(-1);
        const isP6 = parameterSet.id === 'P6';

        for (const result of [...subResults, { subTest: 'B1-E-total', result: pipelineResult }]) {
          const limits = thresholdFor(result.subTest);
          const isTotal = result.subTest === 'B1-E-total';
          const passed = isTotal
            ? result.result.medianMs < limits.medianMs &&
              (isP6 || result.result.p95Ms < limits.p95Ms)
            : result.result.medianMs < limits.medianMs;

          rows.push({
            benchmark_id: 'B1-E',
            sub_test: result.subTest,
            parameter_set: parameterSet.id,
            strategy,
            seed: 'none',
            year: 'all',
            runs: result.result.runs,
            median_ms: round(result.result.medianMs),
            p95_ms: round(result.result.p95Ms),
            min_ms: round(result.result.minMs),
            max_ms: round(result.result.maxMs),
            passed,
            members_per_year: parameterSet.inputs.membersPerYear,
            shoppers_per_year: parameterSet.inputs.shoppersPerYear,
            duplication_rate: parameterSet.inputs.duplicationRate,
            churn_rate: parameterSet.inputs.attritionRate,
            active_members: round(finalSnapshot?.activeMembers ?? 0),
            total_shoppers: round(finalSnapshot?.activeShoppers ?? 0),
            total_objects: round(finalSnapshot?.explicitMemberObjects ?? 0),
            render_nodes: round(finalSnapshot?.renderNodes ?? 0),
            orders_count: round(finalSnapshot?.estimatedOrdersPerMonth ?? 0),
            memory_mb: result.subTest === 'B1-E-total' ? memoryDelta : '',
            notes: parameterSet.purpose,
          });

          if (parameterSet.productMode && isTotal && !passed) {
            failures.push(`${parameterSet.id}/${strategy}/${result.subTest}`);
          }
        }
      }
    }

    writeCsv(
      resolve('benchmarks/results/2026-06/b1-engine-results.csv'),
      rows,
    );
    writeCsv(resolve('benchmarks/results/2026-06/benchmark-env.csv'), [
      collectBenchmarkEnvironment() as unknown as Record<string, string | number>,
    ]);

    expect(failures).toEqual([]);
  });
});

function runSubBenchmarks(
  inputs: (typeof B1_PARAMETER_SETS)[number]['inputs'],
  strategy: (typeof B1_STRATEGIES)[number],
) {
  const network = estimateNetworkAggregate(inputs);
  const levels = estimateLevelDistribution(network, inputs);
  const ranks = estimateRankDistribution(network, levels, inputs, strategy);
  const phase1 = estimatePhase1Provision(network, ranks, inputs);
  const phase23 = estimatePhase2Phase3Provision(network, ranks, levels, inputs);
  const root = estimateRootProvision(network, ranks, levels, inputs);

  return [
    {
      subTest: 'B1-E1',
      result: benchmark('estimateNetworkAggregate', () => {
        estimateNetworkAggregate(inputs);
      }),
    },
    {
      subTest: 'B1-E2',
      result: benchmark('estimateLevelDistribution', () => {
        estimateLevelDistribution(network, inputs);
      }),
    },
    {
      subTest: 'B1-E3',
      result: benchmark('estimateRankDistribution', () => {
        estimateRankDistribution(network, levels, inputs, strategy);
      }),
    },
    {
      subTest: 'B1-E4',
      result: benchmark('estimatePhase1Provision', () => {
        estimatePhase1Provision(network, ranks, inputs);
      }),
    },
    {
      subTest: 'B1-E5',
      result: benchmark('estimatePhase2Phase3Provision', () => {
        estimatePhase2Phase3Provision(network, ranks, levels, inputs);
      }),
    },
    {
      subTest: 'B1-E6',
      result: benchmark('buildChartSeries', () => {
        buildChartSeries(network, phase1, phase23, root, inputs);
      }),
    },
    {
      subTest: 'B1-E7',
      result: benchmark('estimateRootProvision', () => {
        estimateRootProvision(network, ranks, levels, inputs);
      }),
    },
  ];
}

function runPipeline(
  inputs: (typeof B1_PARAMETER_SETS)[number]['inputs'],
  strategy: (typeof B1_STRATEGIES)[number],
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

function thresholdFor(subTest: string): { medianMs: number; p95Ms: number } {
  switch (subTest) {
    case 'B1-E1':
      return { medianMs: 1, p95Ms: 3 };
    case 'B1-E2':
      return { medianMs: 3, p95Ms: 6 };
    case 'B1-E3':
      return { medianMs: 3, p95Ms: 7 };
    case 'B1-E4':
      return { medianMs: 2, p95Ms: 4 };
    case 'B1-E5':
      return { medianMs: 5, p95Ms: 10 };
    case 'B1-E6':
      return { medianMs: 2, p95Ms: 4 };
    case 'B1-E7':
      return { medianMs: 2, p95Ms: 4 };
    default:
      return { medianMs: 16, p95Ms: 33 };
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

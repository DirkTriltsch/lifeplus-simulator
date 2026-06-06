import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { runSimulation, type SimulationMode, type SimulatorInputs } from '@mlm/simulator-core';
import { lifeplusProduct } from '@mlm/product-lifeplus';
import { benchmark } from '../shared/benchmark';
import { writeCsv } from '../shared/csv-writer';
import { measureMemoryMb } from '../shared/memory-meter';

/**
 * B2-P: Performance der Shopper-Aggregation.
 *
 * Doc 13 §5.5: Pass-Schwellen
 *   - Compensation-Speedup >= 2.0x
 *   - Gesamt-Speedup >= 1.5x
 *   - Objektreduktion >= 40%
 *   - Speicherreduktion >= 25% (Indikator, kein Pass/Fail)
 *
 * STUB: solange 'shopper-aggregate'-Modus nicht existiert, ist der Speedup 1.0x
 * (gleiche Implementation als Baseline und Aggregated).
 */

const TOTAL_MONTHS = 120;

interface PerformanceRow {
  benchmark_id: string;
  parameter_set: string;
  scenario: string;
  baseline_run_sim_ms: number;
  aggregated_run_sim_ms: number;
  baseline_comp_ms: number;
  aggregated_comp_ms: number;
  baseline_total_ms: number;
  aggregated_total_ms: number;
  comp_speedup: number;
  total_speedup: number;
  baseline_objects: number;
  aggregated_objects: number;
  object_reduction_pct: number;
  baseline_memory_mb: number;
  aggregated_memory_mb: number;
  memory_reduction_pct: number;
  passed: boolean;
  notes: string;
}

const PERFORMANCE_INPUTS: SimulatorInputs = {
  membersPerYear: 2,
  shoppersPerYear: 3,
  duplicationRate: 1,
  attritionRate: 0.18,
  memberMonthlyVolume: 45,
  shopperMonthlyVolume: 45,
  personalMonthlyVolume: 45,
  maxDirectMembersPerMember: 29,
  unitToCurrency: 1,
};

describe('B2-P shopper aggregation performance', () => {
  it.skip('compares baseline vs aggregated tree performance for P2', () => {
    // SKIP: aktivieren, sobald shopper-aggregate-Modus existiert
    const rows: PerformanceRow[] = [];

    const baselineMemBefore = measureMemoryMb();
    const baselineResult = benchmark('baseline', () => {
      runSimulation(
        lifeplusProduct,
        PERFORMANCE_INPUTS,
        TOTAL_MONTHS,
        { simulationMode: 'person-tree' satisfies SimulationMode },
      );
    });
    const baselineMemAfter = measureMemoryMb();

    const aggregatedMemBefore = measureMemoryMb();
    const aggregatedResult = benchmark('aggregated', () => {
      // TODO: simulationMode: 'shopper-aggregate'
      runSimulation(
        lifeplusProduct,
        PERFORMANCE_INPUTS,
        TOTAL_MONTHS,
        { simulationMode: 'person-tree' satisfies SimulationMode },
      );
    });
    const aggregatedMemAfter = measureMemoryMb();

    const compSpeedup = baselineResult.medianMs / aggregatedResult.medianMs;
    const baselineObjects = 0; // TODO: aus runSimulation extrahieren
    const aggregatedObjects = 0; // TODO: aus runSimulation extrahieren
    const baselineMemDelta = baselineMemAfter - baselineMemBefore;
    const aggregatedMemDelta = aggregatedMemAfter - aggregatedMemBefore;

    const passed =
      compSpeedup >= 2.0 &&
      (baselineObjects === 0 || (baselineObjects - aggregatedObjects) / baselineObjects >= 0.4);

    rows.push({
      benchmark_id: 'B2-P',
      parameter_set: 'P2',
      scenario: 'P2 default vergleich',
      baseline_run_sim_ms: round(baselineResult.medianMs),
      aggregated_run_sim_ms: round(aggregatedResult.medianMs),
      baseline_comp_ms: round(baselineResult.medianMs),    // TODO: trennen
      aggregated_comp_ms: round(aggregatedResult.medianMs), // TODO: trennen
      baseline_total_ms: round(baselineResult.medianMs),
      aggregated_total_ms: round(aggregatedResult.medianMs),
      comp_speedup: round(compSpeedup),
      total_speedup: round(compSpeedup),
      baseline_objects: baselineObjects,
      aggregated_objects: aggregatedObjects,
      object_reduction_pct: baselineObjects === 0 ? 0 : round((baselineObjects - aggregatedObjects) / baselineObjects * 100),
      baseline_memory_mb: round(baselineMemDelta),
      aggregated_memory_mb: round(aggregatedMemDelta),
      memory_reduction_pct: 0,
      passed,
      notes: 'B2-P Stub - aktivieren wenn shopper-aggregate-Modus verfuegbar',
    });

    writeCsv(
      resolve('benchmarks/results/2026-06/b2-performance-results.csv'),
      rows,
    );

    expect(passed).toBe(true);
  });

  it('verifies B2-P harness setup compiles', () => {
    expect(PERFORMANCE_INPUTS.membersPerYear).toBe(2);
  });
});

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

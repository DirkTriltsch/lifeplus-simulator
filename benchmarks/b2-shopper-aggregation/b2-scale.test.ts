import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { runSimulation, type SimulationMode, type SimulatorInputs } from '@mlm/simulator-core';
import { lifeplusProduct } from '@mlm/product-lifeplus';
import { benchmark } from '../shared/benchmark';
import { writeCsv } from '../shared/csv-writer';
import { measureMemoryMb } from '../shared/memory-meter';

/**
 * B2-S: Skalierung des Tree-Pfads nach Shopper-Aggregation.
 *
 * Doc 13 §5.6: Pflicht-Messungen
 *   P1: muss schnell und exakt laufen
 *   P2: muss fuer Diagnose brauchbar laufen (<1s Tree-Aufbau, <1s Compensation, <2s gesamt)
 *   P4: entscheidet Tree-Cap (<5s gesamt = Pass, 5-15s Warnung, >15s Fail)
 *   P5: wahrscheinlich Cap-/Warnbereich
 *   P6: Abbruch-/Cap-Test
 *
 * STUB: Misst aktuell person-tree als Baseline. Sobald shopper-aggregate
 * verfuegbar ist, kommt der Vergleich dazu.
 */

const TOTAL_MONTHS = 120;

const SCALE_PARAMETER_SETS: Array<{
  id: string;
  inputs: SimulatorInputs;
  expectedClass: 'pass' | 'warning' | 'fail';
  notes: string;
}> = [
  {
    id: 'P1',
    inputs: makeInputs(1, 2, 0.5, 0.25),
    expectedClass: 'pass',
    notes: 'Untere realistische Last',
  },
  {
    id: 'P2',
    inputs: makeInputs(2, 3, 1, 0.18),
    expectedClass: 'pass',
    notes: 'Haupt-Default',
  },
  {
    id: 'P4',
    inputs: makeInputs(2.5, 3, 1, 0.18),
    expectedClass: 'pass',
    notes: 'Grenze fuer Tree-Pfad',
  },
  {
    id: 'P5',
    inputs: makeInputs(3, 3, 1, 0.25),
    expectedClass: 'warning',
    notes: 'Aggressiv - Cap-/Warnbereich erwartet',
  },
  {
    id: 'P6',
    inputs: makeInputs(4, 3, 1, 0.3),
    expectedClass: 'warning',
    notes: 'Extrem - Cap-/Abbruchtest',
  },
];

interface ScaleRow {
  benchmark_id: string;
  parameter_set: string;
  scenario: string;
  tree_build_ms: number;
  compensation_ms: number;
  total_ms: number;
  memory_mb: number;
  expected_class: 'pass' | 'warning' | 'fail';
  actual_class: 'pass' | 'warning' | 'fail';
  passed: boolean;
  notes: string;
}

describe('B2-S shopper aggregation scaling sweep', () => {
  it.skip(
    'measures person-tree scaling for P1..P6 and writes csv',
    () => {
      const rows: ScaleRow[] = [];

      for (const set of SCALE_PARAMETER_SETS) {
        const memBefore = measureMemoryMb();
        const result = benchmark(`B2-S ${set.id}`, () => {
          runSimulation(
            lifeplusProduct,
            set.inputs,
            TOTAL_MONTHS,
            { simulationMode: 'person-tree' satisfies SimulationMode },
          );
        }, { runs: 5, warmup: 1 }); // weniger Runs bei teuren Szenarien
        const memAfter = measureMemoryMb();

        const totalMs = result.medianMs;
        const actualClass = classifyTotalMs(set.id, totalMs);
        const passed = actualClass === set.expectedClass || (set.expectedClass === 'warning' && actualClass === 'pass');

        rows.push({
          benchmark_id: 'B2-S',
          parameter_set: set.id,
          scenario: set.notes,
          tree_build_ms: 0, // TODO: trennen, sobald runSimulation Sub-Zeiten liefert
          compensation_ms: 0,
          total_ms: round(totalMs),
          memory_mb: round(memAfter - memBefore),
          expected_class: set.expectedClass,
          actual_class: actualClass,
          passed,
          notes: set.notes,
        });
      }

      writeCsv(
        resolve('benchmarks/results/2026-06/b2-scale-results.csv'),
        rows,
      );

      expect(rows.length).toBe(SCALE_PARAMETER_SETS.length);
    },
    900_000, // 15 Minuten - P5/P6 koennen lange brauchen
  );

  it('verifies scale set list is complete', () => {
    expect(SCALE_PARAMETER_SETS.map((set) => set.id)).toEqual(['P1', 'P2', 'P4', 'P5', 'P6']);
  });
});

function classifyTotalMs(setId: string, totalMs: number): 'pass' | 'warning' | 'fail' {
  // Doc 13 §5.6 Pass/Fail-Tabelle
  if (setId === 'P2') {
    if (totalMs < 2000) return 'pass';
    if (totalMs < 5000) return 'warning';
    return 'fail';
  }
  if (setId === 'P4') {
    if (totalMs < 5000) return 'pass';
    if (totalMs < 15000) return 'warning';
    return 'fail';
  }
  // P1, P5, P6: keine festen Schwellen, nur Beobachtung
  if (totalMs < 5000) return 'pass';
  if (totalMs < 30000) return 'warning';
  return 'fail';
}

function makeInputs(
  membersPerYear: number,
  shoppersPerYear: number,
  duplicationRate: number,
  attritionRate: number,
): SimulatorInputs {
  return {
    membersPerYear,
    shoppersPerYear,
    duplicationRate,
    attritionRate,
    memberMonthlyVolume: 45,
    shopperMonthlyVolume: 45,
    personalMonthlyVolume: 45,
    maxDirectMembersPerMember: 29,
    unitToCurrency: 1,
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

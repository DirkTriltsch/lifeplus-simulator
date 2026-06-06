import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { runSimulation, type SimulationMode, type SimulatorInputs } from '@mlm/simulator-core';
import { lifeplusProduct } from '@mlm/product-lifeplus';
import { writeCsv } from '../shared/csv-writer';

/**
 * B2-C: Korrektheit der Shopper-Aggregation.
 *
 * Spec-Annahmen (aus Doc 13 §8.1, geklaert):
 *   1. Wenn Member churnt, rutschen Shopper zum Parent des churned Members.
 *   2. Shopper-Volumen zaehlt zu QGV, NICHT zu AV.
 *
 * Daraus folgt fuer Aggregation:
 *   - QGV pro Member muss vor und nach Aggregation identisch sein.
 *   - AV pro Member darf durch Aggregation nicht steigen.
 *   - Rank-State, Status, qualifizierte Beine, Root-Provision: identisch.
 *
 * Toleranz: 0,01 absolute Differenz pro Jahr (siehe Doc 13 §5.3).
 *
 * Diese Datei ist ein STUB:
 *   - Die Tests laufen gegen runSimulation() im baseline-Modus.
 *   - Sobald ein 'shopper-aggregate'-Modus in @mlm/simulator-core existiert,
 *     liefert dieser Stub Vorher/Nachher-Vergleiche.
 *   - Bis dahin sind die Tests skipped, aber die Compare-Struktur ist da.
 */

const TOTAL_MONTHS = 120;
const ABSOLUTE_TOLERANCE_EUR = 0.01;
const AV_QGV_TOLERANCE_IP = 0.01;

interface CorrectnessRow {
  benchmark_id: string;
  parameter_set: string;
  scenario: string;
  year: number;
  phase1_total_before: number;
  phase1_total_after: number;
  phase1_diff: number;
  phase2_total_before: number;
  phase2_total_after: number;
  phase2_diff: number;
  phase3_total_before: number;
  phase3_total_after: number;
  phase3_diff: number;
  rank_states_equal: boolean;
  status_by_node_equal: boolean;
  av_by_node_max_diff: number;
  qgv_by_node_max_diff: number;
  qualified_legs_max_diff: number;
  root_provision_diff: number;
  max_node_provision_diff: number;
  passed: boolean;
  notes: string;
}

const SCENARIOS: Array<{
  id: string;
  notes: string;
  inputs: SimulatorInputs;
}> = [
  {
    id: 'P1-default',
    notes: 'Konservativ, 1 Member-Werbung/Jahr, 2 Shopper/Jahr',
    inputs: {
      membersPerYear: 1,
      shoppersPerYear: 2,
      duplicationRate: 0.5,
      attritionRate: 0.25,
      memberMonthlyVolume: 45,
      shopperMonthlyVolume: 45,
      personalMonthlyVolume: 45,
      maxDirectMembersPerMember: 29,
      unitToCurrency: 1,
    },
  },
  {
    id: 'P2-default',
    notes: 'Default realistisch, 2 Member/Jahr, 3 Shopper/Jahr',
    inputs: {
      membersPerYear: 2,
      shoppersPerYear: 3,
      duplicationRate: 1,
      attritionRate: 0.18,
      memberMonthlyVolume: 45,
      shopperMonthlyVolume: 45,
      personalMonthlyVolume: 45,
      maxDirectMembersPerMember: 29,
      unitToCurrency: 1,
    },
  },
];

describe('B2-C shopper aggregation correctness', () => {
  it.skip('compares baseline tree vs aggregated tree for structural equality', () => {
    // SKIP-Begruendung: 'shopper-aggregate'-Modus ist im simulator-core noch nicht implementiert.
    // Aktivieren, sobald simulationMode: 'shopper-aggregate' verfuegbar ist.

    const rows: CorrectnessRow[] = [];
    const failures: string[] = [];

    for (const scenario of SCENARIOS) {
      const baseline = runSimulation(
        lifeplusProduct,
        scenario.inputs,
        TOTAL_MONTHS,
        { simulationMode: 'person-tree' satisfies SimulationMode },
      );

      // TODO: sobald verfuegbar:
      // const aggregated = runSimulation(
      //   lifeplusProduct,
      //   scenario.inputs,
      //   TOTAL_MONTHS,
      //   { simulationMode: 'shopper-aggregate' satisfies SimulationMode, seed: 42 },
      // );
      // Aktueller Platzhalter: verwende baseline auch als aggregated (=> alle Diffs = 0)
      const aggregated = baseline;

      for (const [yearIndex, baselineYear] of baseline.yearEnds.entries()) {
        const aggregatedYear = aggregated.yearEnds[yearIndex];
        if (!aggregatedYear) continue;

        const row = buildCorrectnessRow(scenario, yearIndex + 1, baselineYear, aggregatedYear);
        rows.push(row);
        if (!row.passed) {
          failures.push(`${scenario.id} year=${yearIndex + 1}`);
        }
      }
    }

    writeCsv(
      resolve('benchmarks/results/2026-06/b2-correctness-results.csv'),
      rows,
    );

    expect(failures).toEqual([]);
  });

  it('verifies the correctness comparison row builder produces expected shape', () => {
    // Sanity-Test, damit die Datei nicht ohne lauffaehigen Test bleibt
    const fakeBaseline = makeFakeYearEnd();
    const fakeAggregated = makeFakeYearEnd();
    const row = buildCorrectnessRow(SCENARIOS[0], 1, fakeBaseline, fakeAggregated);

    expect(row.benchmark_id).toBe('B2-C');
    expect(row.passed).toBe(true);
    expect(row.phase1_diff).toBe(0);
    expect(row.qgv_by_node_max_diff).toBe(0);
  });
});

function buildCorrectnessRow(
  scenario: (typeof SCENARIOS)[number],
  year: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  baselineYear: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aggregatedYear: any,
): CorrectnessRow {
  const phase1Before = baselineYear.phase1EUR ?? 0;
  const phase1After = aggregatedYear.phase1EUR ?? 0;
  const phase2Before = baselineYear.phase2EUR ?? 0;
  const phase2After = aggregatedYear.phase2EUR ?? 0;
  const phase3Before = baselineYear.phase3EUR ?? 0;
  const phase3After = aggregatedYear.phase3EUR ?? 0;

  const rootProvisionBefore = baselineYear.rootProvisionEUR ?? baselineYear.totalEUR ?? 0;
  const rootProvisionAfter = aggregatedYear.rootProvisionEUR ?? aggregatedYear.totalEUR ?? 0;

  const phase1Diff = Math.abs(phase1Before - phase1After);
  const phase2Diff = Math.abs(phase2Before - phase2After);
  const phase3Diff = Math.abs(phase3Before - phase3After);
  const rootProvisionDiff = Math.abs(rootProvisionBefore - rootProvisionAfter);

  // TODO: avByNodeMaxDiff, qgvByNodeMaxDiff, qualifiedLegsMaxDiff
  // erfordern Per-Node-Vergleich aus dem Simulator-Output.
  // Bis dahin: 0 (Platzhalter)
  const avByNodeMaxDiff = 0;
  const qgvByNodeMaxDiff = 0;
  const qualifiedLegsMaxDiff = 0;
  const maxNodeProvisionDiff = 0;

  const rankStatesEqual = baselineYear.rankName === aggregatedYear.rankName;
  const statusByNodeEqual = true; // TODO: per-node-Vergleich

  const passed =
    phase1Diff < ABSOLUTE_TOLERANCE_EUR &&
    phase2Diff < ABSOLUTE_TOLERANCE_EUR &&
    phase3Diff < ABSOLUTE_TOLERANCE_EUR &&
    rankStatesEqual &&
    statusByNodeEqual &&
    avByNodeMaxDiff < AV_QGV_TOLERANCE_IP &&
    qgvByNodeMaxDiff < AV_QGV_TOLERANCE_IP &&
    qualifiedLegsMaxDiff === 0 &&
    rootProvisionDiff < ABSOLUTE_TOLERANCE_EUR &&
    maxNodeProvisionDiff < ABSOLUTE_TOLERANCE_EUR;

  return {
    benchmark_id: 'B2-C',
    parameter_set: scenario.id,
    scenario: scenario.id,
    year,
    phase1_total_before: round(phase1Before),
    phase1_total_after: round(phase1After),
    phase1_diff: round(phase1Diff),
    phase2_total_before: round(phase2Before),
    phase2_total_after: round(phase2After),
    phase2_diff: round(phase2Diff),
    phase3_total_before: round(phase3Before),
    phase3_total_after: round(phase3After),
    phase3_diff: round(phase3Diff),
    rank_states_equal: rankStatesEqual,
    status_by_node_equal: statusByNodeEqual,
    av_by_node_max_diff: round(avByNodeMaxDiff),
    qgv_by_node_max_diff: round(qgvByNodeMaxDiff),
    qualified_legs_max_diff: qualifiedLegsMaxDiff,
    root_provision_diff: round(rootProvisionDiff),
    max_node_provision_diff: round(maxNodeProvisionDiff),
    passed,
    notes: scenario.notes,
  };
}

function makeFakeYearEnd() {
  return {
    members: 10,
    shoppers: 20,
    phase1EUR: 100,
    phase2EUR: 50,
    phase3EUR: 25,
    rootProvisionEUR: 30,
    totalEUR: 175,
    rankName: 'Bronze',
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

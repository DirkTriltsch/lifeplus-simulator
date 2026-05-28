import { performance } from 'node:perf_hooks';
import { describe, it } from 'vitest';
import {
  personTreeToNetworkSnapshot,
  runSimulation,
  simulatePersonTree,
  type SimulatorInputs,
} from '@mlm/simulator-core';
import { calculateTreeCompensation, lifeplusProduct } from '../src';

interface Scenario {
  name: string;
  inputs: SimulatorInputs;
}

const SCENARIOS: Scenario[] = [
  {
    name: 'Default (2/3, dup 1, attr 0.18)',
    inputs: {
      membersPerYear: 2,
      shoppersPerYear: 3,
      duplicationRate: 1,
      attritionRate: 0.18,
      memberMonthlyVolume: 200,
      shopperMonthlyVolume: 200,
      personalMonthlyVolume: 200,
    },
  },
  {
    name: 'Medium (4/5, dup 1, attr 0.10)',
    inputs: {
      membersPerYear: 4,
      shoppersPerYear: 5,
      duplicationRate: 1,
      attritionRate: 0.1,
      memberMonthlyVolume: 200,
      shopperMonthlyVolume: 200,
      personalMonthlyVolume: 200,
    },
  },
  {
    name: 'Stress (6/6, dup 1, attr 0)',
    inputs: {
      membersPerYear: 6,
      shoppersPerYear: 6,
      duplicationRate: 1,
      attritionRate: 0,
      memberMonthlyVolume: 200,
      shopperMonthlyVolume: 200,
      personalMonthlyVolume: 200,
    },
  },
];

const ITERATIONS = 5;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function pad(label: string, width: number): string {
  return label.length >= width ? label : `${label}${' '.repeat(width - label.length)}`;
}

// describe.skip per Default — explizit aktivieren via `describe(...)` zum Profilieren.
describe.skip('PROFILE: Simulationsperformance (Tree-Pipeline)', () => {
  it('misst Gesamt- und Teil-Schritte fuer drei Szenarien', () => {
    const rows: Array<{
      scenario: string;
      runSim: number;
      tree: number;
      convert: number;
      comp: number;
      personsY10: number;
      ordersY10: number;
    }> = [];

    for (const { name, inputs } of SCENARIOS) {
      // 1) runSimulation komplett (das ist, was die App pro Slider-Tick triggert)
      const totals: number[] = [];
      let lastResult: ReturnType<typeof runSimulation> | undefined;
      for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();
        lastResult = runSimulation(lifeplusProduct, inputs);
        const t1 = performance.now();
        totals.push(t1 - t0);
      }

      // 2) simulatePersonTree isoliert
      const treeOnly: number[] = [];
      let lastSnapshots: ReturnType<typeof simulatePersonTree> | undefined;
      for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();
        lastSnapshots = simulatePersonTree(inputs, 120);
        const t1 = performance.now();
        treeOnly.push(t1 - t0);
      }

      // 3) personTreeToNetworkSnapshot (120 Monate) isoliert
      const convertTimes: number[] = [];
      for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();
        lastSnapshots!.map(personTreeToNetworkSnapshot);
        const t1 = performance.now();
        convertTimes.push(t1 - t0);
      }

      // 4) calculateTreeCompensation auf den 10 Jahresenden
      const compTimes: number[] = [];
      const yearEnds = lastSnapshots!.filter((m) => m.monthInYear === 12);
      for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();
        for (const snap of yearEnds) {
          calculateTreeCompensation(snap, {
            rootPersonalMonthlyVolume: inputs.personalMonthlyVolume ?? inputs.memberMonthlyVolume,
          });
        }
        const t1 = performance.now();
        compTimes.push(t1 - t0);
      }

      const personsY10 =
        lastResult?.personYearEnds?.[lastResult.personYearEnds.length - 1]?.persons.length ?? 0;
      const ordersY10 =
        lastResult?.personYearEnds?.[lastResult.personYearEnds.length - 1]?.orders.length ?? 0;

      rows.push({
        scenario: name,
        runSim: median(totals),
        tree: median(treeOnly),
        convert: median(convertTimes),
        comp: median(compTimes),
        personsY10,
        ordersY10,
      });
    }

    // Tabelle formatieren
    console.log('\n');
    console.log('===== Simulationsperformance =====');
    console.log(
      `${pad('Szenario', 36)} ${pad('runSim', 10)} ${pad('tree', 10)} ${pad('convert', 10)} ${pad('comp(10y)', 10)} ${pad('Pers Y10', 10)} ${pad('Ord Y10', 10)}`,
    );
    console.log('-'.repeat(110));
    for (const row of rows) {
      console.log(
        `${pad(row.scenario, 36)} ${pad(row.runSim.toFixed(1) + 'ms', 10)} ${pad(row.tree.toFixed(1) + 'ms', 10)} ${pad(row.convert.toFixed(1) + 'ms', 10)} ${pad(row.comp.toFixed(1) + 'ms', 10)} ${pad(String(row.personsY10), 10)} ${pad(String(row.ordersY10), 10)}`,
      );
    }
    console.log('\nMedian aus 5 Iterationen. runSim = full runSimulation (Tree + Convert + Plan-Compensation).');
    console.log('tree = nur simulatePersonTree (120 Monate). convert = personTreeToNetworkSnapshot x120.');
    console.log('comp(10y) = calculateTreeCompensation auf 10 Jahresenden.\n');
  }, 60_000);
});

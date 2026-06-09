import { performance } from 'node:perf_hooks';
import { describe, it } from 'vitest';
import {
  personTreeToNetworkSnapshot,
  runSimulation,
  type SimulatorInputs,
} from '@mlm/simulator-core';
import { calculateTreeCompensation, lifeplusProduct } from '../src';

/**
 * Engine-Benchmark: misst, wie sich runSimulation / compensation / network
 * bei wachsender Knotenzahl verhalten. Antwortet auf die Frage:
 *   "Wieviele echte Knotenpunkte vertraegt die App noch fluessig?"
 *
 * Default ist describe.skip, weil der Lauf 15-60s dauert.
 *
 * Lauf:
 *   npm test -- --run packages/product-lifeplus/tests/profile-sim.test.ts
 *   (vorher describe.skip gezielt auf describe umstellen)
 *
 * Mit Heap-Messung (forciertes GC, stabilere Werte):
 *   node --expose-gc node_modules/vitest/vitest.mjs run \
 *     packages/product-lifeplus/tests/profile-sim.test.ts
 */

interface Scenario {
  name: string;
  inputs: SimulatorInputs;
}

const SCENARIOS: Scenario[] = [
  {
    name: 'Konservativ',
    inputs: {
      membersPerYear: 1,
      shoppersPerYear: 2,
      duplicationRate: 0.5,
      attritionRate: 0.25,
      memberMonthlyVolume: 200,
      shopperMonthlyVolume: 200,
      personalMonthlyVolume: 200,
    },
  },
  {
    name: 'Default',
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
    name: 'Aktiv',
    inputs: {
      membersPerYear: 3,
      shoppersPerYear: 5,
      duplicationRate: 1,
      attritionRate: 0.12,
      memberMonthlyVolume: 200,
      shopperMonthlyVolume: 200,
      personalMonthlyVolume: 200,
    },
  },
  {
    name: 'Aggressiv',
    inputs: {
      membersPerYear: 5,
      shoppersPerYear: 6,
      duplicationRate: 1,
      attritionRate: 0.05,
      memberMonthlyVolume: 200,
      shopperMonthlyVolume: 200,
      personalMonthlyVolume: 200,
    },
  },
];

const ITERATIONS = 3;
const TOTAL_YEARS = 10;
const TOTAL_MONTHS = TOTAL_YEARS * 12;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function padRight(label: string, width: number): string {
  return label.length >= width ? label : `${label}${' '.repeat(width - label.length)}`;
}

function padLeft(label: string, width: number): string {
  return label.length >= width ? label : `${' '.repeat(width - label.length)}${label}`;
}

function heapMB(): number {
  return process.memoryUsage().heapUsed / 1024 / 1024;
}

function maybeGc(): void {
  const g = globalThis as unknown as { gc?: () => void };
  if (typeof g.gc === 'function') g.gc();
}

function sumWeights(persons: ReadonlyArray<{ weight: number; active: boolean }>): number {
  let s = 0;
  for (const p of persons) if (p.active) s += p.weight;
  return s;
}

describe.skip('BENCHMARK: Engine bei steigender Knotenzahl', () => {
  it('misst runSimulation / compensation / network bei 500-10000 Knoten', () => {
    const rows: Array<{
      scenario: string;
      personsY10: number;
      weightY10: number;
      ordersY10: number;
      runSim: number;
      comp: number;
      network: number;
      heapDelta: number;
    }> = [];

    for (const { name, inputs } of SCENARIOS) {
      maybeGc();
      const heapBefore = heapMB();

      // 1) runSimulation komplett (Tree + Convert + Plan-Compensation)
      const totals: number[] = [];
      let lastResult: ReturnType<typeof runSimulation> | undefined;
      for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();
        lastResult = runSimulation(lifeplusProduct, inputs, TOTAL_MONTHS, {
          simulationMode: 'person-tree',
        });
        const t1 = performance.now();
        totals.push(t1 - t0);
      }

      const personYearEnds = lastResult?.personYearEnds ?? [];

      // 2) calculateTreeCompensation auf den 10 Jahresenden isoliert
      const compTimes: number[] = [];
      for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();
        for (const snap of personYearEnds) {
          calculateTreeCompensation(snap, {
            rootPersonalMonthlyVolume:
              inputs.personalMonthlyVolume ?? inputs.memberMonthlyVolume,
          });
        }
        const t1 = performance.now();
        compTimes.push(t1 - t0);
      }

      // 3) personTreeToNetworkSnapshot auf den 10 Jahresenden isoliert
      const networkTimes: number[] = [];
      for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();
        personYearEnds.map(personTreeToNetworkSnapshot);
        const t1 = performance.now();
        networkTimes.push(t1 - t0);
      }

      const last = personYearEnds[personYearEnds.length - 1];
      const personsY10 = last?.persons.length ?? 0;
      const weightY10 = last ? Math.round(sumWeights(last.persons)) : 0;
      const ordersY10 = last?.orders.length ?? 0;

      maybeGc();
      const heapAfter = heapMB();

      rows.push({
        scenario: name,
        personsY10,
        weightY10,
        ordersY10,
        runSim: median(totals),
        comp: median(compTimes),
        network: median(networkTimes),
        heapDelta: heapAfter - heapBefore,
      });
    }

    const COL = {
      scn: 13,
      persons: 10,
      weight: 10,
      orders: 10,
      runSim: 12,
      comp: 12,
      network: 12,
      heap: 12,
    };
    const totalWidth =
      COL.scn + COL.persons + COL.weight + COL.orders + COL.runSim + COL.comp + COL.network + COL.heap;

    console.log(
      `\n===== Engine-Benchmark (${TOTAL_YEARS} Jahre, Median aus ${ITERATIONS} Iterationen) =====`,
    );
    console.log(
      padRight('Szenario', COL.scn) +
        padLeft('Persons', COL.persons) +
        padLeft('Weight', COL.weight) +
        padLeft('Orders', COL.orders) +
        padLeft('runSim ms', COL.runSim) +
        padLeft('comp ms', COL.comp) +
        padLeft('network ms', COL.network) +
        padLeft('heap MB', COL.heap),
    );
    console.log('-'.repeat(totalWidth));
    for (const row of rows) {
      console.log(
        padRight(row.scenario, COL.scn) +
          padLeft(String(row.personsY10), COL.persons) +
          padLeft(String(row.weightY10), COL.weight) +
          padLeft(String(row.ordersY10), COL.orders) +
          padLeft(row.runSim.toFixed(1), COL.runSim) +
          padLeft(row.comp.toFixed(1), COL.comp) +
          padLeft(row.network.toFixed(1), COL.network) +
          padLeft(row.heapDelta.toFixed(1), COL.heap),
      );
    }
    console.log('');
    console.log('Persons  = SimPerson-Objekte am Jahresende 10 (UI-Render-relevant).');
    console.log('Weight   = Summe weight aktiver SimPersons (effektive Personenzahl).');
    console.log('runSim   = runSimulation komplett (10 Jahresbaeume + Convert + Compensation).');
    console.log('comp     = calculateTreeCompensation auf 10 Jahresenden isoliert.');
    console.log('network  = personTreeToNetworkSnapshot auf 10 Jahresenden isoliert.');
    console.log('heap MB  = node heap-Delta waehrend des Szenarios (ohne --expose-gc grob).');
    console.log('');
    console.log(
      'Hinweis: MAX_EXPLICIT_MEMBER_PERSONS in tree-generator.ts ist aktuell 5_000.',
    );
    console.log(
      'Persons > 5000 sind durch Aggregation gedrosselt; Weight zeigt die echte Groesse.',
    );
    console.log('');
  }, 180_000);
});

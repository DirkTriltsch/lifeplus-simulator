import { performance } from 'node:perf_hooks';
import { describe, it } from 'vitest';
import { personTreeToNetworkSnapshot, runSimulation, type SimulatorInputs } from '@mlm/simulator-core';
import { calculateTreeCompensation, lifeplusProduct } from '../src';

const scenarios: Array<[string, SimulatorInputs]> = [
  ['Konservativ', { membersPerYear: 1, shoppersPerYear: 2, duplicationRate: 0.5, attritionRate: 0.25, memberMonthlyVolume: 200, shopperMonthlyVolume: 200, personalMonthlyVolume: 200 }],
  ['Default', { membersPerYear: 2, shoppersPerYear: 3, duplicationRate: 1, attritionRate: 0.18, memberMonthlyVolume: 200, shopperMonthlyVolume: 200, personalMonthlyVolume: 200 }],
  ['DefaultNoChurn', { membersPerYear: 2, shoppersPerYear: 3, duplicationRate: 1, attritionRate: 0, memberMonthlyVolume: 200, shopperMonthlyVolume: 200, personalMonthlyVolume: 200 }],
  ['Aktiv', { membersPerYear: 3, shoppersPerYear: 5, duplicationRate: 1, attritionRate: 0.12, memberMonthlyVolume: 200, shopperMonthlyVolume: 200, personalMonthlyVolume: 200 }],
  ['M4Churn18', { membersPerYear: 4, shoppersPerYear: 3, duplicationRate: 1, attritionRate: 0.18, memberMonthlyVolume: 200, shopperMonthlyVolume: 200, personalMonthlyVolume: 200 }],
];
function sumWeights(persons: ReadonlyArray<{ weight: number; active: boolean; kind?: string }>, kind?: string): number { let s=0; for (const p of persons) if (p.active && (!kind || p.kind===kind)) s += p.weight; return s; }
function med(xs:number[]){ const s=[...xs].sort((a,b)=>a-b); return s[Math.floor(s.length/2)] ?? 0; }
function fmt(n:number){ return Math.round(n).toLocaleString('de-DE'); }

describe.only('Codex person-tree benchmark', () => {
  it('measures person-tree mode', () => {
    console.log('\nScenario | PersonsY10 | MembersW | ShoppersW | runSim ms | comp10 ms | network10 ms');
    for (const [name, inputs] of scenarios) {
      const runs:number[]=[]; let result: ReturnType<typeof runSimulation> | undefined;
      for (let i=0;i<3;i++){ const t0=performance.now(); result=runSimulation(lifeplusProduct, inputs, 120, { simulationMode: 'person-tree' }); runs.push(performance.now()-t0); }
      const snaps=result?.personYearEnds ?? [];
      const compRuns:number[]=[]; for(let i=0;i<3;i++){ const t0=performance.now(); for(const snap of snaps) calculateTreeCompensation(snap, { rootPersonalMonthlyVolume: inputs.personalMonthlyVolume ?? inputs.memberMonthlyVolume }); compRuns.push(performance.now()-t0); }
      const netRuns:number[]=[]; for(let i=0;i<3;i++){ const t0=performance.now(); for(const snap of snaps) personTreeToNetworkSnapshot(snap); netRuns.push(performance.now()-t0); }
      const last=snaps.at(-1); const persons=last?.persons.filter(p=>p.active).length ?? 0; const mw=last?sumWeights(last.persons,'member'):0; const sw=last?sumWeights(last.persons,'shopper'):0;
      console.log(`${name} | ${persons} | ${fmt(mw)} | ${fmt(sw)} | ${med(runs).toFixed(1)} | ${med(compRuns).toFixed(1)} | ${med(netRuns).toFixed(1)}`);
    }
  }, 180000);
});

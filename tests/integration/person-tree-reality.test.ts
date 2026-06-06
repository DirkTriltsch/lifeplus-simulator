import { getProduct } from '@mlm/product-registry';
import { runSimulation, totalMembers, totalShoppers } from '@mlm/simulator-core';
import { createTreeGrowthStrategy } from '@mlm/simulator-realistic-growth';
import { describe, expect, it } from 'vitest';

const product = getProduct('lifeplus');
const inputs = {
  membersPerYear: 1,
  shoppersPerYear: 1,
  duplicationRate: 1,
  attritionRate: 0,
  memberMonthlyVolume: 150,
  shopperMonthlyVolume: 150,
  unitToCurrency: 1,
  monthlyProductCostEUR: 100,
  maxDirectMembersPerMember: 29,
};

describe('Reality-Strategien auf dem Personenbaum', () => {
  it.each([
    ['person-tree-random', 'dirichlet'],
    ['person-tree-momentum', 'momentum'],
  ] as const)(
    'liefert fuer %s einen Personenbaum als Single Source of Truth',
    (simulationMode, strategy) => {
      const result = runSimulation(product, inputs, 120, {
        simulationMode,
        treeGrowthStrategy: createTreeGrowthStrategy({ strategy, seed: 42 }),
      });
      const finalTree = result.personYearEnds?.at(-1);

      expect(result.personYearEnds).toHaveLength(10);
      expect(finalTree).toBeDefined();
      expect(result.finalQuarter.members).toBeCloseTo(
        totalMembers(result.finalQuarter),
        8,
      );
      expect(result.finalQuarter.shoppers).toBeCloseTo(
        totalShoppers(result.finalQuarter),
        8,
      );
      expect(finalTree?.persons.length).toBeGreaterThan(1);
    },
  );

  it('macht Momentum im echten Personenbaum auf Beinebene sichtbar', () => {
    const result = runSimulation(product, inputs, 120, {
      simulationMode: 'person-tree-momentum',
      treeGrowthStrategy: createTreeGrowthStrategy({
        strategy: 'momentum',
        seed: 42,
      }),
    });
    const legSizes = result.finalQuarter.legs.map(
      (leg) =>
        totalMembers({ ...result.finalQuarter, membersByLevel: leg.membersByLevel }) +
        totalShoppers({ ...result.finalQuarter, shoppersByLevel: leg.shoppersByLevel }),
    );
    const min = Math.min(...legSizes);
    const max = Math.max(...legSizes);

    expect(result.personYearEnds).toHaveLength(10);
    expect(max).toBeGreaterThan(min);
  });

  it('produziert mit jeder Strategie nicht-triviales Wachstum (Compound-Drift unter F1a erwartet)', () => {
    // Anmerkung: Unter F1a (ganze Personen, Carry-over) ist Totalgleichheit
    // zwischen Strategien NICHT mehr garantiert. Konzentrierende Strategien
    // (Momentum) erzeugen frueher ganze Members in den staerksten Beinen,
    // die ueber 10 Jahre staerker compound-wachsen als gleichmaessig
    // verteiltes Wachstum. Wir pruefen daher nur, dass beide Strategien
    // ein nicht-triviales Endergebnis liefern.
    const standard = runSimulation(product, inputs, 120, {
      simulationMode: 'person-tree',
    });
    const momentum = runSimulation(product, inputs, 120, {
      simulationMode: 'person-tree-momentum',
      treeGrowthStrategy: createTreeGrowthStrategy({
        strategy: 'momentum',
        seed: 42,
      }),
    });

    expect(standard.finalQuarter.members).toBeGreaterThan(0);
    expect(momentum.finalQuarter.members).toBeGreaterThan(0);
    expect(standard.finalQuarter.qgv).toBeGreaterThan(0);
    expect(momentum.finalQuarter.qgv).toBeGreaterThan(0);
  });
});

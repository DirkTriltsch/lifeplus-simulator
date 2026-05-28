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
  it.each(['dirichlet', 'momentum'] as const)(
    'liefert fuer %s einen Personenbaum als Single Source of Truth',
    (strategy) => {
      const result = runSimulation(product, inputs, 120, {
        treeGrowthStrategy: createTreeGrowthStrategy({ strategy, seed: 42 }),
      });
      const finalTree = result.personYearEnds?.at(-1);

      expect(result.personMonths).toHaveLength(120);
      expect(result.personYearEnds).toHaveLength(10);
      expect(finalTree).toBeDefined();
      expect(result.finalMonth.members).toBeCloseTo(
        totalMembers(result.finalMonth),
        8,
      );
      expect(result.finalMonth.shoppers).toBeCloseTo(
        totalShoppers(result.finalMonth),
        8,
      );
      expect(finalTree?.persons.length).toBeGreaterThan(1);
    },
  );

  it('macht Momentum im echten Personenbaum auf Beinebene sichtbar', () => {
    const result = runSimulation(product, inputs, 120, {
      treeGrowthStrategy: createTreeGrowthStrategy({
        strategy: 'momentum',
        seed: 42,
      }),
    });
    const legSizes = result.finalMonth.legs.map(
      (leg) =>
        totalMembers({ ...result.finalMonth, membersByLevel: leg.membersByLevel }) +
        totalShoppers({ ...result.finalMonth, shoppersByLevel: leg.shoppersByLevel }),
    );
    const min = Math.min(...legSizes);
    const max = Math.max(...legSizes);

    expect(result.personYearEnds).toHaveLength(10);
    expect(max).toBeGreaterThan(min);
  });

  it('haelt das Gesamtwachstum trotz gewichteter Tree-Strategie stabil', () => {
    const standard = runSimulation(product, inputs, 120);
    const momentum = runSimulation(product, inputs, 120, {
      treeGrowthStrategy: createTreeGrowthStrategy({
        strategy: 'momentum',
        seed: 42,
      }),
    });

    expect(momentum.finalMonth.members).toBeCloseTo(standard.finalMonth.members, 8);
    expect(momentum.finalMonth.shoppers).toBeCloseTo(standard.finalMonth.shoppers, 8);
    expect(momentum.finalMonth.qgv).toBeCloseTo(standard.finalMonth.qgv, 8);
  });
});

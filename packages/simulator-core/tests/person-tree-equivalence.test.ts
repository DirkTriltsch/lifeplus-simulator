import { describe, expect, it } from 'vitest';
import { personTreeToNetworkSnapshot, simulatePersonTree } from '../src';

describe('Personenbaum als Standard-Quelle', () => {
  it('liefert Aggregat-Snapshots aus dem Personenbaum', () => {
    const snapshots = simulatePersonTree(
      {
        membersPerYear: 1,
        shoppersPerYear: 1,
        duplicationRate: 1,
        attritionRate: 0,
        memberMonthlyVolume: 150,
        shopperMonthlyVolume: 150,
        maxDirectMembersPerMember: 29,
      },
      24,
    ).map(personTreeToNetworkSnapshot);

    expect(snapshots).toHaveLength(24);
    expect(snapshots[11].membersByLevel[0]).toBeCloseTo(1, 8);
    expect(snapshots[23].membersByLevel[0]).toBeCloseTo(2, 8);
    expect(snapshots[23].membersByLevel[1]).toBeCloseTo(1, 8);
    expect(snapshots[12].shopperGrowth).toBeGreaterThan(0);
  });

  it('wendet Member-Fluktuation vor neuem Wachstum an', () => {
    const snapshots = simulatePersonTree(
      {
        membersPerYear: 1,
        shoppersPerYear: 0,
        duplicationRate: 1,
        attritionRate: 0.5,
        memberMonthlyVolume: 150,
        shopperMonthlyVolume: 150,
        maxDirectMembersPerMember: 29,
      },
      24,
    );

    expect(snapshots[0].memberGrowth).toBe(1);
    expect(snapshots[0].memberAttrition).toBe(0);
    expect(snapshots[12].memberGrowth).toBeGreaterThan(0);
    expect(snapshots[12].memberAttrition).toBe(0);
  });
});

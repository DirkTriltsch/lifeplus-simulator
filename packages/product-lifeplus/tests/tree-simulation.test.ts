import { describe, expect, it } from 'vitest';
import {
  personTreeToNetworkSnapshot,
  simulatePersonTree,
} from '@mlm/simulator-core';
import {
  calculateTreeCompensation,
  runLifeplusTreeSimulation,
} from '../src';

describe('LifePlus Personenbaum-Simulation', () => {
  it('erzeugt aus Szenario-Parametern echte Personen und Bestellungen', () => {
    const snapshots = simulatePersonTree(
      {
        membersPerYear: 2,
        shoppersPerYear: 3,
        duplicationRate: 1,
        attritionRate: 0,
        memberMonthlyVolume: 200,
        shopperMonthlyVolume: 100,
      },
      24,
    );
    const y2 = snapshots[23];
    const network = personTreeToNetworkSnapshot(y2);

    expect(y2.persons.filter((person) => person.kind === 'member')).toHaveLength(6);
    expect(y2.persons.filter((person) => person.kind === 'shopper')).toHaveLength(4);
    expect(y2.orders.length).toBe(10);
    expect(network.membersByLevel).toEqual([4, 4]);
    expect(network.shoppersByLevel).toEqual([6, 6]);
  });

  it('berechnet Phase 1 exakt entlang der echten Upline', () => {
    const snapshot = simulatePersonTree(
      {
        membersPerYear: 1,
        shoppersPerYear: 0,
        duplicationRate: 0,
        attritionRate: 0,
        memberMonthlyVolume: 400,
        shopperMonthlyVolume: 100,
      },
      12,
    )[11];

    const comp = calculateTreeCompensation(snapshot, {
      rootPersonalMonthlyVolume: 40,
    });

    expect(comp.phase1Units).toBeCloseTo(32.5, 2);
    expect(comp.phase2Units).toBe(0);
    expect(comp.phase3Units).toBe(0);
  });

  it('nutzt Auto-AV als echte Member-Order fuer QGV und Provision', () => {
    const snapshot = {
      monthIndex: 11,
      year: 1,
      monthInYear: 12,
      rootId: 'root',
      persons: [
        person('root', 'root', undefined, 50, ['a']),
        person('a', 'member', 'root', 50, ['b', 'c', 'd']),
        person('b', 'member', 'a', 1000, []),
        person('c', 'member', 'a', 1000, []),
        person('d', 'member', 'a', 1000, []),
      ],
      orders: [
        order('o-a', 'a', 50),
        order('o-b', 'b', 1000),
        order('o-c', 'c', 1000),
        order('o-d', 'd', 1000),
      ],
      memberGrowth: 0,
      memberAttrition: 0,
      shopperGrowth: 0,
      shopperAttrition: 0,
    };

    const comp = calculateTreeCompensation(snapshot, {
      rootPersonalMonthlyVolume: 50,
    });
    const aState = comp.rankStates.find((state) => state.personId === 'a');
    const rootPhase1FromA = comp.payouts.find(
      (payout) => payout.orderId === 'o-a' && payout.receiverId === 'root',
    );

    expect(aState?.rank.name).toBe('Bronze');
    expect(aState?.av).toBe(100);
    expect(comp.qgv).toBeCloseTo(3100, 2);
    expect(rootPhase1FromA?.baseVolume).toBe(100);
    expect(rootPhase1FromA?.amount).toBeCloseTo(5, 2);
  });

  it('zaehlt Diamond-Status in unterschiedlichen Beinen auch bei tieferen Kontakten', () => {
    const rootLegIds = Array.from(
      { length: 12 },
      (_value, index) => `leg-${index + 1}`,
    );
    const persons = [
      person('root', 'root', undefined, 50, rootLegIds),
    ];
    const orders = [order('o-root', 'root', 50)];

    for (let legIndex = 1; legIndex <= 4; legIndex++) {
      const legId = `leg-${legIndex}`;
      const diamondId = `diamond-${legIndex}`;
      const leafIds = Array.from(
        { length: 12 },
        (_value, childIndex) => `leaf-${legIndex}-${childIndex + 1}`,
      );
      persons.push(person(legId, 'member', 'root', 50, [diamondId]));
      persons.push(person(diamondId, 'member', legId, 50, leafIds));
      orders.push(order(`o-${legId}`, legId, 50));
      orders.push(order(`o-${diamondId}`, diamondId, 50));

      for (const leafId of leafIds) {
        persons.push(person(leafId, 'member', diamondId, 1250, []));
        orders.push(order(`o-${leafId}`, leafId, 1250));
      }
    }

    for (let legIndex = 5; legIndex <= 12; legIndex++) {
      const legId = `leg-${legIndex}`;
      persons.push(person(legId, 'member', 'root', 50, []));
      orders.push(order(`o-${legId}`, legId, 50));
    }

    const comp = calculateTreeCompensation(
      {
        monthIndex: 11,
        year: 1,
        monthInYear: 12,
        rootId: 'root',
        persons,
        orders,
        memberGrowth: 0,
        memberAttrition: 0,
        shopperGrowth: 0,
        shopperAttrition: 0,
      },
      {
        rootPersonalMonthlyVolume: 50,
      },
    );
    const rootState = comp.rankStates.find((state) => state.personId === 'root');

    expect(rootState?.diamondLegs).toBe(4);
    expect(rootState?.rank.name).toBe('4*Diamond');
  });

  it('zaehlt gewichtete Downline-Knoten als mehrere qualifizierte Beine', () => {
    const snapshot = {
      monthIndex: 11,
      year: 1,
      monthInYear: 12,
      rootId: 'root',
      persons: [
        person('root', 'root', undefined, 50, ['leg']),
        weightedPerson('leg', 'member', 'root', 50, 12, ['diamond']),
        weightedPerson('diamond', 'member', 'leg', 50, 12, ['leaf']),
        weightedPerson('leaf', 'member', 'diamond', 7000, 12, []),
      ],
      orders: [
        weightedOrder('o-leg', 'leg', 50, 12),
        weightedOrder('o-diamond', 'diamond', 50, 12),
        weightedOrder('o-leaf', 'leaf', 7000, 12),
      ],
      memberGrowth: 0,
      memberAttrition: 0,
      shopperGrowth: 0,
      shopperAttrition: 0,
    };

    const comp = calculateTreeCompensation(snapshot, {
      rootPersonalMonthlyVolume: 50,
    });
    const legState = comp.rankStates.find((state) => state.personId === 'leg');
    const rootState = comp.rankStates.find((state) => state.personId === 'root');

    expect(legState?.qualifiedLegs).toBe(12);
    expect(legState?.rank.name).toBe('12*Diamond');
    expect(rootState?.diamondLegs).toBe(12);
    expect(rootState?.rank.name).toBe('12*Diamond');
  });

  it('liefert ein SimulationResult-kompatibles Ergebnis aus dem Personenbaum', () => {
    const result = runLifeplusTreeSimulation(
      {
        membersPerYear: 2,
        shoppersPerYear: 3,
        duplicationRate: 1,
        attritionRate: 0,
        memberMonthlyVolume: 200,
        shopperMonthlyVolume: 200,
        unitToCurrency: 1,
      },
      24,
    );

    expect(result.months).toHaveLength(24);
    expect(result.yearEnds).toHaveLength(2);
    expect(result.finalMonth.networkSize).toBeGreaterThan(0);
    expect(result.finalMonth.totalEUR).toBeGreaterThan(0);
  });
});

function person(
  id: string,
  kind: 'root' | 'member' | 'shopper',
  sponsorId: string | undefined,
  personalMonthlyVolume: number,
  childrenIds: string[],
) {
  return {
    id,
    sponsorId,
    kind,
    joinedMonth: 0,
    active: true,
    weight: 1,
    personalMonthlyVolume,
    childrenIds,
  };
}

function order(id: string, personId: string, volume: number) {
  return weightedOrder(id, personId, volume, 1);
}

function weightedPerson(
  id: string,
  kind: 'root' | 'member' | 'shopper',
  sponsorId: string | undefined,
  personalMonthlyVolume: number,
  weight: number,
  childrenIds: string[],
) {
  return {
    ...person(id, kind, sponsorId, personalMonthlyVolume, childrenIds),
    weight,
  };
}

function weightedOrder(
  id: string,
  personId: string,
  volume: number,
  weight: number,
) {
  return {
    id,
    personId,
    monthIndex: 11,
    kind: 'member_order' as const,
    volume,
    weight,
  };
}

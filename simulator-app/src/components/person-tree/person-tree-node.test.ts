import { describe, expect, it } from 'vitest';
import type {
  PersonTreeSnapshot,
  TreeCompensationResult,
} from '@mlm/simulator-core';
import {
  buildPersonHierarchy,
  collectInitiallyCollapsedIds,
  findPersonNodeById,
  hiddenSubtreeStats,
  type PersonNode,
  type ShopperAggregateNode,
} from './person-tree-node';

describe('person-tree-node', () => {
  it('baut Wurzel mit Member-Beinen und einem Shopper-Aggregat pro Member mit Shoppern', () => {
    const tree = buildPersonHierarchy({
      snapshot: createSnapshot(),
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 50,
    });

    if (!tree) throw new Error('tree expected');
    expect(tree.kind).toBe('root');
    expect(tree.children.map((c) => c.id)).toEqual(['m-1', 'root::shoppers']);

    const m1 = tree.children.find((c) => c.id === 'm-1') as PersonNode;
    expect(m1.kind).toBe('member');
    // m-1 hat einen Member-Sub (m-2) und einen Shopper (s-1) -> ein shopper-aggregate
    expect(m1.children.map((c) => c.id)).toEqual(['m-2', 'm-1::shoppers']);

    const aggregate = m1.children.find(
      (c) => c.kind === 'shopper-aggregate',
    ) as ShopperAggregateNode;
    expect(aggregate.shopperCount).toBe(1);
    expect(aggregate.label).toBe('1 Shopper');
    expect(aggregate.totalQGV).toBe(50);
    expect(aggregate.parentId).toBe('m-1');
  });

  it('praeaggregiert Subtree-Stats fuer Collapse-Anzeigen', () => {
    const tree = buildPersonHierarchy({
      snapshot: createSnapshot(),
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 50,
    });
    if (!tree) throw new Error('tree expected');

    // root: 2 Member (m-1, m-2), 2 Shopper (s-1 unter m-1, s-2 unter root), QGV = 100+100 (Member) + 50+50 (Shopper)
    expect(tree.subtreeMemberCount).toBe(2);
    expect(tree.subtreeShopperCount).toBe(2);
    expect(tree.subtreeQGV).toBe(300);

    const m1 = tree.children.find((c) => c.id === 'm-1') as PersonNode;
    expect(m1.subtreeMemberCount).toBe(2); // m-1 + m-2
    expect(m1.subtreeShopperCount).toBe(1); // s-1
    expect(m1.subtreeQGV).toBe(250); // 100 + 100 + 50
  });

  it('liefert hiddenSubtreeStats ohne den Knoten selbst', () => {
    const tree = buildPersonHierarchy({
      snapshot: createSnapshot(),
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 50,
    });
    if (!tree) throw new Error('tree expected');

    const m1 = findPersonNodeById(tree, 'm-1') as PersonNode;
    const hidden = hiddenSubtreeStats(m1);
    // Unter m-1 stecken m-2 + 1 Shopper, eigener IP nicht enthalten
    expect(hidden.hiddenMemberCount).toBe(1);
    expect(hidden.hiddenShopperCount).toBe(1);
    expect(hidden.hiddenQGV).toBe(150); // 100 (m-2) + 50 (Shopper)
  });

  it('zieht bei hiddenSubtreeStats die gewichtete Eigenperson ab', () => {
    const snapshot = createSnapshot();
    snapshot.persons = snapshot.persons.map((p) =>
      p.id === 'm-1' ? { ...p, weight: 0.4 } : p,
    );

    const tree = buildPersonHierarchy({
      snapshot,
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 50,
    });
    if (!tree) throw new Error('tree expected');

    const m1 = findPersonNodeById(tree, 'm-1') as PersonNode;
    const hidden = hiddenSubtreeStats(m1);
    expect(m1.subtreeMemberCount).toBe(1.4);
    expect(hidden.hiddenMemberCount).toBe(1);
  });

  it('initial-collapsed sammelt nur Knoten ab DEFAULT_OPEN_DEPTH mit Kindern', () => {
    const tree = buildPersonHierarchy({
      snapshot: createSnapshot(),
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 50,
    });
    if (!tree) throw new Error('tree expected');

    const collapsed = collectInitiallyCollapsedIds(tree, 2);
    // Tiefe 0: root, Tiefe 1: m-1, Tiefe 2: m-2 (hat keine Kinder), Shopper-Aggregat (zaehlt nicht)
    expect(collapsed.has('root')).toBe(false);
    expect(collapsed.has('m-1')).toBe(false);
    expect(collapsed.has('m-2')).toBe(false);

    const treeDeep = buildPersonHierarchy({
      snapshot: createDeepSnapshot(),
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 50,
    });
    if (!treeDeep) throw new Error('deep tree expected');
    const collapsedDeep = collectInitiallyCollapsedIds(treeDeep, 2);
    // m-2 hat Kinder und sitzt auf Tiefe 2 -> eingeklappt
    expect(collapsedDeep.has('m-2')).toBe(true);
    expect(collapsedDeep.has('m-3')).toBe(false);
  });

  it('uebernimmt Rang und Provision aus TreeCompensationResult', () => {
    const tree = buildPersonHierarchy({
      snapshot: createSnapshot(),
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 50,
      compensation: createCompensation(),
      unitToCurrency: 0.5,
    });
    if (!tree) throw new Error('tree expected');

    expect(tree.rankName).toBe('Bronze');
    expect(tree.ownProvisionEUR).toBe(50); // 100 * 0.5

    const m1 = findPersonNodeById(tree, 'm-1') as PersonNode;
    expect(m1.ownProvisionEUR).toBe(10); // 20 * 0.5
    expect(m1.subtreeProvisionEUR).toBe(10);
  });

  it('zeigt inaktive Personen standardmaessig grau im Baum', () => {
    const snapshot = createSnapshot();
    snapshot.persons = snapshot.persons.map((p) =>
      p.id === 'm-2' ? { ...p, active: false } : p,
    );

    const tree = buildPersonHierarchy({
      snapshot,
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 50,
    });
    if (!tree) throw new Error('tree expected');

    const m2 = findPersonNodeById(tree, 'm-2') as PersonNode;
    expect(m2.status).toBe('inactive');
    expect(m2.ownIP).toBe(0);
    const m1 = findPersonNodeById(tree, 'm-1') as PersonNode;
    expect(m1.children.map((c) => c.id)).toEqual(['m-2', 'm-1::shoppers']);
    expect(m1.subtreeMemberCount).toBe(2);
  });

  it('kann inaktive Personen ausblenden', () => {
    const snapshot = createSnapshot();
    snapshot.persons = snapshot.persons.map((p) =>
      p.id === 'm-2' ? { ...p, active: false } : p,
    );

    const tree = buildPersonHierarchy({
      snapshot,
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 50,
      hideInactive: true,
    });
    if (!tree) throw new Error('tree expected');

    expect(findPersonNodeById(tree, 'm-2')).toBeNull();
    const m1 = findPersonNodeById(tree, 'm-1') as PersonNode;
    expect(m1.children.map((c) => c.id)).toEqual(['m-1::shoppers']);
  });

  it('zeigt am Shopper-Aggregat Volumen, aber keine Empfaenger-Provision', () => {
    const tree = buildPersonHierarchy({
      snapshot: createSnapshot(),
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 50,
      compensation: createCompensation(),
      unitToCurrency: 0.5,
    });
    if (!tree) throw new Error('tree expected');

    const m1 = findPersonNodeById(tree, 'm-1') as PersonNode;
    const aggregate = m1.children.find(
      (c) => c.kind === 'shopper-aggregate',
    ) as ShopperAggregateNode;
    expect(aggregate.totalQGV).toBe(50);
    expect(aggregate.totalProvisionEUR).toBe(0);
    expect(aggregate.subtreeProvisionEUR).toBe(0);
  });

  it('setzt status auf under_qualified bei reduziertem weight', () => {
    const snapshot = createSnapshot();
    snapshot.persons = snapshot.persons.map((p) =>
      p.id === 'm-1' ? { ...p, weight: 0.4 } : p,
    );

    const tree = buildPersonHierarchy({
      snapshot,
      memberMonthlyVolume: 100,
      shopperMonthlyVolume: 50,
    });
    if (!tree) throw new Error('tree expected');

    const m1 = findPersonNodeById(tree, 'm-1') as PersonNode;
    expect(m1.status).toBe('under_qualified');
  });
});

function createSnapshot(): PersonTreeSnapshot {
  return {
    monthIndex: 11,
    year: 1,
    monthInYear: 12,
    rootId: 'root',
    persons: [
      {
        id: 'root',
        kind: 'root',
        joinedMonth: 0,
        active: true,
        weight: 1,
        personalMonthlyVolume: 100,
        childrenIds: ['m-1', 's-2'],
      },
      {
        id: 'm-1',
        sponsorId: 'root',
        kind: 'member',
        joinedMonth: 0,
        active: true,
        weight: 1,
        personalMonthlyVolume: 100,
        childrenIds: ['m-2', 's-1'],
      },
      {
        id: 'm-2',
        sponsorId: 'm-1',
        kind: 'member',
        joinedMonth: 12,
        active: true,
        weight: 1,
        personalMonthlyVolume: 100,
        childrenIds: [],
      },
      {
        id: 's-1',
        sponsorId: 'm-1',
        kind: 'shopper',
        joinedMonth: 12,
        active: true,
        weight: 1,
        personalMonthlyVolume: 50,
        childrenIds: [],
      },
      {
        id: 's-2',
        sponsorId: 'root',
        kind: 'shopper',
        joinedMonth: 6,
        active: true,
        weight: 1,
        personalMonthlyVolume: 50,
        childrenIds: [],
      },
    ],
    orders: [],
    memberGrowth: 0,
    memberAttrition: 0,
    shopperGrowth: 0,
    shopperAttrition: 0,
  };
}

function createDeepSnapshot(): PersonTreeSnapshot {
  return {
    monthIndex: 11,
    year: 1,
    monthInYear: 12,
    rootId: 'root',
    persons: [
      {
        id: 'root',
        kind: 'root',
        joinedMonth: 0,
        active: true,
        weight: 1,
        personalMonthlyVolume: 100,
        childrenIds: ['m-1'],
      },
      {
        id: 'm-1',
        sponsorId: 'root',
        kind: 'member',
        joinedMonth: 0,
        active: true,
        weight: 1,
        personalMonthlyVolume: 100,
        childrenIds: ['m-2'],
      },
      {
        id: 'm-2',
        sponsorId: 'm-1',
        kind: 'member',
        joinedMonth: 0,
        active: true,
        weight: 1,
        personalMonthlyVolume: 100,
        childrenIds: ['m-3'],
      },
      {
        id: 'm-3',
        sponsorId: 'm-2',
        kind: 'member',
        joinedMonth: 0,
        active: true,
        weight: 1,
        personalMonthlyVolume: 100,
        childrenIds: [],
      },
    ],
    orders: [],
    memberGrowth: 0,
    memberAttrition: 0,
    shopperGrowth: 0,
    shopperAttrition: 0,
  };
}

function createCompensation(): TreeCompensationResult {
  return {
    rankName: 'Bronze',
    totalUnits: 0,
    phase1Units: 0,
    phase2Units: 0,
    phase3Units: 0,
    av: 100,
    qgv: 300,
    networkSize: 4,
    directLegs: 1,
    members: 2,
    shoppers: 2,
    payouts: [
      {
        orderId: 'o-1',
        orderPersonId: 'm-2',
        receiverId: 'root',
        phase: 1,
        levelFromOrder: 2,
        slot: 'level-2',
        rate: 0,
        baseVolume: 0,
        amount: 100,
        reason: 'test',
      },
      {
        orderId: 'o-2',
        orderPersonId: 's-1',
        receiverId: 'm-1',
        phase: 2,
        levelFromOrder: 1,
        slot: 'level-1',
        rate: 0,
        baseVolume: 0,
        amount: 20,
        reason: 'test',
      },
    ],
    rankStates: [
      {
        personId: 'root',
        rank: { name: 'Bronze' },
        av: 100,
        qgv: 300,
        qualifiedLegs: 1,
        bronzeLegs: 0,
        diamondLegs: 0,
      },
      {
        personId: 'm-1',
        rank: { name: 'Believer' },
        av: 100,
        qgv: 150,
        qualifiedLegs: 1,
        bronzeLegs: 0,
        diamondLegs: 0,
      },
    ],
  };
}

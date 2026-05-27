import type { Leg, NetworkSnapshot } from './network';

export type SimPersonKind = 'root' | 'member' | 'shopper';
export type SimOrderKind = 'member_order' | 'shopper_order';

export interface SimPerson {
  id: string;
  sponsorId?: string;
  kind: SimPersonKind;
  joinedMonth: number;
  active: boolean;
  weight: number;
  personalMonthlyVolume: number;
  childrenIds: string[];
}

export interface SimOrder {
  id: string;
  personId: string;
  monthIndex: number;
  kind: SimOrderKind;
  volume: number;
  weight: number;
}

export interface PersonTreeSnapshot {
  monthIndex: number;
  year: number;
  monthInYear: number;
  rootId: string;
  persons: SimPerson[];
  orders: SimOrder[];
  memberGrowth: number;
  memberAttrition: number;
  shopperGrowth: number;
  shopperAttrition: number;
}

export function personTreeToNetworkSnapshot(
  snapshot: PersonTreeSnapshot,
): NetworkSnapshot {
  const personsById = new Map(snapshot.persons.map((person) => [person.id, person]));
  const root = personsById.get(snapshot.rootId);
  if (!root) {
    return emptyNetworkSnapshot(snapshot);
  }

  const membersByLevel: number[] = [];
  const shoppersByLevel: number[] = [];
  const legs: Leg[] = [];

  for (const childId of root.childrenIds) {
    const child = personsById.get(childId);
    if (!child || child.kind !== 'member' || !child.active) continue;

    const legMembersByLevel: number[] = [];
    const legShoppersByLevel: number[] = [];
    collectLevels(child, personsById, 0, legMembersByLevel, legShoppersByLevel);

    legs.push({
      id: child.id,
      membersByLevel: trimLevels(legMembersByLevel),
      shoppersByLevel: trimLevels(legShoppersByLevel),
    });
  }

  for (const leg of legs) {
    mergeLevels(membersByLevel, leg.membersByLevel);
    mergeLevels(shoppersByLevel, leg.shoppersByLevel);
  }

  // Direct shoppers of root are visible at level 0 but do not form legs.
  for (const childId of root.childrenIds) {
    const child = personsById.get(childId);
    if (!child || child.kind !== 'shopper' || !child.active) continue;
    addAtLevel(shoppersByLevel, 0, child.weight);
  }

  return {
    membersByLevel: trimLevels(membersByLevel),
    shoppersByLevel: trimLevels(shoppersByLevel),
    directLegs: membersByLevel[0] ?? 0,
    legs,
    memberGrowth: snapshot.memberGrowth,
    memberAttrition: snapshot.memberAttrition,
    shopperGrowth: snapshot.shopperGrowth,
    shopperAttrition: snapshot.shopperAttrition,
  };
}

export function getUplinePath(
  snapshot: PersonTreeSnapshot,
  personId: string,
): SimPerson[] {
  const personsById = new Map(snapshot.persons.map((person) => [person.id, person]));
  const path: SimPerson[] = [];
  let current = personsById.get(personId);

  while (current?.sponsorId) {
    const sponsor = personsById.get(current.sponsorId);
    if (!sponsor) break;
    path.push(sponsor);
    current = sponsor;
  }

  return path;
}

function collectLevels(
  person: SimPerson,
  personsById: Map<string, SimPerson>,
  level: number,
  membersByLevel: number[],
  shoppersByLevel: number[],
): void {
  if (!person.active) return;

  if (person.kind === 'member') {
    addAtLevel(membersByLevel, level, person.weight);
  } else if (person.kind === 'shopper') {
    addAtLevel(shoppersByLevel, level, person.weight);
  }

  for (const childId of person.childrenIds) {
    const child = personsById.get(childId);
    if (child) {
      collectLevels(child, personsById, level + 1, membersByLevel, shoppersByLevel);
    }
  }
}

function emptyNetworkSnapshot(snapshot: PersonTreeSnapshot): NetworkSnapshot {
  return {
    membersByLevel: [],
    shoppersByLevel: [],
    directLegs: 0,
    legs: [],
    memberGrowth: snapshot.memberGrowth,
    memberAttrition: snapshot.memberAttrition,
    shopperGrowth: snapshot.shopperGrowth,
    shopperAttrition: snapshot.shopperAttrition,
  };
}

function mergeLevels(target: number[], source: number[]): void {
  for (let level = 0; level < source.length; level++) {
    addAtLevel(target, level, source[level] ?? 0);
  }
}

function addAtLevel(levels: number[], level: number, count: number): void {
  if (count <= 0) return;
  while (levels.length <= level) {
    levels.push(0);
  }
  levels[level] += count;
}

function trimLevels(levels: number[]): number[] {
  let last = levels.length - 1;
  while (last >= 0 && Math.abs(levels[last]) < 1e-9) {
    last--;
  }
  return levels.slice(0, last + 1);
}

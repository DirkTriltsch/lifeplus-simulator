import type {
  PersonRankState,
  PersonTreeSnapshot,
  SimOrder,
  SimPerson,
  SimPersonKind,
} from '@mlm/simulator-core';
import { expect } from 'vitest';

export interface FixturePerson {
  id: string;
  kind: SimPersonKind;
  volume: number;
  weight?: number;
  active?: boolean;
  children?: FixturePerson[];
}

export interface NetworkFixtureInput {
  monthIndex?: number;
  root: FixturePerson;
}

export function root(
  id: string,
  volume: number,
  children: FixturePerson[] = [],
): FixturePerson {
  return { id, kind: 'root', volume, children };
}

export function member(
  id: string,
  volume: number,
  children: FixturePerson[] = [],
  options: { weight?: number; active?: boolean } = {},
): FixturePerson {
  return { id, kind: 'member', volume, children, ...options };
}

export function shopper(
  id: string,
  volume: number,
  options: { weight?: number; active?: boolean } = {},
): FixturePerson {
  return { id, kind: 'shopper', volume, ...options };
}

export function networkFixture({
  monthIndex = 11,
  root: rootNode,
}: NetworkFixtureInput): PersonTreeSnapshot {
  const persons: SimPerson[] = [];
  const orders: SimOrder[] = [];

  function visit(node: FixturePerson, sponsorId?: string): void {
    const children = node.children ?? [];
    const weight = node.weight ?? 1;
    const active = node.active ?? true;

    persons.push({
      id: node.id,
      sponsorId,
      kind: node.kind,
      joinedMonth: 0,
      active,
      weight,
      personalMonthlyVolume: node.volume,
      childrenIds: children.map((child) => child.id),
    });

    orders.push({
      id: `order-${node.id}`,
      personId: node.id,
      monthIndex,
      kind: node.kind === 'shopper' ? 'shopper_order' : 'member_order',
      volume: node.volume,
      weight,
    });

    for (const child of children) {
      visit(child, node.id);
    }
  }

  visit(rootNode);

  return {
    monthIndex,
    year: Math.floor(monthIndex / 12) + 1,
    monthInYear: (monthIndex % 12) + 1,
    rootId: rootNode.id,
    persons,
    orders,
    memberGrowth: 0,
    memberAttrition: 0,
    shopperGrowth: 0,
    shopperAttrition: 0,
  };
}

export function treeToAscii(
  snapshot: PersonTreeSnapshot,
  rankStates: PersonRankState[] = [],
): string {
  const personsById = new Map(snapshot.persons.map((person) => [person.id, person]));
  const rankByPersonId = new Map(
    rankStates.map((state) => [state.personId, state]),
  );
  const rootPerson = personsById.get(snapshot.rootId);
  if (!rootPerson) return '<missing root>';

  function lineFor(person: SimPerson): string {
    const rankState = rankByPersonId.get(person.id);
    const rankName =
      person.kind === 'shopper'
        ? 'Shopper'
        : rankState?.rank.name ?? 'unranked';
    const parts = [
      person.id.padEnd(18),
      rankName.padEnd(11),
      `vol=${formatNumber(person.personalMonthlyVolume)}`,
      `w=${formatNumber(person.weight)}`,
    ];

    if (rankState) {
      parts.push(
        `av=${formatNumber(rankState.av)}`,
        `qgv=${formatNumber(rankState.qgv)}`,
        `qLegs=${formatNumber(rankState.qualifiedLegs)}`,
        `bLegs=${formatNumber(rankState.bronzeLegs)}`,
        `dLegs=${formatNumber(rankState.diamondLegs)}`,
      );
    }

    return parts.join('  ');
  }

  function walk(person: SimPerson, prefix: string, isLast: boolean): string[] {
    const marker = prefix ? (isLast ? '`- ' : '+- ') : '';
    const line = `${prefix}${marker}${lineFor(person)}`;
    const childPrefix = prefix ? `${prefix}${isLast ? '   ' : '|  '}` : '';
    const children = person.childrenIds
      .map((childId) => personsById.get(childId))
      .filter((child): child is SimPerson => child !== undefined);

    return [
      line,
      ...children.flatMap((child, index) =>
        walk(child, childPrefix, index === children.length - 1),
      ),
    ];
  }

  return walk(rootPerson, '', true).join('\n');
}

export function expectRankState(
  snapshot: PersonTreeSnapshot,
  rankStates: PersonRankState[],
  personId: string,
  expected: Partial<PersonRankState>,
): void {
  const state = rankStates.find((entry) => entry.personId === personId);

  try {
    expect(state).toMatchObject(expected);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\n\n${treeToAscii(snapshot, rankStates)}`);
  }
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

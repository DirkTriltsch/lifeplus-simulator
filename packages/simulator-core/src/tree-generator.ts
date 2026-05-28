import type { SimulatorInputs } from './contracts';
import type { PersonTreeSnapshot, SimOrder, SimPerson } from './person-tree';

const MONTHS_PER_YEAR = 12;
const DEFAULT_MAX_DIRECT_MEMBERS_PER_MEMBER = 29;
const ROOT_ID = 'root';

export interface TreeGeneratorOptions {
  rootMonthlyVolume?: number;
  growthStrategy?: TreeGrowthStrategy;
}

export interface TreeGrowthContext {
  year: number;
  monthIndex: number;
  persons: ReadonlyArray<SimPerson>;
  sourceMembers: ReadonlyArray<SimPerson>;
  inputs: SimulatorInputs;
}

export interface TreeGrowthStrategy {
  id: string;
  reset?(): void;
  sourceWeights(context: TreeGrowthContext): number[];
}

export function simulatePersonTree(
  inputs: SimulatorInputs,
  totalMonths: number,
  options: TreeGeneratorOptions = {},
): PersonTreeSnapshot[] {
  const maxDirect = Math.max(
    1,
    inputs.maxDirectMembersPerMember ?? DEFAULT_MAX_DIRECT_MEMBERS_PER_MEMBER,
  );
  const root: SimPerson = {
    id: ROOT_ID,
    kind: 'root',
    joinedMonth: 0,
    active: true,
    weight: 1,
    personalMonthlyVolume:
      options.rootMonthlyVolume ??
      inputs.personalMonthlyVolume ??
      inputs.memberMonthlyVolume,
    childrenIds: [],
  };
  let persons = [root];
  let nextId = 1;
  const snapshots: PersonTreeSnapshot[] = [];
  let snapshotPersons = clonePersons(persons);
  options.growthStrategy?.reset?.();

  for (let monthIndex = 0; monthIndex < totalMonths; monthIndex++) {
    const isYearStart = monthIndex % MONTHS_PER_YEAR === 0;
    const year = Math.floor(monthIndex / MONTHS_PER_YEAR) + 1;
    const monthInYear = (monthIndex % MONTHS_PER_YEAR) + 1;
    let memberGrowth = 0;
    let memberAttrition = 0;
    let shopperGrowth = 0;
    let shopperAttrition = 0;

    if (isYearStart) {
      shopperAttrition = applyTreeShopperAttrition(persons, inputs.attritionRate);
      memberAttrition = applyTreeMemberAttrition(persons, inputs.attritionRate);
      const activeMemberChildWeights = buildActiveMemberChildWeights(persons);

      const sourceMembers = persons.filter(
        (person) =>
          person.active &&
          person.kind === 'member' &&
          person.joinedMonth < monthIndex,
      );
      const sourceWeights = sourceGrowthWeights({
        strategy: options.growthStrategy,
        year,
        monthIndex,
        persons,
        sourceMembers,
        inputs,
      });
      const rootPerson = persons[0];
      const directCapacity = Math.max(
        0,
        maxDirect - (activeMemberChildWeights.get(rootPerson.id) ?? 0),
      );
      const directMemberWeight = Math.min(inputs.membersPerYear, directCapacity);
      if (directMemberWeight > 0) {
        const created = createMemberPersons({
          sponsorId: rootPerson.id,
          joinedMonth: monthIndex,
          totalWeight: directMemberWeight,
          personalMonthlyVolume: inputs.memberMonthlyVolume,
          nextId,
        });
        nextId = created.nextId;
        rootPerson.childrenIds.push(...created.members.map((member) => member.id));
        persons.push(...created.members);
        addActiveMemberChildWeight(
          activeMemberChildWeights,
          rootPerson.id,
          directMemberWeight,
        );
        memberGrowth += directMemberWeight;
      }

      if (inputs.shoppersPerYear > 0) {
        const shopper = createPerson({
          id: `s-${nextId++}`,
          sponsorId: rootPerson.id,
          kind: 'shopper',
          joinedMonth: monthIndex,
          weight: inputs.shoppersPerYear,
          personalMonthlyVolume: inputs.shopperMonthlyVolume,
        });
        rootPerson.childrenIds.push(shopper.id);
        persons.push(shopper);
        shopperGrowth += inputs.shoppersPerYear;
      }

      for (let sourceIndex = 0; sourceIndex < sourceMembers.length; sourceIndex++) {
        const source = sourceMembers[sourceIndex];
        const sourceWeight = sourceWeights[sourceIndex] ?? 1;
        const memberCapacity = Math.max(
          0,
          maxDirect - (activeMemberChildWeights.get(source.id) ?? 0),
        );
        const memberWeight = Math.min(
          source.weight *
            inputs.membersPerYear *
            inputs.duplicationRate *
            sourceWeight,
          source.weight * memberCapacity,
        );
        if (memberWeight > 0) {
          const member = createPerson({
            id: `m-${nextId++}`,
            sponsorId: source.id,
            kind: 'member',
            joinedMonth: monthIndex,
            weight: memberWeight,
            personalMonthlyVolume: inputs.memberMonthlyVolume,
          });
          source.childrenIds.push(member.id);
          persons.push(member);
          addActiveMemberChildWeight(
            activeMemberChildWeights,
            source.id,
            memberWeight,
          );
          memberGrowth += memberWeight;
        }

        const shopperWeight =
          source.weight *
          inputs.shoppersPerYear *
          inputs.duplicationRate *
          sourceWeight;
        if (shopperWeight > 0) {
          const shopper = createPerson({
            id: `s-${nextId++}`,
            sponsorId: source.id,
            kind: 'shopper',
            joinedMonth: monthIndex,
            weight: shopperWeight,
            personalMonthlyVolume: inputs.shopperMonthlyVolume,
          });
          source.childrenIds.push(shopper.id);
          persons.push(shopper);
          shopperGrowth += shopperWeight;
        }
      }

      snapshotPersons = clonePersons(persons);
    }

    snapshots.push({
      monthIndex,
      year,
      monthInYear,
      rootId: ROOT_ID,
      persons: snapshotPersons,
      orders: createMonthlyOrders(persons, monthIndex),
      memberGrowth,
      memberAttrition,
      shopperGrowth,
      shopperAttrition,
    });
  }

  return snapshots;
}

function sourceGrowthWeights(input: {
  strategy?: TreeGrowthStrategy;
  year: number;
  monthIndex: number;
  persons: ReadonlyArray<SimPerson>;
  sourceMembers: ReadonlyArray<SimPerson>;
  inputs: SimulatorInputs;
}): number[] {
  const sourceCount = input.sourceMembers.length;
  if (sourceCount <= 0) return [];

  const rawWeights =
    input.strategy?.sourceWeights({
      year: input.year,
      monthIndex: input.monthIndex,
      persons: input.persons,
      sourceMembers: input.sourceMembers,
      inputs: input.inputs,
    }) ?? [];

  if (rawWeights.length !== sourceCount) {
    return Array.from({ length: sourceCount }, () => 1);
  }

  const sanitized = rawWeights.map((weight) =>
    Number.isFinite(weight) && weight > 0 ? weight : 0,
  );
  const sourceWeightSum = input.sourceMembers.reduce(
    (total, source) => total + Math.max(0, source.weight),
    0,
  );
  const weightedScoreSum = sanitized.reduce(
    (total, score, index) =>
      total + score * Math.max(0, input.sourceMembers[index]?.weight ?? 0),
    0,
  );
  if (sourceWeightSum <= 0 || weightedScoreSum <= 0) {
    return Array.from({ length: sourceCount }, () => 1);
  }

  return sanitized.map((score) => (score * sourceWeightSum) / weightedScoreSum);
}

function createPerson(input: {
  id: string;
  sponsorId: string;
  kind: 'member' | 'shopper';
  joinedMonth: number;
  weight: number;
  personalMonthlyVolume: number;
}): SimPerson {
  return {
    id: input.id,
    sponsorId: input.sponsorId,
    kind: input.kind,
    joinedMonth: input.joinedMonth,
    active: true,
    weight: input.weight,
    personalMonthlyVolume: input.personalMonthlyVolume,
    childrenIds: [],
  };
}

function createMemberPersons(input: {
  sponsorId: string;
  joinedMonth: number;
  totalWeight: number;
  personalMonthlyVolume: number;
  nextId: number;
}): { members: SimPerson[]; nextId: number } {
  const members: SimPerson[] = [];
  let nextId = input.nextId;
  const wholeMembers = Math.floor(input.totalWeight + 1e-9);
  const remainder = input.totalWeight - wholeMembers;

  for (let index = 0; index < wholeMembers; index++) {
    members.push(
      createPerson({
        id: `m-${nextId++}`,
        sponsorId: input.sponsorId,
        kind: 'member',
        joinedMonth: input.joinedMonth,
        weight: 1,
        personalMonthlyVolume: input.personalMonthlyVolume,
      }),
    );
  }

  if (remainder > 1e-9) {
    members.push(
      createPerson({
        id: `m-${nextId++}`,
        sponsorId: input.sponsorId,
        kind: 'member',
        joinedMonth: input.joinedMonth,
        weight: remainder,
        personalMonthlyVolume: input.personalMonthlyVolume,
      }),
    );
  }

  return { members, nextId };
}

function applyTreeMemberAttrition(
  persons: SimPerson[],
  attritionRate: number,
): number {
  if (attritionRate <= 0) {
    return 0;
  }

  let memberAttrition = 0;
  const rootId = persons[0]?.id;
  for (const person of persons) {
    if (!person.active || person.kind !== 'member') continue;
    if (person.sponsorId === rootId) continue;

    const leavers = person.weight * attritionRate;
    person.weight = Math.max(0, person.weight - leavers);
    if (person.weight <= 1e-9) {
      person.active = false;
    }
    memberAttrition += leavers;
  }

  return memberAttrition;
}

function applyTreeShopperAttrition(
  persons: SimPerson[],
  attritionRate: number,
): number {
  if (attritionRate <= 0) {
    return 0;
  }

  let shopperAttrition = 0;
  for (const person of persons) {
    if (!person.active || person.kind !== 'shopper') continue;

    const leavers = person.weight * attritionRate;
    person.weight = Math.max(0, person.weight - leavers);
    if (person.weight <= 1e-9) {
      person.active = false;
    }
    shopperAttrition += leavers;
  }

  return shopperAttrition;
}

function createMonthlyOrders(persons: SimPerson[], monthIndex: number): SimOrder[] {
  const orders: SimOrder[] = [];

  for (const person of persons) {
    if (!person.active || person.kind === 'root' || person.personalMonthlyVolume <= 0) {
      continue;
    }

    orders.push({
      id: `o-${monthIndex}-${person.id}`,
      personId: person.id,
      monthIndex,
      kind: person.kind === 'member' ? 'member_order' : 'shopper_order',
      volume: person.personalMonthlyVolume,
      weight: person.weight,
    });
  }

  return orders;
}

function buildActiveMemberChildWeights(persons: SimPerson[]): Map<string, number> {
  const weights = new Map<string, number>();

  for (const person of persons) {
    if (
      person.active &&
      person.kind === 'member' &&
      person.sponsorId !== undefined
    ) {
      addActiveMemberChildWeight(weights, person.sponsorId, person.weight);
    }
  }

  return weights;
}

function addActiveMemberChildWeight(
  weights: Map<string, number>,
  sponsorId: string,
  weight: number,
): void {
  if (weight <= 0) return;
  weights.set(sponsorId, (weights.get(sponsorId) ?? 0) + weight);
}

function clonePersons(persons: SimPerson[]): SimPerson[] {
  return persons.map((person) => ({
    ...person,
    childrenIds: [...person.childrenIds],
  }));
}

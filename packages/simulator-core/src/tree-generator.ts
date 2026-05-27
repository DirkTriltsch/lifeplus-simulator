import type { SimulatorInputs } from './contracts';
import type { PersonTreeSnapshot, SimOrder, SimPerson } from './person-tree';

const MONTHS_PER_YEAR = 12;
const DEFAULT_MAX_DIRECT_MEMBERS_PER_MEMBER = 29;
const ROOT_ID = 'root';

export interface TreeGeneratorOptions {
  rootMonthlyVolume?: number;
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

  for (let monthIndex = 0; monthIndex < totalMonths; monthIndex++) {
    const isYearStart = monthIndex % MONTHS_PER_YEAR === 0;
    const year = Math.floor(monthIndex / MONTHS_PER_YEAR) + 1;
    const monthInYear = (monthIndex % MONTHS_PER_YEAR) + 1;
    let memberGrowth = 0;
    let memberAttrition = 0;
    let shopperGrowth = 0;
    let shopperAttrition = 0;

    if (isYearStart) {
      const attrition = applyTreeAttrition(persons, inputs.attritionRate);
      memberAttrition = attrition.memberAttrition;
      shopperAttrition = attrition.shopperAttrition;

      const sourceMembers = persons.filter(
        (person) =>
          person.active &&
          person.kind === 'member' &&
          person.joinedMonth < monthIndex,
      );
      const rootPerson = persons[0];
      const directCapacity = Math.max(
        0,
        maxDirect - activeMemberChildWeight(rootPerson, persons),
      );
      const directMemberWeight = Math.min(inputs.membersPerYear, directCapacity);
      if (directMemberWeight > 0) {
        const member = createPerson({
          id: `m-${nextId++}`,
          sponsorId: rootPerson.id,
          kind: 'member',
          joinedMonth: monthIndex,
          weight: directMemberWeight,
          personalMonthlyVolume: inputs.memberMonthlyVolume,
        });
        rootPerson.childrenIds.push(member.id);
        persons.push(member);
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

      for (const source of sourceMembers) {
        const memberCapacity = Math.max(
          0,
          maxDirect - activeMemberChildWeight(source, persons),
        );
        const memberWeight = Math.min(
          source.weight * inputs.membersPerYear * inputs.duplicationRate,
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
          memberGrowth += memberWeight;
        }

        const shopperWeight =
          source.weight * inputs.shoppersPerYear * inputs.duplicationRate;
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
    }

    snapshots.push({
      monthIndex,
      year,
      monthInYear,
      rootId: ROOT_ID,
      persons: clonePersons(persons),
      orders: createMonthlyOrders(persons, monthIndex),
      memberGrowth,
      memberAttrition,
      shopperGrowth,
      shopperAttrition,
    });
  }

  return snapshots;
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

function applyTreeAttrition(
  persons: SimPerson[],
  attritionRate: number,
): { memberAttrition: number; shopperAttrition: number } {
  if (attritionRate <= 0) {
    return { memberAttrition: 0, shopperAttrition: 0 };
  }

  let memberAttrition = 0;
  let shopperAttrition = 0;
  for (const person of persons) {
    if (!person.active || person.kind === 'root') continue;

    const leavers = person.weight * attritionRate;
    person.weight = Math.max(0, person.weight - leavers);
    if (person.weight <= 1e-9) {
      person.active = false;
    }

    if (person.kind === 'member') {
      memberAttrition += leavers;
    } else {
      shopperAttrition += leavers;
    }
  }

  return { memberAttrition, shopperAttrition };
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

function activeMemberChildWeight(person: SimPerson, persons: SimPerson[]): number {
  const personsById = new Map(persons.map((item) => [item.id, item]));
  return person.childrenIds.reduce((total, childId) => {
    const child = personsById.get(childId);
    return child?.active && child.kind === 'member' ? total + child.weight : total;
  }, 0);
}

function clonePersons(persons: SimPerson[]): SimPerson[] {
  return persons.map((person) => ({
    ...person,
    childrenIds: [...person.childrenIds],
  }));
}

import type { SimulatorInputs } from './contracts';
import type { PersonTreeSnapshot, SimOrder, SimPerson } from './person-tree';

const MONTHS_PER_YEAR = 12;
const DEFAULT_MAX_DIRECT_MEMBERS_PER_MEMBER = 29;
const MAX_EXPLICIT_MEMBER_PERSONS = 5_000;
const ROOT_ID = 'root';
const CARRY_EPSILON = 1e-9;

export interface TreeGeneratorOptions {
  rootMonthlyVolume?: number;
  growthStrategy?: TreeGrowthStrategy;
  memberAttritionEligibility?: (
    snapshot: PersonTreeSnapshot,
  ) => ReadonlySet<string> | string[] | undefined;
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

interface GenState {
  persons: SimPerson[];
  nextId: number;
  maxDirect: number;
  inputs: SimulatorInputs;
}

export function simulatePersonTree(
  inputs: SimulatorInputs,
  totalMonths: number,
  options: TreeGeneratorOptions = {},
): PersonTreeSnapshot[] {
  const state = createInitialState(inputs, options);
  const snapshots: PersonTreeSnapshot[] = [];
  let snapshotPersons = clonePersons(state.persons);
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
      const result = advanceYear(state, {
        year,
        monthIndex,
        growthStrategy: options.growthStrategy,
        memberAttritionEligibility: options.memberAttritionEligibility,
      });
      memberGrowth = result.memberGrowth;
      memberAttrition = result.memberAttrition;
      shopperGrowth = result.shopperGrowth;
      shopperAttrition = result.shopperAttrition;
      snapshotPersons = clonePersons(state.persons);
    }

    snapshots.push({
      monthIndex,
      year,
      monthInYear,
      rootId: ROOT_ID,
      persons: snapshotPersons,
      orders: createMonthlyOrders(state.persons, monthIndex),
      memberGrowth,
      memberAttrition,
      shopperGrowth,
      shopperAttrition,
    });
  }

  return snapshots;
}

export function simulatePersonTreeYearEnds(
  inputs: SimulatorInputs,
  totalYears: number,
  options: TreeGeneratorOptions = {},
): PersonTreeSnapshot[] {
  const state = createInitialState(inputs, options);
  const snapshots: PersonTreeSnapshot[] = [];
  options.growthStrategy?.reset?.();

  for (let yearIndex = 0; yearIndex < totalYears; yearIndex++) {
    const year = yearIndex + 1;
    const yearStartMonthIndex = yearIndex * MONTHS_PER_YEAR;
    const yearEndMonthIndex = yearStartMonthIndex + MONTHS_PER_YEAR - 1;
    const result = advanceYear(state, {
      year,
      monthIndex: yearStartMonthIndex,
      growthStrategy: options.growthStrategy,
      memberAttritionEligibility: options.memberAttritionEligibility,
    });

    snapshots.push({
      monthIndex: yearEndMonthIndex,
      year,
      monthInYear: MONTHS_PER_YEAR,
      rootId: ROOT_ID,
      persons: clonePersons(state.persons),
      orders: createMonthlyOrders(state.persons, yearEndMonthIndex),
      memberGrowth: result.memberGrowth,
      memberAttrition: result.memberAttrition,
      shopperGrowth: result.shopperGrowth,
      shopperAttrition: result.shopperAttrition,
    });
  }

  return snapshots;
}

function createInitialState(
  inputs: SimulatorInputs,
  options: TreeGeneratorOptions,
): GenState {
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
    shopperMonthlyVolume: inputs.shopperMonthlyVolume,
    shopperCount: 0,
    childrenIds: [],
    memberCarry: 0,
    shopperCarry: 0,
    memberAttritionCarry: 0,
    shopperAttritionCarry: 0,
  };
  return { persons: [root], nextId: 1, maxDirect, inputs };
}

interface AdvanceYearOptions {
  year: number;
  monthIndex: number;
  growthStrategy?: TreeGrowthStrategy;
  memberAttritionEligibility?: (
    snapshot: PersonTreeSnapshot,
  ) => ReadonlySet<string> | string[] | undefined;
}

interface AdvanceYearResult {
  memberGrowth: number;
  memberAttrition: number;
  shopperGrowth: number;
  shopperAttrition: number;
}

function advanceYear(
  state: GenState,
  options: AdvanceYearOptions,
): AdvanceYearResult {
  const { persons, inputs } = state;
  const personsById = buildPersonIndex(persons);
  const eligibleMemberIds = normalizeEligibility(
    options.memberAttritionEligibility?.(
      createEligibilitySnapshot(persons, options.year, options.monthIndex),
    ),
  );

  // 1. Attrition zuerst — neue Members des laufenden Jahres entstehen erst danach
  // und sind im laufenden Jahr nicht churn-faehig (year-offset).
  const shopperAttrition = applyShopperAttrition(persons, personsById, inputs.attritionRate);
  const memberAttrition = applyMemberAttrition(
    persons,
    personsById,
    inputs.attritionRate,
    eligibleMemberIds,
  );

  // 2. Wachstum — sourceMembers nur aus dem Vorjahr-Bestand (year-offset).
  const sourceMembers = persons.filter(
    (person) =>
      person.active &&
      person.kind === 'member' &&
      person.joinedMonth < options.monthIndex,
  );
  const sourceWeights = sourceGrowthWeights({
    strategy: options.growthStrategy,
    year: options.year,
    monthIndex: options.monthIndex,
    persons,
    sourceMembers,
    inputs,
  });

  const rootPerson = persons[0];

  // 3. Root rekrutiert direkt: membersPerYear ohne duplicationRate-Multiplikator
  // (Root ist per Definition immer 100% aktiv, Spec §4.4).
  const rootMembers = takeCarryGrowth(
    rootPerson.memberCarry ?? 0,
    inputs.membersPerYear,
    activeMemberCapacity(rootPerson, personsById, state.maxDirect),
  );
  rootPerson.memberCarry = rootMembers.nextCarry;
  const rootMemberGrowth = appendWholeMembers(
    state,
    rootPerson,
    options.monthIndex,
    rootMembers.newWhole,
  );

  const rootShopperGrowth = addShopperGrowth(rootPerson, inputs.shoppersPerYear);

  // 4. Downline-Sources rekrutieren: membersPerYear × duplicationRate × sourceWeight.
  let downlineMemberGrowth = 0;
  let downlineShopperGrowth = 0;
  for (let sourceIndex = 0; sourceIndex < sourceMembers.length; sourceIndex++) {
    const source = sourceMembers[sourceIndex];
    const sourceWeight = sourceWeights[sourceIndex] ?? 1;

    const memberPoints =
      source.weight * inputs.membersPerYear * inputs.duplicationRate * sourceWeight;
    const dl = takeCarryGrowth(
      source.memberCarry ?? 0,
      memberPoints,
      activeMemberCapacity(source, personsById, state.maxDirect),
    );
    source.memberCarry = dl.nextCarry;
    downlineMemberGrowth += appendWholeMembers(
      state,
      source,
      options.monthIndex,
      dl.newWhole,
    );

    const shopperPoints =
      source.weight * inputs.shoppersPerYear * inputs.duplicationRate * sourceWeight;
    downlineShopperGrowth += addShopperGrowth(source, shopperPoints);
  }

  return {
    memberGrowth: rootMemberGrowth + downlineMemberGrowth,
    memberAttrition,
    shopperGrowth: rootShopperGrowth + downlineShopperGrowth,
    shopperAttrition,
  };
}

function takeCarryGrowth(
  carry: number,
  points: number,
  capacity: number,
): { newWhole: number; nextCarry: number } {
  const total = (carry > 0 ? carry : 0) + (points > 0 ? points : 0);
  const wholeAvailable = Math.floor(total + CARRY_EPSILON);
  const cap = capacity === Number.POSITIVE_INFINITY
    ? wholeAvailable
    : Math.max(0, Math.floor(capacity + CARRY_EPSILON));
  const newWhole = Math.min(wholeAvailable, cap);
  const nextCarry = total - newWhole;
  return { newWhole, nextCarry: nextCarry < CARRY_EPSILON ? 0 : nextCarry };
}

function activeMemberCapacity(
  sponsor: SimPerson,
  personsById: Map<string, SimPerson>,
  maxDirect: number,
): number {
  let activeMembers = 0;
  for (const childId of sponsor.childrenIds) {
    const child = personsById.get(childId);
    if (!child || !child.active || child.kind !== 'member') continue;
    activeMembers += child.weight;
  }
  return Math.max(0, sponsor.weight * maxDirect - activeMembers);
}

function appendWholeMembers(
  state: GenState,
  sponsor: SimPerson,
  joinedMonth: number,
  count: number,
): number {
  if (count <= 0) return 0;

  // Bei sehr grossen Downline-Counts (z.B. tief im Baum) fallen wir auf einen
  // gewichteten Aggregat-Knoten zurueck, um die Personenanzahl beherrschbar zu
  // halten. Das ist eine bewusste Lockerung der F1a-Garantie ("nur ganze Personen")
  // zugunsten der Performance; tritt erst bei > MAX_EXPLICIT_MEMBER_PERSONS auf.
  if (
    state.persons.length + count > MAX_EXPLICIT_MEMBER_PERSONS &&
    count > 1
  ) {
    const aggregated: SimPerson = {
      id: `m-${state.nextId++}`,
      sponsorId: sponsor.id,
      kind: 'member',
      joinedMonth,
      active: true,
      weight: count,
      personalMonthlyVolume: state.inputs.memberMonthlyVolume,
      shopperMonthlyVolume: state.inputs.shopperMonthlyVolume,
      shopperCount: 0,
      childrenIds: [],
      memberCarry: 0,
      shopperCarry: 0,
      memberAttritionCarry: 0,
      shopperAttritionCarry: 0,
    };
    sponsor.childrenIds.push(aggregated.id);
    state.persons.push(aggregated);
    return count;
  }

  for (let i = 0; i < count; i++) {
    const member: SimPerson = {
      id: `m-${state.nextId++}`,
      sponsorId: sponsor.id,
      kind: 'member',
      joinedMonth,
      active: true,
      weight: 1,
      personalMonthlyVolume: state.inputs.memberMonthlyVolume,
      shopperMonthlyVolume: state.inputs.shopperMonthlyVolume,
      shopperCount: 0,
      childrenIds: [],
      memberCarry: 0,
      shopperCarry: 0,
      memberAttritionCarry: 0,
      shopperAttritionCarry: 0,
    };
    sponsor.childrenIds.push(member.id);
    state.persons.push(member);
  }
  return count;
}

function addShopperGrowth(sponsor: SimPerson, points: number): number {
  const growth = Math.max(0, points);
  if (growth <= 0) return 0;
  sponsor.shopperCount = normalizeCarry((sponsor.shopperCount ?? 0) + growth);
  return growth;
}

function applyMemberAttrition(
  persons: SimPerson[],
  personsById: Map<string, SimPerson>,
  attritionRate: number,
  eligibleMemberIds?: ReadonlySet<string>,
): number {
  if (attritionRate <= 0) return 0;
  let totalAttrition = 0;

  for (const sponsor of persons) {
    if (!sponsor.active) continue;
    if (sponsor.kind !== 'root' && sponsor.kind !== 'member') continue;
    const children = sponsor.childrenIds
      .map((id) => personsById.get(id))
      .filter(
        (child): child is SimPerson =>
          child !== undefined &&
          child.active &&
          child.kind === 'member' &&
          (eligibleMemberIds === undefined || eligibleMemberIds.has(child.id)),
      );

    // Carry-over-Pool pro Sponsor: total = activeChildren * rate + carry.
    // floor = ganze Abgaenge, Rest verbleibt als Carry (Spec §6.4).
    const activeWeight = children.reduce((sum, c) => sum + c.weight, 0);
    const carry = sponsor.memberAttritionCarry ?? 0;
    const totalPoints = activeWeight * attritionRate + carry;
    const wholeChurns = Math.min(
      Math.floor(activeWeight + CARRY_EPSILON),
      Math.floor(totalPoints + CARRY_EPSILON),
    );
    sponsor.memberAttritionCarry = normalizeCarry(totalPoints - wholeChurns);

    if (wholeChurns <= 0) continue;

    // Deterministische Auswahl: neueste zuerst — junge Knoten haben statistisch
    // die hoechste Drop-off-Wahrscheinlichkeit und tragen meist keine eigene Downline,
    // sodass Subtree-Verlust ohne Reattachment minimiert wird.
    const sortedNewestFirst = [...children].sort(
      (a, b) => b.joinedMonth - a.joinedMonth || (a.id < b.id ? 1 : -1),
    );
    let remainingChurns = wholeChurns;
    for (const victim of sortedNewestFirst) {
      if (remainingChurns <= 0) break;
      const removedWeight = Math.min(victim.weight, remainingChurns);
      victim.weight = Math.max(0, victim.weight - removedWeight);
      remainingChurns -= removedWeight;
      totalAttrition += removedWeight;

      if (victim.weight <= CARRY_EPSILON) {
        victim.active = false;
        reattachChildrenToSponsor(victim, sponsor, personsById);
      }
    }
  }

  return totalAttrition;
}

function createEligibilitySnapshot(
  persons: SimPerson[],
  year: number,
  monthIndex: number,
): PersonTreeSnapshot {
  return {
    monthIndex: Math.max(0, monthIndex - 1),
    year: Math.max(1, year - 1),
    monthInYear: MONTHS_PER_YEAR,
    rootId: ROOT_ID,
    persons: clonePersons(persons),
    orders: createMonthlyOrders(persons, Math.max(0, monthIndex - 1)),
    memberGrowth: 0,
    memberAttrition: 0,
    shopperGrowth: 0,
    shopperAttrition: 0,
  };
}

function normalizeEligibility(
  eligible: ReadonlySet<string> | string[] | undefined,
): ReadonlySet<string> | undefined {
  if (!eligible) return undefined;
  return Array.isArray(eligible) ? new Set(eligible) : eligible;
}

function applyShopperAttrition(
  persons: SimPerson[],
  _personsById: Map<string, SimPerson>,
  attritionRate: number,
): number {
  if (attritionRate <= 0) return 0;
  let totalAttrition = 0;

  for (const sponsor of persons) {
    if (!sponsor.active) continue;
    const current = sponsor.shopperCount ?? 0;
    if (current <= 0) continue;
    const lost = current * attritionRate;
    sponsor.shopperCount = normalizeCarry(current - lost);
    totalAttrition += lost;
  }

  return totalAttrition;
}

function normalizeCarry(value: number): number {
  return value < CARRY_EPSILON ? 0 : value;
}

function reattachChildrenToSponsor(
  victim: SimPerson,
  sponsor: SimPerson,
  personsById: Map<string, SimPerson>,
): void {
  sponsor.shopperCount = normalizeCarry(
    (sponsor.shopperCount ?? 0) + (victim.shopperCount ?? 0),
  );
  victim.shopperCount = 0;

  if (victim.childrenIds.length === 0) return;

  for (const childId of victim.childrenIds) {
    const child = personsById.get(childId);
    if (!child || !child.active) continue;
    child.sponsorId = sponsor.id;
    sponsor.childrenIds.push(child.id);
  }
  victim.childrenIds = [];
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

function createMonthlyOrders(persons: SimPerson[], monthIndex: number): SimOrder[] {
  const orders: SimOrder[] = [];

  for (const person of persons) {
    if (!person.active) continue;

    if (person.kind === 'member' && person.personalMonthlyVolume > 0) {
      orders.push({
        id: `o-${monthIndex}-${person.id}`,
        personId: person.id,
        monthIndex,
        kind: 'member_order',
        volume: person.personalMonthlyVolume,
        weight: person.weight,
      });
    }

    if (person.kind === 'shopper' && person.personalMonthlyVolume > 0) {
      orders.push({
        id: `o-${monthIndex}-${person.id}`,
        personId: person.id,
        monthIndex,
        kind: 'shopper_order',
        volume: person.personalMonthlyVolume,
        weight: person.weight,
      });
    }

    const shopperCount = person.shopperCount ?? 0;
    const shopperMonthlyVolume =
      person.shopperMonthlyVolume ?? stateInputFallbackShopperVolume(person);
    if (shopperCount > 0 && shopperMonthlyVolume > 0) {
      orders.push({
        id: `o-${monthIndex}-${person.id}-shoppers`,
        personId: person.id,
        monthIndex,
        kind: 'shopper_order',
        volume: shopperMonthlyVolume,
        weight: shopperCount,
      });
    }
  }

  return orders;
}

function stateInputFallbackShopperVolume(person: SimPerson): number {
  return person.kind === 'shopper' ? person.personalMonthlyVolume : 0;
}

function buildPersonIndex(persons: SimPerson[]): Map<string, SimPerson> {
  const map = new Map<string, SimPerson>();
  for (const person of persons) map.set(person.id, person);
  return map;
}

function clonePersons(persons: SimPerson[]): SimPerson[] {
  return persons.map((person) => ({
    ...person,
    childrenIds: [...person.childrenIds],
  }));
}

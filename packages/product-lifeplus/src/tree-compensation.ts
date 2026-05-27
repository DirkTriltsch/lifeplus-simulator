import type {
  PersonTreeSnapshot,
  SimOrder,
  SimPerson,
} from '@mlm/simulator-core';
import { getUplinePath, personTreeToNetworkSnapshot } from '@mlm/simulator-core';
import {
  PHASE1,
  PHASE1_QUALIFICATION,
  REFERRAL_THRESHOLD_IP,
} from './constants';
import { determineRank, type RankResult } from './ranks';
import {
  allocatePhase2Slots,
  allocatePhase3Slots,
  normalizeRankName,
} from './payout-slots';

export interface TreeCompensationInputs {
  rootPersonalMonthlyVolume: number;
}

export interface PersonRankState {
  personId: string;
  rank: RankResult;
  av: number;
  qgv: number;
  qualifiedLegs: number;
  bronzeLegs: number;
  diamondLegs: number;
}

export interface TreePayout {
  orderId: string;
  orderPersonId: string;
  receiverId: string;
  phase: 1 | 2 | 3;
  levelFromOrder: number;
  slot: string;
  rate: number;
  baseVolume: number;
  amount: number;
  reason: string;
}

export interface TreeCompensationResult {
  totalUnits: number;
  phase1Units: number;
  phase2Units: number;
  phase3Units: number;
  rankName: string;
  av: number;
  qgv: number;
  networkSize: number;
  directLegs: number;
  members: number;
  shoppers: number;
  payouts: TreePayout[];
  rankStates: PersonRankState[];
}

interface SubtreeStats {
  qgv: number;
  members: number;
  shoppers: number;
}

export function calculateTreeCompensation(
  snapshot: PersonTreeSnapshot,
  inputs: TreeCompensationInputs,
): TreeCompensationResult {
  const rankStates = calculateRankStates(snapshot);
  const rankByPersonId = new Map(
    rankStates.map((state) => [state.personId, state]),
  );
  const payouts = snapshot.orders.flatMap((order) =>
    calculateOrderPayouts(snapshot, order, rankByPersonId),
  );
  const rootPayouts = payouts.filter((payout) => payout.receiverId === snapshot.rootId);
  const rootRank = rankByPersonId.get(snapshot.rootId);
  const network = personTreeToNetworkSnapshot(snapshot);
  const members = network.membersByLevel.reduce((total, count) => total + count, 0);
  const shoppers = network.shoppersByLevel.reduce((total, count) => total + count, 0);
  const phase1Units = sum(rootPayouts.filter((payout) => payout.phase === 1).map((payout) => payout.amount));
  const phase2Units = sum(rootPayouts.filter((payout) => payout.phase === 2).map((payout) => payout.amount));
  const phase3Units = sum(rootPayouts.filter((payout) => payout.phase === 3).map((payout) => payout.amount));

  return {
    totalUnits: phase1Units + phase2Units + phase3Units,
    phase1Units,
    phase2Units,
    phase3Units,
    rankName: rootRank?.rank.name ?? 'Member',
    av: rootRank?.av ?? inputs.rootPersonalMonthlyVolume,
    qgv: rootRank?.qgv ?? 0,
    networkSize: members + shoppers,
    directLegs: network.directLegs,
    members,
    shoppers,
    payouts,
    rankStates,
  };
}

function calculateOrderPayouts(
  snapshot: PersonTreeSnapshot,
  order: SimOrder,
  rankByPersonId: Map<string, PersonRankState>,
): TreePayout[] {
  const upline = getUplinePath(snapshot, order.personId);
  const weightedVolume = order.volume * order.weight;

  return [
    ...calculateOrderPhase1(order, upline, rankByPersonId, weightedVolume),
    ...calculateOrderPhase2(order, upline, rankByPersonId, weightedVolume),
    ...calculateOrderPhase3(order, upline, rankByPersonId, weightedVolume),
  ];
}

function calculateOrderPhase1(
  order: SimOrder,
  upline: SimPerson[],
  rankByPersonId: Map<string, PersonRankState>,
  weightedVolume: number,
): TreePayout[] {
  const payouts: TreePayout[] = [];

  for (const slice of phase1Slices(order, weightedVolume)) {
    for (let level = 1; level <= 3; level++) {
      const rate = slice.rates[level - 1];
      const receiverIndex = findPhase1Receiver(upline, rankByPersonId, level - 1, level);
      if (receiverIndex < 0) continue;

      const receiver = upline[receiverIndex];
      payouts.push({
        orderId: order.id,
        orderPersonId: order.personId,
        receiverId: receiver.id,
        phase: 1,
        levelFromOrder: receiverIndex + 1,
        slot: `${slice.label} Ebene ${level}`,
        rate,
        baseVolume: slice.baseVolume,
        amount: slice.baseVolume * rate,
        reason:
          receiverIndex === level - 1
            ? `Phase 1 ${slice.label}, Ebene ${level}`
            : `Phase 1 ${slice.label}, Ebene ${level} komprimiert auf Ebene ${receiverIndex + 1}`,
      });
    }
  }

  return payouts;
}

function calculateOrderPhase2(
  order: SimOrder,
  upline: SimPerson[],
  rankByPersonId: Map<string, PersonRankState>,
  weightedVolume: number,
): TreePayout[] {
  const deepUpline = upline.slice(3);
  const allocations = allocatePhase2Slots(
    deepUpline.map((person) => rankByPersonId.get(person.id)?.rank.name ?? 'Member'),
  );

  return allocations.flatMap((allocation, index) => {
    if (allocation.rate <= 0) return [];

    const receiver = deepUpline[index];
    return [
      {
        orderId: order.id,
        orderPersonId: order.personId,
        receiverId: receiver.id,
        phase: 2 as const,
        levelFromOrder: index + 4,
        slot: allocation.slots.join(' + '),
        rate: allocation.rate,
        baseVolume: weightedVolume,
        amount: weightedVolume * allocation.rate,
        reason: `Phase 2: ${allocation.slots.join(', ')} genommen`,
      },
    ];
  });
}

function calculateOrderPhase3(
  order: SimOrder,
  upline: SimPerson[],
  rankByPersonId: Map<string, PersonRankState>,
  weightedVolume: number,
): TreePayout[] {
  const deepUpline = upline.slice(3);
  const allocations = allocatePhase3Slots(
    deepUpline.map((person) => rankByPersonId.get(person.id)?.rank.name ?? 'Member'),
  );

  return allocations.flatMap((allocation, index) => {
    if (allocation.rate <= 0) return [];

    const receiver = deepUpline[index];
    return [
      {
        orderId: order.id,
        orderPersonId: order.personId,
        receiverId: receiver.id,
        phase: 3 as const,
        levelFromOrder: index + 4,
        slot: allocation.slots.join(' + '),
        rate: allocation.rate,
        baseVolume: weightedVolume,
        amount: weightedVolume * allocation.rate,
        reason: `Phase 3: ${allocation.slots.join(', ')} genommen`,
      },
    ];
  });
}

function calculateRankStates(snapshot: PersonTreeSnapshot): PersonRankState[] {
  const personsById = new Map(snapshot.persons.map((person) => [person.id, person]));
  const memo = new Map<string, PersonRankState>();

  function rankPerson(person: SimPerson): PersonRankState {
    const cached = memo.get(person.id);
    if (cached) return cached;

    const directMemberChildren = person.childrenIds
      .map((childId) => personsById.get(childId))
      .filter(
        (child): child is SimPerson =>
          child !== undefined && child.active && child.kind === 'member',
      );
    const childRanks = directMemberChildren.map(rankPerson);
    const subtree = calculateSubtreeStats(person, personsById);
    const qgv =
      subtree.qgv -
      (person.kind === 'root' || person.kind === 'member'
        ? person.personalMonthlyVolume * person.weight
        : 0);
    const bronzeLegs = childRanks.filter((state) =>
      isBronzeOrHigher(state.rank.name),
    ).length;
    const diamondLegs = childRanks.filter((state) =>
      isDiamondOrHigher(state.rank.name),
    ).length;
    const av =
      person.kind === 'root' || person.kind === 'member'
        ? person.personalMonthlyVolume
        : 0;
    const rank = determineRank({
      av,
      qgv,
      qualifiedLegs: directMemberChildren.length,
      bronzeLegs,
      diamondLegs,
    });
    const state = {
      personId: person.id,
      rank,
      av,
      qgv,
      qualifiedLegs: directMemberChildren.length,
      bronzeLegs,
      diamondLegs,
    };

    memo.set(person.id, state);
    return state;
  }

  for (const person of snapshot.persons) {
    if (person.active && (person.kind === 'root' || person.kind === 'member')) {
      rankPerson(person);
    }
  }

  return [...memo.values()];
}

function calculateSubtreeStats(
  person: SimPerson,
  personsById: Map<string, SimPerson>,
): SubtreeStats {
  let members = person.kind === 'member' && person.active ? person.weight : 0;
  let shoppers = person.kind === 'shopper' && person.active ? person.weight : 0;
  let qgv = person.active ? person.personalMonthlyVolume * person.weight : 0;

  for (const childId of person.childrenIds) {
    const child = personsById.get(childId);
    if (!child) continue;
    const childStats = calculateSubtreeStats(child, personsById);
    members += childStats.members;
    shoppers += childStats.shoppers;
    qgv += childStats.qgv;
  }

  return { qgv, members, shoppers };
}

function phase1Slices(
  order: SimOrder,
  weightedVolume: number,
): Array<{ label: string; baseVolume: number; rates: [number, number, number] }> {
  if (order.kind === 'shopper_order') {
    return [
      {
        label: 'Shopper',
        baseVolume: weightedVolume,
        rates: [PHASE1.shop.level1, PHASE1.shop.level2, PHASE1.shop.level3] as [
          number,
          number,
          number,
        ],
      },
    ];
  }

  const firstPart = Math.min(order.volume, REFERRAL_THRESHOLD_IP) * order.weight;
  const restPart = Math.max(0, order.volume - REFERRAL_THRESHOLD_IP) * order.weight;

  return [
    {
      label: 'Member erste 150 IP',
      baseVolume: firstPart,
      rates: [
        PHASE1.referral.level1,
        PHASE1.referral.level2,
        PHASE1.referral.level3,
      ] as [number, number, number],
    },
    {
      label: 'Member ab 151 IP',
      baseVolume: restPart,
      rates: [
        PHASE1.shopDiscount.level1,
        PHASE1.shopDiscount.level2,
        PHASE1.shopDiscount.level3,
      ] as [number, number, number],
    },
  ].filter((slice) => slice.baseVolume > 0);
}

function findPhase1Receiver(
  upline: SimPerson[],
  rankByPersonId: Map<string, PersonRankState>,
  startIndex: number,
  phase1Level: number,
): number {
  for (let index = startIndex; index < upline.length; index++) {
    const person = upline[index];
    const state = rankByPersonId.get(person.id);
    const qualification =
      PHASE1_QUALIFICATION[
        `level${phase1Level}` as keyof typeof PHASE1_QUALIFICATION
      ];

    if (
      state &&
      state.av >= qualification.minAV &&
      state.qualifiedLegs >= qualification.minQL
    ) {
      return index;
    }
  }

  return -1;
}

function isBronzeOrHigher(rank: string): boolean {
  const normalized = normalizeRankName(rank);
  return (
    ['Bronze', 'Silver', 'Gold', 'Diamond', '1*Diamond', '2*Diamond', '3*Diamond'].includes(
      normalized,
    ) || isExtendedDiamondRank(normalized)
  );
}

function isDiamondOrHigher(rank: string): boolean {
  const normalized = normalizeRankName(rank);
  return (
    ['Diamond', '1*Diamond', '2*Diamond', '3*Diamond'].includes(normalized) ||
    isExtendedDiamondRank(normalized)
  );
}

function isExtendedDiamondRank(rank: string): boolean {
  const match = rank.match(/^(\d+)\*Diamond$/);
  return match ? Number(match[1]) >= 4 : false;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

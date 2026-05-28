import type {
  PersonTreeSnapshot,
  PersonRankState,
  SimOrder,
  SimPerson,
  TreeCompensationResult,
  TreePayout,
} from '@mlm/simulator-core';
import { personTreeToNetworkSnapshot } from '@mlm/simulator-core';
import {
  PHASE1,
  PHASE1_QUALIFICATION,
  REFERRAL_THRESHOLD_IP,
} from './constants';
import { determineEffectiveAV, determineRank } from './ranks';
import {
  allocatePhase2Slots,
  allocatePhase3Slots,
  normalizeRankName,
} from './payout-slots';

export interface TreeCompensationInputs {
  rootPersonalMonthlyVolume: number;
}

interface SubtreeStats {
  qgv: number;
  members: number;
  shoppers: number;
}

interface RankComputation {
  state: PersonRankState;
  subtree: SubtreeStats;
  containsBronze: boolean;
  containsDiamond: boolean;
}

export function calculateTreeCompensation(
  snapshot: PersonTreeSnapshot,
  inputs: TreeCompensationInputs,
): TreeCompensationResult {
  const personsById = new Map(snapshot.persons.map((person) => [person.id, person]));
  const rankStates = calculateRankStates(snapshot);
  const rankByPersonId = new Map(
    rankStates.map((state) => [state.personId, state]),
  );
  const payouts = snapshot.orders.flatMap((order) =>
    calculateOrderPayouts(personsById, order, rankByPersonId),
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
  personsById: Map<string, SimPerson>,
  order: SimOrder,
  rankByPersonId: Map<string, PersonRankState>,
): TreePayout[] {
  const effectiveOrder =
    order.kind === 'member_order'
      ? { ...order, volume: rankByPersonId.get(order.personId)?.av ?? order.volume }
      : order;
  const upline = getUplinePath(personsById, order.personId);
  const weightedVolume = effectiveOrder.volume * effectiveOrder.weight;

  return [
    ...calculateOrderPhase1(effectiveOrder, upline, rankByPersonId, weightedVolume),
    ...calculateOrderPhase2(effectiveOrder, upline, rankByPersonId, weightedVolume),
    ...calculateOrderPhase3(effectiveOrder, upline, rankByPersonId, weightedVolume),
  ];
}

function getUplinePath(
  personsById: Map<string, SimPerson>,
  personId: string,
): SimPerson[] {
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
  const memo = new Map<string, RankComputation>();

  function rankPerson(person: SimPerson): RankComputation {
    const cached = memo.get(person.id);
    if (cached) return cached;

    if (!person.active || person.kind === 'shopper') {
      const subtree = calculateShopperSubtreeStats(person, personsById);
      const state: PersonRankState = {
        personId: person.id,
        rank: determineRank({
          av: 0,
          qgv: 0,
          qualifiedLegs: 0,
          bronzeLegs: 0,
          diamondLegs: 0,
        }),
        av: 0,
        qgv: 0,
        qualifiedLegs: 0,
        bronzeLegs: 0,
        diamondLegs: 0,
      };
      const computation = {
        state,
        subtree,
        containsBronze: false,
        containsDiamond: false,
      };
      memo.set(person.id, computation);
      return computation;
    }

    const directMemberChildren = person.childrenIds
      .map((childId) => personsById.get(childId))
      .filter(
        (child): child is SimPerson =>
          child !== undefined && child.active && child.kind === 'member',
      );
    const childComputations = directMemberChildren.map(rankPerson);
    const childSubtreeQgv = person.childrenIds
      .map((childId) => personsById.get(childId))
      .filter((child): child is SimPerson => child !== undefined && child.active)
      .reduce((total, child) => total + rankPerson(child).subtree.qgv, 0);
    const childMembers = person.childrenIds
      .map((childId) => personsById.get(childId))
      .filter((child): child is SimPerson => child !== undefined && child.active)
      .reduce((total, child) => total + rankPerson(child).subtree.members, 0);
    const childShoppers = person.childrenIds
      .map((childId) => personsById.get(childId))
      .filter((child): child is SimPerson => child !== undefined && child.active)
      .reduce((total, child) => total + rankPerson(child).subtree.shoppers, 0);
    const qgv = childSubtreeQgv;
    const qualifiedLegs = directMemberChildren.reduce(
      (total, child) => total + child.weight,
      0,
    );
    const bronzeLegs = directMemberChildren.reduce((total, child, index) => {
      const childComputation = childComputations[index];
      return childComputation?.containsBronze ? total + child.weight : total;
    }, 0);
    const diamondLegs = directMemberChildren.reduce((total, child, index) => {
      const childComputation = childComputations[index];
      return childComputation?.containsDiamond ? total + child.weight : total;
    }, 0);
    const requestedAV =
      person.kind === 'root' || person.kind === 'member'
        ? person.personalMonthlyVolume
        : 0;
    const av = determineEffectiveAV({
      av: requestedAV,
      qgv,
      qualifiedLegs,
      bronzeLegs,
      diamondLegs,
    });
    const rank = determineRank({
      av,
      qgv,
      qualifiedLegs,
      bronzeLegs,
      diamondLegs,
    });
    const ownVolume = person.active ? av * person.weight : 0;
    const subtree = {
      qgv: qgv + ownVolume,
      members: (person.kind === 'member' ? person.weight : 0) + childMembers,
      shoppers: childShoppers,
    };
    const state: PersonRankState = {
      personId: person.id,
      rank,
      av,
      qgv,
      qualifiedLegs,
      bronzeLegs,
      diamondLegs,
    };
    const containsBronze =
      isBronzeOrHigher(rank.name) ||
      childComputations.some((child) => child.containsBronze);
    const containsDiamond =
      isDiamondOrHigher(rank.name) ||
      childComputations.some((child) => child.containsDiamond);
    const computation = { state, subtree, containsBronze, containsDiamond };

    memo.set(person.id, computation);
    return computation;
  }

  for (const person of snapshot.persons) {
    if (person.active && (person.kind === 'root' || person.kind === 'member')) {
      rankPerson(person);
    }
  }

  return [...memo.values()].map((entry) => entry.state);
}

function calculateShopperSubtreeStats(
  person: SimPerson,
  personsById: Map<string, SimPerson>,
): SubtreeStats {
  let members = person.kind === 'member' && person.active ? person.weight : 0;
  let shoppers = person.kind === 'shopper' && person.active ? person.weight : 0;
  let qgv = person.active ? person.personalMonthlyVolume * person.weight : 0;

  for (const childId of person.childrenIds) {
    const child = personsById.get(childId);
    if (!child) continue;
    const childStats = calculateShopperSubtreeStats(child, personsById);
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

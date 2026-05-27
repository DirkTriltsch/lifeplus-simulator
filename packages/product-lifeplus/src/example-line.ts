import { PHASE1, REFERRAL_THRESHOLD_IP } from './constants';
import {
  allocatePhase2Slots,
  allocatePhase3Slots,
  normalizeRankName,
  type PayoutPhase,
} from './payout-slots';

export type ExampleOrderKind =
  | 'shopper'
  | 'member_first_150'
  | 'member_above_150'
  | 'member_order';

export interface ExampleLinePerson {
  id: string;
  name?: string;
  rank: string;
  /** Optional: false erzwingt Phase-1-Kompression zur naechsten Upline. */
  qualifiedForPhase1?: boolean;
}

export interface ExampleOrder {
  kind: ExampleOrderKind;
  ip: number;
}

export interface ExampleLineInput {
  /** Naechste Upline zuerst: Ebene 1, Ebene 2, Ebene 3, Ebene 4, ... */
  peopleFromCustomerUp: ExampleLinePerson[];
  order: ExampleOrder;
}

export interface ExamplePayout {
  personId: string;
  name?: string;
  rank: string;
  phase: 1 | PayoutPhase;
  levelFromCustomer: number;
  slot?: string;
  rate: number;
  baseIP: number;
  amountIP: number;
  note: string;
}

export interface ExampleLineCalculation {
  payouts: ExamplePayout[];
  phase1IP: number;
  phase2IP: number;
  phase3IP: number;
  totalIP: number;
  totalRateOnOrder: number;
}

interface Phase1Slice {
  label: string;
  baseIP: number;
  rates: [number, number, number];
}

export function calculateExampleLine(
  input: ExampleLineInput,
): ExampleLineCalculation {
  const payouts = [
    ...calculateExamplePhase1(input),
    ...calculateExamplePhase2(input),
    ...calculateExamplePhase3(input),
  ];
  const phase1IP = sumPayouts(payouts, 1);
  const phase2IP = sumPayouts(payouts, 2);
  const phase3IP = sumPayouts(payouts, 3);
  const totalIP = phase1IP + phase2IP + phase3IP;

  return {
    payouts,
    phase1IP,
    phase2IP,
    phase3IP,
    totalIP,
    totalRateOnOrder: input.order.ip > 0 ? totalIP / input.order.ip : 0,
  };
}

function calculateExamplePhase1(input: ExampleLineInput): ExamplePayout[] {
  const payouts: ExamplePayout[] = [];

  for (const slice of phase1Slices(input.order)) {
    if (slice.baseIP <= 0) continue;

    for (let level = 1; level <= 3; level++) {
      const rate = slice.rates[level - 1];
      if (rate <= 0) continue;

      const receiverIndex = findQualifiedPhase1Receiver(
        input.peopleFromCustomerUp,
        level - 1,
      );
      if (receiverIndex < 0) continue;

      const person = input.peopleFromCustomerUp[receiverIndex];
      payouts.push({
        personId: person.id,
        name: person.name,
        rank: normalizeRankName(person.rank),
        phase: 1,
        levelFromCustomer: receiverIndex + 1,
        slot: `${slice.label} Ebene ${level}`,
        rate,
        baseIP: slice.baseIP,
        amountIP: slice.baseIP * rate,
        note:
          receiverIndex === level - 1
            ? `Phase 1 ${slice.label}, Ebene ${level}`
            : `Phase 1 ${slice.label}, Ebene ${level} komprimiert von Ebene ${level} auf Ebene ${receiverIndex + 1}`,
      });
    }
  }

  return payouts;
}

function calculateExamplePhase2(input: ExampleLineInput): ExamplePayout[] {
  const deepPeople = input.peopleFromCustomerUp.slice(3);
  const allocations = allocatePhase2Slots(deepPeople.map((person) => person.rank));

  return allocations.flatMap((allocation, index) => {
    if (allocation.rate <= 0) return [];

    const person = deepPeople[index];
    return [
      {
        personId: person.id,
        name: person.name,
        rank: allocation.rank,
        phase: 2 as const,
        levelFromCustomer: index + 4,
        slot: allocation.slots.join(' + '),
        rate: allocation.rate,
        baseIP: input.order.ip,
        amountIP: input.order.ip * allocation.rate,
        note: `Phase 2: ${allocation.slots.join(', ')} genommen`,
      },
    ];
  });
}

function calculateExamplePhase3(input: ExampleLineInput): ExamplePayout[] {
  const deepPeople = input.peopleFromCustomerUp.slice(3);
  const allocations = allocatePhase3Slots(deepPeople.map((person) => person.rank));

  return allocations.flatMap((allocation, index) => {
    if (allocation.rate <= 0) return [];

    const person = deepPeople[index];
    return [
      {
        personId: person.id,
        name: person.name,
        rank: allocation.rank,
        phase: 3 as const,
        levelFromCustomer: index + 4,
        slot: allocation.slots.join(' + '),
        rate: allocation.rate,
        baseIP: input.order.ip,
        amountIP: input.order.ip * allocation.rate,
        note: `Phase 3: ${allocation.slots.join(', ')} genommen`,
      },
    ];
  });
}

function phase1Slices(order: ExampleOrder): Phase1Slice[] {
  switch (order.kind) {
    case 'shopper':
      return [
        {
          label: 'Shopper',
          baseIP: order.ip,
          rates: [
            PHASE1.shop.level1,
            PHASE1.shop.level2,
            PHASE1.shop.level3,
          ],
        },
      ];
    case 'member_first_150':
      return [
        {
          label: 'Member erste 150 IP',
          baseIP: order.ip,
          rates: [
            PHASE1.referral.level1,
            PHASE1.referral.level2,
            PHASE1.referral.level3,
          ],
        },
      ];
    case 'member_above_150':
      return [
        {
          label: 'Member ab 151 IP',
          baseIP: order.ip,
          rates: [
            PHASE1.shopDiscount.level1,
            PHASE1.shopDiscount.level2,
            PHASE1.shopDiscount.level3,
          ],
        },
      ];
    case 'member_order': {
      const referralIP = Math.min(order.ip, REFERRAL_THRESHOLD_IP);
      const shopDiscountIP = Math.max(0, order.ip - REFERRAL_THRESHOLD_IP);

      return [
        {
          label: 'Member erste 150 IP',
          baseIP: referralIP,
          rates: [
            PHASE1.referral.level1,
            PHASE1.referral.level2,
            PHASE1.referral.level3,
          ],
        },
        {
          label: 'Member ab 151 IP',
          baseIP: shopDiscountIP,
          rates: [
            PHASE1.shopDiscount.level1,
            PHASE1.shopDiscount.level2,
            PHASE1.shopDiscount.level3,
          ],
        },
      ];
    }
  }
}

function findQualifiedPhase1Receiver(
  people: ExampleLinePerson[],
  startIndex: number,
): number {
  for (let index = startIndex; index < people.length; index++) {
    if (people[index].qualifiedForPhase1 !== false) {
      return index;
    }
  }

  return -1;
}

function sumPayouts(payouts: ExamplePayout[], phase: ExamplePayout['phase']): number {
  return payouts
    .filter((payout) => payout.phase === phase)
    .reduce((sum, payout) => sum + payout.amountIP, 0);
}

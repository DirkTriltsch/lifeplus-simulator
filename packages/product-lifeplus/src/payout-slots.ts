export type PayoutPhase = 2 | 3;

export interface SlotAllocation {
  rank: string;
  rate: number;
  slots: string[];
}

export const PHASE2_SLOTS = [
  { id: 'bronze', label: 'Bronze-Stueck', rate: 0.03 },
  { id: 'silver', label: 'Silber-Stueck', rate: 0.03 },
  { id: 'gold', label: 'Gold-Stueck', rate: 0.03 },
  { id: 'diamond', label: 'Diamant-Stueck', rate: 0.03 },
] as const;

export const PHASE3_SLOTS = [
  { id: 'one-star-diamond', label: '1*Diamant-Stueck', rate: 0.03 },
  { id: 'two-star-diamond', label: '2*Diamant-Stueck', rate: 0.03 },
  { id: 'three-star-diamond', label: '3*Diamant-Stueck', rate: 0.02 },
] as const;

export function allocatePhase2Slots(
  ranksInPayoutOrder: string[],
): SlotAllocation[] {
  const taken = PHASE2_SLOTS.map(() => false);

  return ranksInPayoutOrder.map((rank) => {
    const maxSlot = phase2SlotCount(rank);
    const slots: string[] = [];
    let rate = 0;

    for (let slot = 0; slot < maxSlot; slot++) {
      if (taken[slot]) continue;
      taken[slot] = true;
      slots.push(PHASE2_SLOTS[slot].label);
      rate += PHASE2_SLOTS[slot].rate;
    }

    return {
      rank: normalizeRankName(rank),
      rate,
      slots,
    };
  });
}

export function allocatePhase3Slots(
  ranksInPayoutOrder: string[],
): SlotAllocation[] {
  const taken = PHASE3_SLOTS.map(() => false);

  return ranksInPayoutOrder.map((rank) => {
    const maxSlot = phase3SlotCount(rank);
    if (maxSlot <= 0) {
      return { rank: normalizeRankName(rank), rate: 0, slots: [] };
    }

    for (let slot = 0; slot < maxSlot; slot++) {
      if (taken[slot]) continue;
      taken[slot] = true;
      return {
        rank: normalizeRankName(rank),
        rate: PHASE3_SLOTS[slot].rate,
        slots: [PHASE3_SLOTS[slot].label],
      };
    }

    return { rank: normalizeRankName(rank), rate: 0, slots: [] };
  });
}

export function allocatePhase2SlotRates(ranksInPayoutOrder: string[]): number[] {
  return allocatePhase2Slots(ranksInPayoutOrder).map((allocation) => allocation.rate);
}

export function allocatePhase3SlotRates(ranksInPayoutOrder: string[]): number[] {
  return allocatePhase3Slots(ranksInPayoutOrder).map((allocation) => allocation.rate);
}

export function phase2SlotCount(rank: string): number {
  switch (normalizeRankName(rank)) {
    case 'Bronze':
      return 1;
    case 'Silver':
      return 2;
    case 'Gold':
      return 3;
    case 'Diamond':
    case '1*Diamond':
    case '2*Diamond':
    case '3*Diamond':
      return 4;
    default:
      return isExtendedDiamondRank(rank) ? 4 : 0;
  }
}

export function phase3SlotCount(rank: string): number {
  switch (normalizeRankName(rank)) {
    case '1*Diamond':
      return 1;
    case '2*Diamond':
      return 2;
    case '3*Diamond':
      return 3;
    default:
      return isExtendedDiamondRank(rank) ? 3 : 0;
  }
}

export function normalizeRankName(rank: string): string {
  const compact = rank
    .trim()
    .replace(/\s+/g, '')
    .replace(/Diamant/gi, 'Diamond')
    .replace(/\bDia\b/gi, 'Diamond')
    .replace(/Silber/gi, 'Silver');

  const extendedDiamond = compact.match(/^(\d+)\*Diamond$/i);
  if (extendedDiamond) return `${Number(extendedDiamond[1])}*Diamond`;

  if (/^3\*Diamond$/i.test(compact)) return '3*Diamond';
  if (/^2\*Diamond$/i.test(compact)) return '2*Diamond';
  if (/^1\*Diamond$/i.test(compact)) return '1*Diamond';
  if (/^Diamond$/i.test(compact)) return 'Diamond';
  if (/^Gold$/i.test(compact)) return 'Gold';
  if (/^Silver$/i.test(compact)) return 'Silver';
  if (/^Bronze$/i.test(compact)) return 'Bronze';

  return rank;
}

function isExtendedDiamondRank(rank: string): boolean {
  const normalized = normalizeRankName(rank);
  const match = normalized.match(/^(\d+)\*Diamond$/);
  return match ? Number(match[1]) >= 4 : false;
}

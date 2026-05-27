export interface RankStats {
  gv: number;
  av: number;
  ql: number;
  sh: number;
}

export const PHASE1_RANKS = ['Member', 'Believer', 'Builder'] as const;
export const PHASE2_RANKS = ['Bronze', 'Silver', 'Gold', 'Diamond'] as const;
export const PHASE3_RANKS = [
  '1*Diamond',
  '2*Diamond',
  '3*Diamond',
  '4*Diamond',
  '5*Diamond',
  '6*Diamond',
  '7*Diamond',
] as const;

export const ALL_LINEAGE_RANKS = [
  ...PHASE1_RANKS,
  ...PHASE2_RANKS,
  ...PHASE3_RANKS,
] as const;

const RANK_STATS: Record<string, RankStats> = {
  Member: { gv: 0, av: 45, ql: 0, sh: 0 },
  Believer: { gv: 500, av: 45, ql: 3, sh: 0 },
  Builder: { gv: 1500, av: 45, ql: 3, sh: 0 },
  Bronze: { gv: 3000, av: 100, ql: 3, sh: 0 },
  Silver: { gv: 6000, av: 100, ql: 6, sh: 0 },
  Gold: { gv: 9000, av: 150, ql: 9, sh: 0 },
  Diamond: { gv: 15000, av: 150, ql: 12, sh: 0 },
  '1*Diamond': { gv: 15000, av: 150, ql: 12, sh: 1 },
  '2*Diamond': { gv: 20000, av: 150, ql: 12, sh: 2 },
  '3*Diamond': { gv: 25000, av: 150, ql: 12, sh: 3 },
  '4*Diamond': { gv: 30000, av: 150, ql: 12, sh: 4 },
  '5*Diamond': { gv: 35000, av: 150, ql: 12, sh: 5 },
  '6*Diamond': { gv: 40000, av: 150, ql: 12, sh: 6 },
  '7*Diamond': { gv: 45000, av: 150, ql: 12, sh: 7 },
};

export function rankStats(rank: string): RankStats {
  return RANK_STATS[rank] ?? RANK_STATS.Member;
}

export function rankLabel(rank: string): string {
  return rank.replace('Silver', 'Silber').replace('Diamond', ' Diamant');
}

export function normalizeUiRank(rank: string): string {
  if (rank === 'Silber') return 'Silver';
  if (rank.includes('Diamant')) return rank.replace(' Diamant', 'Diamond');
  return rank;
}


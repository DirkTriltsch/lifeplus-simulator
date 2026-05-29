import { RankIcon } from './lineage/RankIcon';
import { rankIconName, rankLabel } from './lineage/rankStats';

interface RankBadgeProps {
  rank: string;
  variant?: 'neutral' | 'brand';
  size?: 'sm' | 'md';
  labelMode?: 'full' | 'compact';
}

const VARIANT_CLASS = {
  neutral: 'bg-gray-100 text-gray-700',
  brand: 'bg-brand-50 text-brand-700',
} as const;

const SIZE_CLASS = {
  sm: 'gap-1.5 px-2 py-1 text-xs',
  md: 'gap-1.5 px-2.5 py-1 text-xs',
} as const;

export function RankBadge({
  rank,
  variant = 'neutral',
  size = 'md',
  labelMode = 'full',
}: RankBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]}`}
    >
      <RankIcon name={rankIconName(rank)} size={14} />
      {labelMode === 'compact' ? compactRankLabel(rank) : rankLabel(rank)}
    </span>
  );
}

function compactRankLabel(rank: string): string {
  const stars = rank.match(/^(\d+)\*Diamond$/);
  if (stars) return `${stars[1]}*Diam.`;
  return rankLabel(rank);
}

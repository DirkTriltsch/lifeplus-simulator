import type { ExampleLinePerson, ExamplePayout } from '@mlm/product-lifeplus';
import { RankBadge } from '../RankBadge';
import { rankStats } from './rankStats';

interface LineagePersonCardProps {
  person: ExampleLinePerson;
  payouts: ExamplePayout[];
  isCustomer: boolean;
  isBelowCustomer: boolean;
  orderSummary?: string;
  showKpis: boolean;
  onSelect: () => void;
}

interface SlotInfo {
  code: string;
  rate: number;
}

const SLOT_INFO: Record<string, SlotInfo> = {
  'Bronze-Stueck':    { code: 'B',      rate: 0.03 },
  'Silber-Stueck':    { code: 'S',      rate: 0.03 },
  'Gold-Stueck':      { code: 'G',      rate: 0.03 },
  'Diamant-Stueck':   { code: 'D',      rate: 0.03 },
  '1*Diamant-Stueck': { code: '1*-Dia', rate: 0.03 },
  '2*Diamant-Stueck': { code: '2*-Dia', rate: 0.03 },
  '3*Diamant-Stueck': { code: '3*-Dia', rate: 0.02 },
};

export function LineagePersonCard({
  person,
  payouts,
  isCustomer,
  isBelowCustomer,
  orderSummary,
  showKpis,
  onSelect,
}: LineagePersonCardProps) {
  const stats = rankStats(person.rank);
  const totalRate = payouts.reduce((sum, payout) => sum + payout.rate, 0);

  const cardClass = isCustomer
    ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-400 ring-offset-1'
    : isBelowCustomer
      ? 'border-gray-200 bg-white opacity-50'
      : 'border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50/40';

  const slotLines = collectSlotLines(payouts);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border p-3 text-left shadow-sm transition ${cardClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-950">
            {person.name}
          </p>
          <span className="mt-1 inline-flex">
            <RankBadge rank={person.rank} />
          </span>
        </div>
        {isCustomer ? (
          <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            Bestellung
          </span>
        ) : !isBelowCustomer ? (
          <div className="text-right">
            <p className="text-lg font-semibold text-brand-700">
              {formatRate(totalRate)}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-gray-400">
              Anteil
            </p>
            {slotLines.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {slotLines.map((line, index) => (
                  <p
                    key={index}
                    className="text-[11px] font-medium text-gray-600"
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
      {isCustomer && (
        <p className="mt-2 text-xs font-medium text-brand-700">
          {orderSummary ?? 'Order hier platziert'}
        </p>
      )}
      {isBelowCustomer && (
        <p className="mt-2 text-xs text-gray-400">Unterhalb der Bestellung</p>
      )}
      {showKpis && !isCustomer && !isBelowCustomer && (
        <p className="mt-2 text-[11px] text-gray-400">
          GV: {formatNumber(stats.gv)} · AV: {stats.av} · QL: {stats.ql} · SH:{' '}
          {stats.sh}
        </p>
      )}
    </button>
  );
}

function collectSlotLines(payouts: ExamplePayout[]): string[] {
  const lines: string[] = [];
  for (const payout of payouts) {
    if (payout.phase < 2 || !payout.slot) continue;
    const parts = payout.slot
      .split(' + ')
      .map((label) => SLOT_INFO[label.trim()])
      .filter((info): info is SlotInfo => info != null);
    if (parts.length === 0) continue;
    lines.push(
      parts.map((info) => `${formatRate(info.rate)} ${info.code}`).join(', '),
    );
  }
  return lines;
}

function formatRate(rate: number): string {
  if (rate <= 0) return '0%';
  return `${(rate * 100).toLocaleString('de-DE', {
    maximumFractionDigits: 1,
  })}%`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('de-DE');
}

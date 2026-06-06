import type {
  PersonTreeSnapshot,
  TreeCompensationResult,
  YearSummary,
} from '@mlm/simulator-core';
import type { ReactNode } from 'react';
import { RankBadge } from './RankBadge';

interface YearlySummaryTableProps {
  years: YearSummary[];
  personYearEnds?: PersonTreeSnapshot[];
  treeCompensationYearEnds?: TreeCompensationResult[];
}

const numberFormat = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 0,
});

const euroFormat = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function YearlySummaryTable({
  years,
  personYearEnds,
  treeCompensationYearEnds,
}: YearlySummaryTableProps) {
  return (
    <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
        <thead className="bg-gray-50">
          <tr>
            <HeaderCell>Jahr</HeaderCell>
            <HeaderCell>Members</HeaderCell>
            <HeaderCell>Shopper</HeaderCell>
            <HeaderCell>Netzwerk</HeaderCell>
            <HeaderCell align="right">GL / QGV</HeaderCell>
            <HeaderCell align="right">DL (B/S/G/Dia)</HeaderCell>
            <HeaderCell>Status</HeaderCell>
            <HeaderCell align="right">Provision/Monat</HeaderCell>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {years.map((year, index) => {
            const downlineStatus = countDownlineStatuses(
              personYearEnds?.[index],
              treeCompensationYearEnds?.[index],
            );
            return (
              <tr key={year.year} className="hover:bg-gray-50/70">
                <BodyCell>Jahr {year.year}</BodyCell>
                <BodyCell>
                  <GrowthValue
                    total={year.members}
                    growth={year.memberGrowth}
                    attrition={year.memberAttrition}
                  />
                </BodyCell>
                <BodyCell>
                  <GrowthValue
                    total={year.shoppers}
                    growth={year.shopperGrowth}
                    attrition={year.shopperAttrition}
                  />
                </BodyCell>
                <BodyCell>{numberFormat.format(Math.round(year.networkSize))}</BodyCell>
                <BodyCell align="right">
                  <CompactMetric
                    primary={numberFormat.format(Math.round(year.directLegs))}
                    secondary={numberFormat.format(Math.round(year.qgv))}
                  />
                </BodyCell>
                <BodyCell align="right" className="font-medium text-gray-900">
                  {formatStatusCounts(downlineStatus)}
                </BodyCell>
                <BodyCell>
                  <RankBadge
                    rank={year.rankName}
                    variant="brand"
                    size="sm"
                    labelMode="compact"
                  />
                </BodyCell>
                <BodyCell align="right" className="font-medium text-gray-900">
                  {euroFormat.format(Math.round(year.totalEUR))}
                </BodyCell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GrowthValue({
  total,
  growth,
  attrition,
}: {
  total: number;
  growth: number;
  attrition: number;
}) {
  return (
    <div>
      <div className="font-medium text-gray-900">
        {numberFormat.format(Math.round(total))}
      </div>
      <div className="mt-0.5 whitespace-nowrap text-xs">
        <span className="font-medium text-emerald-600">
          +{numberFormat.format(Math.round(growth))}
        </span>
        <span className="mx-1 text-gray-300">/</span>
        <span className="font-medium text-red-500">
          -{numberFormat.format(Math.round(attrition))}
        </span>
      </div>
    </div>
  );
}

function CompactMetric({
  primary,
  secondary,
}: {
  primary: string;
  secondary: string;
}) {
  return (
    <div>
      <div className="font-medium text-gray-900">{primary}</div>
      <div className="mt-0.5 text-xs text-gray-500">{secondary}</div>
    </div>
  );
}

interface DownlineStatusCounts {
  bronze: number;
  silver: number;
  gold: number;
  diamond: number;
}

function countDownlineStatuses(
  snapshot: PersonTreeSnapshot | undefined,
  compensation: TreeCompensationResult | undefined,
): DownlineStatusCounts {
  const counts = { bronze: 0, silver: 0, gold: 0, diamond: 0 };
  if (!snapshot || !compensation) return counts;

  const personsById = new Map(snapshot.persons.map((person) => [person.id, person]));
  for (const state of compensation.rankStates) {
    if (state.personId === snapshot.rootId) continue;
    const person = personsById.get(state.personId);
    if (!person || !person.active || person.kind !== 'member') continue;
    const weight = person.weight;

    if (state.rank.name === 'Bronze') counts.bronze += weight;
    else if (state.rank.name === 'Silver') counts.silver += weight;
    else if (state.rank.name === 'Gold') counts.gold += weight;
    else if (state.rank.name.includes('Diamond')) counts.diamond += weight;
  }

  return counts;
}

function formatStatusCounts(counts: DownlineStatusCounts): string {
  return [
    counts.bronze,
    counts.silver,
    counts.gold,
    counts.diamond,
  ]
    .map((count) => numberFormat.format(Math.round(count)))
    .join('/');
}

function HeaderCell({
  children,
  align = 'left',
}: {
  children: ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`px-3 py-2 ${
        align === 'right' ? 'text-right' : 'text-left'
      } text-xs font-medium uppercase tracking-wider text-gray-500`}
    >
      {children}
    </th>
  );
}

function BodyCell({
  children,
  align = 'left',
  className = '',
}: {
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <td
      className={`px-3 py-3 ${
        align === 'right' ? 'text-right' : 'text-left'
      } text-gray-700 ${className}`}
    >
      {children}
    </td>
  );
}

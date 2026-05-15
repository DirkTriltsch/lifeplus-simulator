import type { YearSummary } from '../engine/simulation';
import type { ReactNode } from 'react';

interface YearlySummaryTableProps {
  years: YearSummary[];
}

const numberFormat = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 0,
});

const euroFormat = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function YearlySummaryTable({ years }: YearlySummaryTableProps) {
  return (
    <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
        <thead className="bg-gray-50">
          <tr>
            <HeaderCell>Jahr</HeaderCell>
            <HeaderCell>Beine (GL)</HeaderCell>
            <HeaderCell>Members</HeaderCell>
            <HeaderCell>Shopper</HeaderCell>
            <HeaderCell>Netzwerk</HeaderCell>
            <HeaderCell align="right">AV</HeaderCell>
            <HeaderCell align="right">QGV</HeaderCell>
            <HeaderCell>Status</HeaderCell>
            <HeaderCell align="right">Provision/Monat</HeaderCell>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {years.map((year) => (
            <tr key={year.year} className="hover:bg-gray-50/70">
              <BodyCell>Jahr {year.year}</BodyCell>
              <BodyCell>{numberFormat.format(Math.round(year.directLegs))}</BodyCell>
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
              <BodyCell align="right">{numberFormat.format(Math.round(year.av))}</BodyCell>
              <BodyCell align="right">{numberFormat.format(Math.round(year.qgv))}</BodyCell>
              <BodyCell>
                <span className="inline-flex rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-600">
                  {year.rankName}
                </span>
              </BodyCell>
              <BodyCell align="right" className="font-medium text-gray-900">
                {euroFormat.format(Math.round(year.totalEUR))}
              </BodyCell>
            </tr>
          ))}
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

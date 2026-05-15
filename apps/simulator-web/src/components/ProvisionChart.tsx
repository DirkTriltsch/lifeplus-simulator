import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import type { MonthResult } from '@mlm/simulator-core';

interface ProvisionChartProps {
  yearEnds: MonthResult[];
}

function formatEUR(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}k`;
  return `€${Math.round(n)}`;
}

export function ProvisionChart({ yearEnds }: ProvisionChartProps) {
  const data = yearEnds.map((m) => ({
    year: `J${m.year}`,
    eur: Math.round(m.totalEUR),
    rank: m.rankName,
  }));

  return (
    <div className="w-full" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D9E75" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#1D9E75" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="year"
            stroke="#9ca3af"
            tick={{ fontSize: 11 }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatEUR}
            width={50}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white border border-gray-200 rounded-md px-3 py-2 text-xs shadow-sm">
                  <div className="font-medium text-gray-900">{d.year}</div>
                  <div className="text-brand-400 font-medium">
                    {formatEUR(d.eur)} / Monat
                  </div>
                  <div className="text-gray-500">{d.rank}</div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="eur"
            stroke="#1D9E75"
            strokeWidth={2}
            fill="url(#grad)"
          />
          <Line
            type="monotone"
            dataKey="eur"
            stroke="#1D9E75"
            strokeWidth={2}
            dot={{ fill: '#1D9E75', r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

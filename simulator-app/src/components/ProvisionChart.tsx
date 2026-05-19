import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
  ReferenceDot,
} from 'recharts';
import type { MonthResult } from '@mlm/simulator-core';
import type { GoalProgress } from '@mlm/simulator-goals';
import { GoalIconPaths } from './GoalIcon';
import type { GoalUI } from './GoalsEditorDialog';

interface ProvisionChartProps {
  yearEnds: MonthResult[];
  goalProgress?: GoalProgress[];
  goals?: GoalUI[];
}

function formatEUR(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}k`;
  return `€${Math.round(n)}`;
}

export function ProvisionChart({
  yearEnds,
  goalProgress,
  goals,
}: ProvisionChartProps) {
  const data = yearEnds.map((m) => ({
    year: `J${m.year}`,
    eur: Math.round(m.totalEUR),
    rank: m.rankName,
  }));

  const iconByGoalId = new Map((goals ?? []).map((g) => [g.id, g.icon]));
  const eurByYear = new Map(yearEnds.map((m) => [m.year, m.totalEUR]));

  const markers = stackMarkers(
    (goalProgress ?? [])
    .filter(
      (p) =>
        p.achieved &&
        p.achievedInYear !== undefined &&
        eurByYear.has(p.achievedInYear),
    )
    .map((p) => ({
      id: p.goal.id,
      year: `J${p.achievedInYear}`,
      eur: eurByYear.get(p.achievedInYear!) ?? 0,
      icon: iconByGoalId.get(p.goal.id),
      label: p.goal.label,
    })),
  );

  return (
    <div className="w-full" style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 24, right: 8, left: 0, bottom: 0 }}
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
          {markers.map((m) => (
            <ReferenceDot
              key={m.id}
              x={m.year}
              y={m.eur}
              r={0}
              isFront
              ifOverflow="extendDomain"
              shape={(props: { cx?: number; cy?: number }) => (
                <GoalMarker
                  cx={props.cx ?? 0}
                  cy={props.cy ?? 0}
                  icon={m.icon}
                  label={m.label}
                  stackIndex={m.stackIndex}
                  stackSize={m.stackSize}
                />
              )}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function GoalMarker({
  cx,
  cy,
  icon,
  label,
  stackIndex,
  stackSize,
}: {
  cx: number;
  cy: number;
  icon?: GoalUI['icon'];
  label: string;
  stackIndex: number;
  stackSize: number;
}) {
  const spread = 18;
  const offsetX = (stackIndex - (stackSize - 1) / 2) * spread;
  const markerX = cx + offsetX;
  const offsetY = 18 + Math.abs(offsetX) * 0.25;
  return (
    <g>
      <line
        x1={cx}
        y1={cy}
        x2={markerX}
        y2={cy - offsetY + 8}
        stroke="#1D9E75"
        strokeWidth={1}
        strokeDasharray="2 2"
      />
      <circle
        cx={markerX}
        cy={cy - offsetY}
        r={11}
        fill="white"
        stroke="#1D9E75"
        strokeWidth={1.5}
      />
      {icon && (
        <svg
          x={markerX - 7}
          y={cy - offsetY - 7}
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1D9E75"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-label={label}
        >
          <GoalIconPaths name={icon} />
        </svg>
      )}
    </g>
  );
}

interface GoalChartMarker {
  id: string;
  year: string;
  eur: number;
  icon?: GoalUI['icon'];
  label: string;
}

function stackMarkers(markers: GoalChartMarker[]) {
  const groupCounts = new Map<string, number>();

  return markers.map((marker) => {
    const key = `${marker.year}:${marker.eur}`;
    const stackIndex = groupCounts.get(key) ?? 0;
    groupCounts.set(key, stackIndex + 1);

    return {
      ...marker,
      stackIndex,
      stackSize: markers.filter((m) => `${m.year}:${m.eur}` === key).length,
    };
  });
}

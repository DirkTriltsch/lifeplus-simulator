import { useMemo, useState } from 'react';
import type { MonthResult } from '@mlm/simulator-core';

export type NetworkView = 'sunburst' | 'legs' | 'hybrid';

interface NetworkVisualizationsProps {
  yearEnds: MonthResult[];
  selectedView: NetworkView;
  memberMonthlyVolume: number;
  shopperMonthlyVolume: number;
}

interface LegData {
  id: number;
  label: string;
  rank: string;
  nodes: number;
  qgv: number;
  eur: number;
  activity: number;
  color: string;
  levels: number[];
}

const VIEW_TITLES: Record<NetworkView, string> = {
  sunburst: 'Sunburst',
  legs: 'Bein-Spalten',
  hybrid: 'Hybrid-Tree',
};

const RANK_COLORS: Record<string, string> = {
  Diamond: '#2563eb',
  Gold: '#ca8a04',
  Silver: '#64748b',
  Bronze: '#b45309',
  Builder: '#0d9488',
  Believer: '#16a34a',
  Member: '#4b5563',
  Shopper: '#9ca3af',
};

export function NetworkVisualizations({
  yearEnds,
  selectedView,
  memberMonthlyVolume,
  shopperMonthlyVolume,
}: NetworkVisualizationsProps) {
  const [year, setYear] = useState(10);
  const [selectedLegId, setSelectedLegId] = useState(1);
  const snapshot = yearEnds[Math.min(year - 1, yearEnds.length - 1)] ?? yearEnds[0];

  const legs = useMemo(
    () => buildLegs(snapshot, memberMonthlyVolume, shopperMonthlyVolume),
    [snapshot, memberMonthlyVolume, shopperMonthlyVolume],
  );
  const selectedLeg = legs.find((leg) => leg.id === selectedLegId) ?? legs[0];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Netzwerkansicht
            </p>
            <h2 className="text-xl font-semibold text-gray-900">
              {VIEW_TITLES[selectedView]} · Jahr {year}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
            <Metric label="Provision/Mon" value={formatCurrency(snapshot.totalEUR)} />
            <Metric label="Netzwerk" value={formatNumber(snapshot.networkSize)} />
            <Metric label="Rang" value={snapshot.rankName} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500">1</span>
          <input
            aria-label="Jahr"
            type="range"
            min={1}
            max={10}
            value={year}
            onChange={(event) => {
              setYear(Number(event.target.value));
              setSelectedLegId(1);
            }}
          />
          <span className="text-xs font-medium text-gray-500">10</span>
        </div>
      </div>

      {selectedView === 'sunburst' && <Sunburst snapshot={snapshot} legs={legs} />}
      {selectedView === 'legs' && (
        <LegColumns
          legs={legs}
          selectedLeg={selectedLeg}
          onSelectLeg={setSelectedLegId}
        />
      )}
      {selectedView === 'hybrid' && (
        <HybridTree
          snapshot={snapshot}
          legs={legs}
          selectedLeg={selectedLeg}
          onSelectLeg={setSelectedLegId}
        />
      )}

      <ImprovementPanel />
    </div>
  );
}

function Sunburst({ snapshot, legs }: { snapshot: MonthResult; legs: LegData[] }) {
  const levels = buildLevelTotals(snapshot);
  const maxLevel = Math.min(10, Math.max(1, levels.length));
  const center = 190;
  const ringWidth = 18;
  const gap = 4;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
        <svg viewBox="0 0 380 380" role="img" aria-label="Sunburst Netzwerk">
          <circle cx={center} cy={center} r="42" fill="#0f766e" />
          <text x={center} y={center - 4} textAnchor="middle" className="fill-white text-sm font-semibold">
            Du
          </text>
          <text x={center} y={center + 15} textAnchor="middle" className="fill-white text-[11px]">
            {snapshot.rankName}
          </text>
          {levels.slice(0, maxLevel).map((levelTotal, levelIndex) => {
            const radius = 58 + levelIndex * (ringWidth + gap);
            let cursor = -90;
            return legs.map((leg, legIndex) => {
              const levelShare = (leg.levels[levelIndex] ?? 0) / Math.max(1, levelTotal);
              const angle = Math.max(3, 360 * levelShare);
              const start = cursor;
              const end = cursor + angle - 1.5;
              cursor += angle;

              return (
                <path
                  key={`${levelIndex}-${leg.id}`}
                  d={describeArc(center, center, radius, start, end)}
                  fill="none"
                  stroke={shadeColor(leg.color, levelIndex * 7 + legIndex * 2)}
                  strokeWidth={ringWidth}
                  strokeLinecap="butt"
                />
              );
            });
          })}
          <circle cx={center} cy={center} r="174" fill="none" stroke="#e5e7eb" strokeWidth="1" />
        </svg>

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Tiefe und Beitrag in einem Bild
            </h3>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">
              Ringe stehen fuer Ebenen, Segmente fuer Beine. Groessere Segmente
              zeigen, wo Netzwerkvolumen und Provision entstehen.
            </p>
          </div>
          <div className="space-y-2">
            {legs.map((leg) => (
              <div key={leg.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-gray-700">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: leg.color }}
                  />
                  {leg.label}
                </span>
                <span className="font-medium text-gray-900">{formatCurrency(leg.eur)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LegColumns({
  legs,
  selectedLeg,
  onSelectLeg,
}: {
  legs: LegData[];
  selectedLeg: LegData;
  onSelectLeg: (id: number) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-5">
        {legs.map((leg) => (
          <button
            key={leg.id}
            onClick={() => onSelectLeg(leg.id)}
            className={`text-left rounded-lg border p-3 transition ${
              selectedLeg.id === leg.id
                ? 'border-brand-400 bg-brand-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">{leg.label}</p>
                <p className="text-xs text-gray-500">{leg.rank}</p>
              </div>
              <span
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                style={{ background: leg.color }}
              >
                {leg.id}
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${leg.activity}%`, background: leg.color }}
              />
            </div>
            <div className="mt-3 flex items-end gap-1 h-28">
              {leg.levels.slice(0, 10).map((value, index) => (
                <div key={index} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <span
                    className="w-full rounded-t"
                    style={{
                      height: `${Math.max(8, Math.min(96, value / Math.max(1, leg.nodes) * 160))}px`,
                      background: shadeColor(leg.color, index * 8),
                    }}
                  />
                  <span className="text-[10px] text-gray-400">E{index + 1}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-600">
              {formatNumber(leg.nodes)} Knoten · {formatCurrency(leg.eur)}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs uppercase tracking-wider text-gray-500">
          Detail · {selectedLeg.label}
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-4">
          <Metric label="Status" value={selectedLeg.rank} />
          <Metric label="QGV" value={`${formatNumber(selectedLeg.qgv)} IP`} />
          <Metric label="Knoten" value={formatNumber(selectedLeg.nodes)} />
          <Metric label="Provision*" value={formatCurrency(selectedLeg.eur)} />
        </div>
      </div>
    </div>
  );
}

function HybridTree({
  snapshot,
  legs,
  selectedLeg,
  onSelectLeg,
}: {
  snapshot: MonthResult;
  legs: LegData[];
  selectedLeg: LegData;
  onSelectLeg: (id: number) => void;
}) {
  const slotWidth = 157.5;
  const padX = 115;
  const firstLegX = padX;
  const lastLegX = padX + Math.max(0, legs.length - 1) * slotWidth;
  const centerX = (firstLegX + lastLegX) / 2;
  const treeWidth = Math.max(860, lastLegX + padX);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
      <div className="overflow-x-auto pb-2">
        <svg
          viewBox={`0 0 ${treeWidth} 360`}
          style={{ width: `${treeWidth}px`, minWidth: `${treeWidth}px` }}
          role="img"
          aria-label="Hybrid Tree Netzwerk"
        >
          <line x1={centerX} y1="78" x2={centerX} y2="118" stroke="#d1d5db" strokeWidth="2" />
          <TreeNode x={centerX} y={52} title="Du" subtitle={`${snapshot.rankName} · ${formatCurrency(snapshot.totalEUR)}`} color="#0f766e" />
          {legs.length > 1 && (
            <line x1={firstLegX} y1="118" x2={lastLegX} y2="118" stroke="#d1d5db" strokeWidth="2" />
          )}
          {legs.map((leg, index) => {
            const x = padX + index * slotWidth;
            const selected = leg.id === selectedLeg.id;
            return (
              <g key={leg.id} onClick={() => onSelectLeg(leg.id)} className="cursor-pointer">
                <line x1={x} y1="118" x2={x} y2="145" stroke="#d1d5db" strokeWidth="2" />
                <TreeNode
                  x={x}
                  y={172}
                  title={leg.label}
                  subtitle={`${leg.rank} · ${formatCurrency(leg.eur)}`}
                  color={leg.color}
                  selected={selected}
                />
                <line x1={x} y1="201" x2={x} y2="235" stroke="#d1d5db" strokeWidth="2" />
                <circle cx={x - 36} cy="246" r="18" fill="#f8fafc" stroke={leg.color} strokeWidth="2" />
                <text x={x - 36} y="251" textAnchor="middle" className="fill-gray-700 text-xs font-semibold">E1</text>
                <circle cx={x + 36} cy="246" r="18" fill="#f8fafc" stroke={leg.color} strokeWidth="2" />
                <text x={x + 36} y="251" textAnchor="middle" className="fill-gray-700 text-xs font-semibold">E2</text>
                <rect x={x - 54} y="286" width="108" height="36" rx="18" fill={selected ? '#ecfdf5' : '#f3f4f6'} stroke={selected ? '#1d9e75' : '#e5e7eb'} />
                <text x={x} y="309" textAnchor="middle" className="fill-gray-700 text-xs font-medium">
                  tief: {formatNumber(sum(leg.levels.slice(2)))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Lupe · {selectedLeg.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(selectedLeg.eur)}
          </p>
          <p className="text-sm text-gray-600">
            {selectedLeg.rank} · {formatNumber(selectedLeg.qgv)} IP QGV
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Ebene</th>
                <th className="px-3 py-2 text-right">Knoten</th>
                <th className="px-3 py-2 text-right">Anteil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {selectedLeg.levels.slice(0, 10).map((value, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 font-medium text-gray-800">E{index + 1}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{formatNumber(value)}</td>
                  <td className="px-3 py-2 text-right text-gray-500">
                    {Math.round((value / Math.max(1, selectedLeg.nodes)) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ImprovementPanel() {
  const items = [
    'Knoten-Identitaeten pro Bein-Pfad speichern, damit Klicks echte Personen statt Schaetzungen zeigen.',
    'Ab ca. 1.000 Knoten automatisch clustern und nur sichtbare Ebenen rendern.',
    'Status-Ampel ergaenzen: aktiv, unter Qualifikation, inaktiv, nicht provisioniert.',
    'Tooltips mit Phase-1/2/3-Anteil pro Bein einbauen.',
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">Verbesserungsvorschlaege</h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-gray-900 truncate">{value}</p>
    </div>
  );
}

function TreeNode({
  x,
  y,
  title,
  subtitle,
  color,
  selected,
}: {
  x: number;
  y: number;
  title: string;
  subtitle: string;
  color: string;
  selected?: boolean;
}) {
  return (
    <g>
      <rect
        x={x - 72}
        y={y - 26}
        width="144"
        height="52"
        rx="8"
        fill={selected ? '#ecfdf5' : '#ffffff'}
        stroke={selected ? '#1d9e75' : '#d1d5db'}
        strokeWidth={selected ? 2 : 1}
      />
      <circle cx={x - 50} cy={y} r="12" fill={color} />
      <text x={x - 30} y={y - 4} className="fill-gray-900 text-xs font-semibold">
        {title}
      </text>
      <text x={x - 30} y={y + 13} className="fill-gray-500 text-[10px]">
        {subtitle}
      </text>
    </g>
  );
}

function buildLegs(
  snapshot: MonthResult,
  memberMonthlyVolume: number,
  shopperMonthlyVolume: number,
): LegData[] {
  if (snapshot.legs.length > 0) {
    const legTotals = snapshot.legs.map((leg) => {
      const levels = buildLegLevelTotals(leg);
      return {
        levels,
        nodes: sum(levels),
        qgv: calculateLegQgv(leg, memberMonthlyVolume, shopperMonthlyVolume),
      };
    });
    const totalLegQgv = Math.max(1, sum(legTotals.map((leg) => leg.qgv)));
    const averageShare = 1 / Math.max(1, snapshot.legs.length);

    return snapshot.legs.map((_, index) => {
      const { levels, nodes, qgv } = legTotals[index];
      const share = qgv / totalLegQgv;
      const rank = estimateRank(qgv, Math.max(0, snapshot.legs.length - index));
      const color = RANK_COLORS[rank] ?? RANK_COLORS.Member;

      return {
        id: index + 1,
        label: `Bein ${index + 1}`,
        rank,
        nodes,
        qgv,
        eur: snapshot.totalEUR * share,
        activity: Math.max(8, Math.min(100, (share / averageShare) * 82)),
        color,
        levels,
      };
    });
  }

  return buildSymmetricLegData(snapshot);
}

function buildLevelTotals(snapshot: MonthResult): number[] {
  const max = Math.max(snapshot.membersByLevel.length, snapshot.shoppersByLevel.length, 1);
  return Array.from({ length: Math.min(10, max) }, (_, index) => {
    return (snapshot.membersByLevel[index] ?? 0) + (snapshot.shoppersByLevel[index] ?? 0);
  });
}

function buildLegLevelTotals(leg: MonthResult['legs'][number]): number[] {
  const max = Math.max(leg.membersByLevel.length, leg.shoppersByLevel.length, 1);
  return Array.from({ length: max }, (_, index) => {
    return (leg.membersByLevel[index] ?? 0) + (leg.shoppersByLevel[index] ?? 0);
  });
}

function calculateLegQgv(
  leg: MonthResult['legs'][number],
  memberMonthlyVolume: number,
  shopperMonthlyVolume: number,
): number {
  return (
    sum(leg.membersByLevel) * memberMonthlyVolume +
    sum(leg.shoppersByLevel) * shopperMonthlyVolume
  );
}

function buildSymmetricLegData(snapshot: MonthResult): LegData[] {
  const legCount = Math.max(1, Math.round(snapshot.directLegs || 1));
  const share = 1 / legCount;
  const levelTotals = buildLevelTotals(snapshot);
  const qgvPerLeg = snapshot.qgv * share;
  const rank = estimateRank(qgvPerLeg, legCount);
  const color = RANK_COLORS[rank] ?? RANK_COLORS.Member;

  return Array.from({ length: legCount }, (_, index) => ({
    id: index + 1,
    label: `Bein ${index + 1}`,
    rank,
    nodes: snapshot.networkSize * share,
    qgv: qgvPerLeg,
    eur: snapshot.totalEUR * share,
    activity: 100,
    color,
    levels: levelTotals.map((levelTotal) => levelTotal * share),
  }));
}

function estimateRank(qgv: number, qualifiedLegs: number): string {
  if (qgv >= 25000 && qualifiedLegs >= 4) return 'Diamond';
  if (qgv >= 12000 && qualifiedLegs >= 3) return 'Gold';
  if (qgv >= 6000 && qualifiedLegs >= 2) return 'Silver';
  if (qgv >= 2500 && qualifiedLegs >= 2) return 'Bronze';
  if (qgv >= 1000) return 'Builder';
  if (qgv >= 300) return 'Believer';
  return 'Member';
}

function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(' ');
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function shadeColor(hex: string, percent: number) {
  const value = hex.replace('#', '');
  const num = parseInt(value, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));

  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString('de-DE');
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

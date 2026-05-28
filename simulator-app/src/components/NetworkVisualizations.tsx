import { useMemo, useState } from 'react';
import type { MonthResult, PersonTreeSnapshot } from '@mlm/simulator-core';
import {
  buildSunburstTree,
  buildSunburstTreeFromPersons,
  buildLegsFromPersons,
  colorForLegIndex,
  estimateAggregateRank,
  findLeg,
  findLevel,
  findNodeById,
  getPath,
  type LegData,
  type LegLevelBreakdown,
  type SunburstNode,
} from './network/sunburst-node';

export type NetworkView = 'sunburst' | 'legs' | 'hybrid';

interface NetworkVisualizationsProps {
  yearEnds: MonthResult[];
  selectedView: NetworkView;
  memberMonthlyVolume: number;
  shopperMonthlyVolume: number;
  /** Optional: echte Person-Tree-Snapshots pro Jahresende fuer den Sunburst (Iteration 4). */
  personYearEnds?: PersonTreeSnapshot[];
}

type LevelBreakdown = LegLevelBreakdown;

const VIEW_TITLES: Record<NetworkView, string> = {
  sunburst: 'Sunburst',
  legs: 'Bein-Spalten',
  hybrid: 'Hybrid-Tree',
};

export function NetworkVisualizations({
  yearEnds,
  selectedView,
  memberMonthlyVolume,
  shopperMonthlyVolume,
  personYearEnds,
}: NetworkVisualizationsProps) {
  const [year, setYear] = useState(10);
  const [selectedLegId, setSelectedLegId] = useState<number | null>(1);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string>('root');
  const snapshot = yearEnds[Math.min(year - 1, yearEnds.length - 1)] ?? yearEnds[0];
  const personSnapshot =
    personYearEnds?.[Math.min(year - 1, personYearEnds.length - 1)];

  const legs = useMemo(
    () => {
      if (personSnapshot) {
        return buildLegsFromPersons({
          snapshot: personSnapshot,
          memberMonthlyVolume,
          shopperMonthlyVolume,
        });
      }
      return buildLegs(snapshot, memberMonthlyVolume, shopperMonthlyVolume);
    },
    [snapshot, personSnapshot, memberMonthlyVolume, shopperMonthlyVolume],
  );
  const tree = useMemo(
    () => {
      if (personSnapshot) {
        return buildSunburstTreeFromPersons({
          snapshot: personSnapshot,
          memberMonthlyVolume,
          shopperMonthlyVolume,
        });
      }
      return buildSunburstTree({
        snapshot,
        memberMonthlyVolume,
        shopperMonthlyVolume,
      });
    },
    [snapshot, personSnapshot, memberMonthlyVolume, shopperMonthlyVolume],
  );
  const selectedLeg = legs.find((leg) => leg.id === selectedLegId) ?? legs[0];

  const selectLeg = (legId: number | null) => {
    setSelectedLegId(legId);
    setSelectedLevel(null);
  };
  const selectSegment = (legId: number, level: number) => {
    setSelectedLegId(legId);
    setSelectedLevel(level);
  };
  const clearSelection = () => {
    setSelectedLegId(null);
    setSelectedLevel(null);
  };
  const setFocus = (nodeId: string) => {
    setFocusedNodeId(nodeId);
  };

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
              setFocusedNodeId('root');
            }}
          />
          <span className="text-xs font-medium text-gray-500">10</span>
        </div>
      </div>

      {selectedView === 'sunburst' && (
        <Sunburst
          tree={tree}
          legs={legs}
          selectedLegId={selectedLegId}
          selectedLevel={selectedLevel}
          focusedNodeId={focusedNodeId}
          onSelectSegment={selectSegment}
          onSelectLeg={selectLeg}
          onClear={clearSelection}
          onSetFocus={setFocus}
        />
      )}
      {selectedView === 'legs' && (
        <LegColumns
          legs={legs}
          selectedLeg={selectedLeg}
          onSelectLeg={selectLeg}
        />
      )}
      {selectedView === 'hybrid' && (
        <HybridTree
          snapshot={snapshot}
          legs={legs}
          selectedLeg={selectedLeg}
          onSelectLeg={selectLeg}
        />
      )}
    </div>
  );
}

interface SunburstProps {
  tree: SunburstNode;
  legs: LegData[];
  selectedLegId: number | null;
  selectedLevel: number | null;
  focusedNodeId: string;
  onSelectSegment: (legId: number, level: number) => void;
  onSelectLeg: (legId: number | null) => void;
  onClear: () => void;
  onSetFocus: (nodeId: string) => void;
}

function Sunburst({
  tree,
  legs,
  selectedLegId,
  selectedLevel,
  focusedNodeId,
  onSelectSegment,
  onSelectLeg,
  onClear,
  onSetFocus,
}: SunburstProps) {
  const focusedNode = findNodeById(tree, focusedNodeId) ?? tree;
  const focusPath = getPath(tree, focusedNode.id);
  const parentNode =
    focusedNode.parentId != null ? findNodeById(tree, focusedNode.parentId) : null;

  const handleCenterClick = () => {
    if (parentNode) {
      onSetFocus(parentNode.id);
    } else {
      onClear();
    }
  };

  const selectedLegNode = selectedLegId != null ? findLeg(tree, selectedLegId) : undefined;
  const selectedLevelNode =
    selectedLegId != null && selectedLevel != null
      ? findLevel(tree, selectedLegId, selectedLevel)
      : undefined;

  const selectedNodeForDetail = focusedNode.kind === 'root'
    ? selectedLevelNode ?? selectedLegNode ?? focusedNode
    : selectedLevelNode?.legId === focusedNode.legId && selectedLevelNode.depth > focusedNode.depth
      ? selectedLevelNode
      : focusedNode;
  const scopedLegs = buildScopedLegs(focusedNode, legs);
  const isFocusedRoot = focusedNode.kind === 'root';
  const legendSelectedLegId = isFocusedRoot ? selectedLegId : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
      <Breadcrumb path={focusPath} onSetFocus={onSetFocus} />

      <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:items-start">
        <PolarHeatmapSvg
          legs={scopedLegs}
          tree={tree}
          centerNode={focusedNode}
          selectedLegId={isFocusedRoot ? selectedLegId : null}
          selectedLevel={isFocusedRoot ? selectedLevel : null}
          onSelectSegment={(legId, level) => {
            if (isFocusedRoot) {
              onSelectSegment(legId, level);
              return;
            }
            if (focusedNode.legId != null) {
              onSelectSegment(focusedNode.legId, toSourceLevel(focusedNode, level));
            }
          }}
          onCenterClick={handleCenterClick}
          onSegmentDoubleClick={(leg, level) => {
            if (isFocusedRoot) {
              const nodeId = leg.nodeId ?? findLeg(tree, leg.id)?.id;
              if (nodeId) onSetFocus(nodeId);
              return;
            }
            if (leg.nodeId) {
              onSetFocus(leg.nodeId);
            } else if (focusedNode.legId != null) {
              onSetFocus(`leg-${focusedNode.legId}-level-${toSourceLevel(focusedNode, level)}`);
            }
          }}
        />

        <div className="space-y-4">
          <DetailBox
            tree={tree}
            selectedNode={selectedNodeForDetail}
            focusedNode={focusedNode}
            onSetFocus={onSetFocus}
          />
          <LegLegend
            legs={scopedLegs}
            title={isFocusedRoot ? 'Beine' : `Unter-Beine von ${focusedNode.label}`}
            selectedLegId={legendSelectedLegId}
            onSelectLeg={(legId) => {
              const leg = scopedLegs.find((item) => item.id === legId);
              if (isFocusedRoot) {
                onSelectLeg(legId);
              } else if (leg?.nodeId) {
                onSetFocus(leg.nodeId);
              } else if (focusedNode.legId != null && legId != null) {
                onSelectSegment(focusedNode.legId, toSourceLevel(focusedNode, 1));
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface PolarHeatmapSvgProps {
  legs: LegData[];
  tree: SunburstNode;
  centerNode?: SunburstNode;
  selectedLegId: number | null;
  selectedLevel: number | null;
  onSelectSegment: (legId: number, level: number) => void;
  onCenterClick: () => void;
  onSegmentDoubleClick: (leg: LegData, level: number) => void;
}

function PolarHeatmapSvg({
  legs,
  tree,
  centerNode,
  selectedLegId,
  selectedLevel,
  onSelectSegment,
  onCenterClick,
  onSegmentDoubleClick,
}: PolarHeatmapSvgProps) {
  const levels = buildLevelTotalsFromLegs(legs);
  const maxLevel = Math.min(10, Math.max(1, levels.length));
  const center = 190;
  const ringWidth = 18;
  const gap = 4;
  const rootNode = centerNode ?? tree;
  const centerColor = rootNode.color ?? '#0f766e';

  return (
    <svg viewBox="0 0 380 380" role="img" aria-label="Sunburst Netzwerk">
      {levels.slice(0, maxLevel).map((levelTotal, levelIndex) => {
        const radius = 58 + levelIndex * (ringWidth + gap);
        let cursor = -90;
        return legs.map((leg) => {
          const levelValue = leg.levels[levelIndex]?.total ?? 0;
          if (levelValue <= 0 || levelTotal <= 0) return null;
          const levelShare = levelValue / levelTotal;
          const angle = 360 * levelShare;
          const start = cursor;
          const end = cursor + angle - 1.5;
          cursor += angle;

          const isLegSelected = selectedLegId === leg.id;
          const isExactSegment = isLegSelected && selectedLevel === levelIndex + 1;
          const isOtherLegSelected = selectedLegId != null && !isLegSelected;
          const opacity = isOtherLegSelected ? 0.18 : 1;
          const stroke = isExactSegment ? '#0f172a' : leg.color;
          const strokeWidthValue = isExactSegment
            ? ringWidth + 4
            : isLegSelected
              ? ringWidth + 1
              : ringWidth;

          return (
            <path
              key={`${levelIndex}-${leg.id}`}
              d={describeArc(center, center, radius, start, end)}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidthValue}
              strokeLinecap="butt"
              opacity={opacity}
              className="cursor-pointer transition-opacity"
              onClick={() => onSelectSegment(leg.id, levelIndex + 1)}
              onDoubleClick={() => onSegmentDoubleClick(leg, levelIndex + 1)}
            >
              <title>{`${leg.label} · Ebene ${levelIndex + 1} (Doppelklick: Fokus)`}</title>
            </path>
          );
        });
      })}
      <circle
        cx={center}
        cy={center}
        r="42"
        fill={centerColor}
        className="cursor-pointer"
        onClick={onCenterClick}
      />
      <text
        x={center}
        y={center - 4}
        textAnchor="middle"
        className="pointer-events-none fill-white text-sm font-semibold"
      >
        {rootNode.label}
      </text>
      <text
        x={center}
        y={center + 15}
        textAnchor="middle"
        className="pointer-events-none fill-white text-[11px]"
      >
        {rootNode.rankName ?? tree.rankName}
      </text>
      <circle cx={center} cy={center} r="174" fill="none" stroke="#e5e7eb" strokeWidth="1" />
    </svg>
  );
}

function Breadcrumb({
  path,
  onSetFocus,
}: {
  path: SunburstNode[];
  onSetFocus: (nodeId: string) => void;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-xs text-gray-600">
      {path.map((node, index) => {
        const isLast = index === path.length - 1;
        return (
          <span key={node.id} className="flex items-center gap-1">
            {index > 0 && <span className="text-gray-400">/</span>}
            <BreadcrumbButton
              onClick={() => !isLast && onSetFocus(node.id)}
              active={isLast}
            >
              {node.label}
            </BreadcrumbButton>
          </span>
        );
      })}
    </nav>
  );
}

function BreadcrumbButton({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 transition ${
        active
          ? 'bg-gray-100 text-gray-900 font-medium'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

function DetailBox({
  tree,
  selectedNode,
  focusedNode,
  onSetFocus,
}: {
  tree: SunburstNode;
  selectedNode: SunburstNode;
  focusedNode: SunburstNode;
  onSetFocus: (nodeId: string) => void;
}) {
  const node = selectedNode;
  const phase1 = node.phase1EUR ?? 0;
  const phase2 = node.phase2EUR ?? 0;
  const phase3 = node.phase3EUR ?? 0;
  const isFocusable = node.kind !== 'root' && node.id !== focusedNode.id;
  const isRootNode = node.kind === 'root';

  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center gap-2">
        {node.color && (
          <span
            className="h-3 w-3 rounded-full"
            style={{ background: node.color }}
          />
        )}
        <p className="text-xs uppercase tracking-wider text-gray-500">
          Detail
        </p>
      </div>
      <p className="mt-1 text-sm font-semibold text-gray-900">
        {node.label}
      </p>
      <p className="text-xs text-gray-500">
        Rang: {node.rankName ?? tree.rankName ?? 'Member'}
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Stat label="Member" value={formatNumber(node.members)} />
        <Stat label="Shopper" value={formatNumber(node.shoppers)} />
        <Stat label="QGV" value={`${formatNumber(node.qgv)} IP`} />
        <Stat label="Provision" value={formatCurrency(node.provisionEUR)} />
      </dl>

      {(phase1 + phase2 + phase3) > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-[10px]">
          <Stat label="Phase 1" value={formatCurrency(phase1)} subtle />
          <Stat label="Phase 2" value={formatCurrency(phase2)} subtle />
          <Stat label="Phase 3" value={formatCurrency(phase3)} subtle />
        </div>
      )}

      {isFocusable && (
        <button
          type="button"
          onClick={() => onSetFocus(node.id)}
          className="mt-3 w-full rounded-md border border-brand-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
        >
          Fokus auf {node.label} setzen
        </button>
      )}
      {isRootNode && (
        <p className="mt-3 text-[11px] text-gray-500">
          Tippe ein Segment an oder waehle ein Bein, um zu zoomen.
        </p>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  subtle,
}: {
  label: string;
  value: string;
  subtle?: boolean;
}) {
  return (
    <div className={subtle ? 'rounded bg-white p-1.5' : 'rounded bg-white p-2'}>
      <dt className="text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </dt>
      <dd className={`mt-0.5 font-semibold text-gray-900 ${subtle ? 'text-xs' : 'text-sm'}`}>
        {value}
      </dd>
    </div>
  );
}

function LegLegend({
  legs,
  title = 'Beine',
  selectedLegId,
  onSelectLeg,
}: {
  legs: LegData[];
  title?: string;
  selectedLegId: number | null;
  onSelectLeg: (legId: number | null) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wider text-gray-500">{title}</p>
      <div className="space-y-1">
        {legs.map((leg) => {
          const isSelected = selectedLegId === leg.id;
          return (
            <button
              key={leg.id}
              type="button"
              onClick={() => onSelectLeg(isSelected ? null : leg.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition ${
                isSelected
                  ? 'bg-gray-100 ring-1 ring-gray-300'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2 text-gray-700">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: leg.color }}
                />
                {leg.label}
              </span>
              <span className="font-medium text-gray-900">
                {formatCurrency(leg.eur)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildLevelTotalsFromLegs(legs: LegData[]): number[] {
  const maxLevels = Math.max(0, ...legs.map((leg) => leg.levels.length));
  return Array.from({ length: Math.min(10, maxLevels) }, (_, index) =>
    legs.reduce(
      (total, leg) => total + (leg.levels[index]?.total ?? 0),
      0,
    ),
  );
}

function buildScopedLegs(focusedNode: SunburstNode, legs: LegData[]): LegData[] {
  if (focusedNode.kind === 'root') {
    return legs;
  }

  const personChildren = focusedNode.children.filter(
    (child) => child.kind === 'person' || child.kind === 'leg',
  );
  if (personChildren.length > 0) {
    const visibleChildren = personChildren.slice(0, 10);
    const hiddenChildren = personChildren.slice(10);
    const childNodes = hiddenChildren.length > 0
      ? [...visibleChildren, mergeHiddenChildren(hiddenChildren, focusedNode)]
      : visibleChildren;
    const averageShare = 1 / Math.max(1, childNodes.length);
    const totalQgv = Math.max(
      1,
      childNodes.reduce((total, child) => total + child.qgv, 0),
    );

    return childNodes.map((child, index) => {
      const levels = levelsFromNode(child);
      const share = child.qgv / totalQgv;
      return {
        id: index + 1,
        nodeId: child.kind === 'aggregate' ? undefined : child.id,
        label: child.label,
        rank: child.rankName ?? 'Member',
        nodes: sumTotals(levels),
        members: child.members,
        shoppers: child.shoppers,
        qgv: child.qgv,
        eur: child.provisionEUR,
        activity: Math.max(8, Math.min(100, (share / averageShare) * 82)),
        color: shadeColor(child.color ?? focusedNode.color ?? '#0f766e', index * 5),
        levels,
      };
    });
  }

  if (focusedNode.legId == null) {
    return [];
  }

  const sourceLeg = legs.find((leg) => leg.id === focusedNode.legId);
  if (!sourceLeg) {
    return [];
  }

  const firstChildLevelIndex = focusedNode.kind === 'leg'
    ? 1
    : Math.max(0, focusedNode.depth - 1);
  const childLevels = sourceLeg.levels.slice(firstChildLevelIndex);
  const directMembers = Math.round(childLevels[0]?.members ?? 0);

  if (directMembers <= 0 || childLevels.length === 0) {
    return [];
  }

  const visibleLegs = Math.min(10, directMembers);
  return Array.from({ length: visibleLegs }, (_, index) => {
    const representedMembers =
      index === visibleLegs - 1 && directMembers > visibleLegs
        ? directMembers - visibleLegs + 1
        : 1;
    const share = representedMembers / directMembers;
    const levels = childLevels.map((level) => ({
      members: level.members * share,
      shoppers: level.shoppers * share,
      total: level.total * share,
    }));
    const nodes = sumTotals(levels);
    const isCluster = representedMembers > 1;

    return {
      id: index + 1,
      label: isCluster
        ? `Weitere ${representedMembers}`
        : `Bein ${focusedNode.legId}.${index + 1}`,
      rank: estimateAggregateRank(sourceLeg.qgv * share, Math.round(childLevels[1]?.members ?? 0)),
      nodes,
      members: levels.reduce((total, level) => total + level.members, 0),
      shoppers: levels.reduce((total, level) => total + level.shoppers, 0),
      qgv: sourceLeg.qgv * share,
      eur: sourceLeg.eur * share,
      activity: sourceLeg.activity,
      color: shadeColor(sourceLeg.color, index * 7),
      levels,
    };
  });
}

function levelsFromNode(node: SunburstNode): LevelBreakdown[] {
  const levels: LevelBreakdown[] = [];

  const ensure = (index: number) => {
    while (levels.length <= index) {
      levels.push({ members: 0, shoppers: 0, total: 0 });
    }
  };

  const visit = (item: SunburstNode, relativeDepth: number) => {
    ensure(relativeDepth);
    const childMembers = item.children.reduce((total, child) => total + child.members, 0);
    const childShoppers = item.children.reduce((total, child) => total + child.shoppers, 0);
    levels[relativeDepth].members += Math.max(0, item.members - childMembers);
    levels[relativeDepth].shoppers += Math.max(0, item.shoppers - childShoppers);
    levels[relativeDepth].total = levels[relativeDepth].members + levels[relativeDepth].shoppers;
    for (const child of item.children) {
      visit(child, relativeDepth + 1);
    }
  };

  visit(node, 0);
  return levels;
}

function mergeHiddenChildren(children: SunburstNode[], parent: SunburstNode): SunburstNode {
  const merged = children.reduce(
    (total, child) => ({
      members: total.members + child.members,
      shoppers: total.shoppers + child.shoppers,
      qgv: total.qgv + child.qgv,
      provisionEUR: total.provisionEUR + child.provisionEUR,
    }),
    { members: 0, shoppers: 0, qgv: 0, provisionEUR: 0 },
  );

  return {
    id: `${parent.id}-more`,
    parentId: parent.id,
    label: `Weitere ${children.length}`,
    kind: 'aggregate',
    legId: parent.legId,
    depth: parent.depth + 1,
    rankName: estimateAggregateRank(merged.qgv, children.length),
    members: merged.members,
    shoppers: merged.shoppers,
    qgv: merged.qgv,
    provisionEUR: merged.provisionEUR,
    color: parent.color,
    children,
  };
}

function toSourceLevel(focusedNode: SunburstNode, localLevel: number): number {
  if (focusedNode.kind === 'leg') {
    return localLevel + 1;
  }
  return focusedNode.depth - 1 + localLevel;
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
  const maxVisibleLevelTotal = Math.max(
    1,
    ...legs.flatMap((leg) => leg.levels.slice(0, 10).map((level) => level.total)),
  );

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
                    className="flex w-full flex-col justify-end overflow-hidden rounded-t bg-gray-100"
                    style={{
                      height: `${Math.max(8, Math.min(96, (value.total / maxVisibleLevelTotal) * 96))}px`,
                    }}
                  >
                    {value.shoppers > 0 && (
                      <span
                        className="w-full bg-green-300"
                        title={`Shopper: ${formatNumber(value.shoppers)}`}
                        style={{
                          height: `${Math.max(10, (value.shoppers / Math.max(1, value.total)) * 100)}%`,
                        }}
                      />
                    )}
                    {value.members > 0 && (
                      <span
                        className="w-full"
                        title={`Member: ${formatNumber(value.members)}`}
                        style={{
                          height: `${Math.max(10, (value.members / Math.max(1, value.total)) * 100)}%`,
                          background: shadeColor(leg.color, index * 8),
                        }}
                      />
                    )}
                  </span>
                  <span className="text-[10px] text-gray-400">E{index + 1}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm" style={{ background: leg.color }} />
                M {formatNumber(leg.members)}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-green-300" />
                S {formatNumber(leg.shoppers)}
              </span>
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
          <Metric label="Member/Shopper" value={`${formatNumber(selectedLeg.members)} / ${formatNumber(selectedLeg.shoppers)}`} />
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
                  tief: {formatNumber(sumTotals(leg.levels.slice(2)))}
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
                <th className="px-3 py-2 text-right">Member</th>
                <th className="px-3 py-2 text-right">Shopper</th>
                <th className="px-3 py-2 text-right">Knoten</th>
                <th className="px-3 py-2 text-right">Anteil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {selectedLeg.levels.slice(0, 10).map((value, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 font-medium text-gray-800">E{index + 1}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{formatNumber(value.members)}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{formatNumber(value.shoppers)}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{formatNumber(value.total)}</td>
                  <td className="px-3 py-2 text-right text-gray-500">
                    {Math.round((value.total / Math.max(1, selectedLeg.nodes)) * 100)}%
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
      const levels = buildLegLevelBreakdowns(leg);
      return {
        levels,
        nodes: sumTotals(levels),
        members: sum(leg.membersByLevel),
        shoppers: sum(leg.shoppersByLevel),
        qgv: calculateLegQgv(leg, memberMonthlyVolume, shopperMonthlyVolume),
      };
    });
    const totalLegQgv = Math.max(1, sum(legTotals.map((leg) => leg.qgv)));
    const averageShare = 1 / Math.max(1, snapshot.legs.length);

    return snapshot.legs.map((_, index) => {
      const { levels, nodes, members, shoppers, qgv } = legTotals[index];
      const share = qgv / totalLegQgv;
      const qualifiedLegs = Math.floor((snapshot.legs[index].membersByLevel[1] ?? 0) + 1e-9);
      const rank = snapshot.legs[index].ranksByLevel?.[0] ?? estimateAggregateRank(qgv, qualifiedLegs);
      const color = colorForLegIndex(index);

      return {
        id: index + 1,
        label: `Bein ${index + 1}`,
        rank,
        nodes,
        members,
        shoppers,
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

function buildLegLevelBreakdowns(leg: MonthResult['legs'][number]): LevelBreakdown[] {
  const max = Math.max(leg.membersByLevel.length, leg.shoppersByLevel.length, 1);
  return Array.from({ length: max }, (_, index) => {
    const members = leg.membersByLevel[index] ?? 0;
    const shoppers = leg.shoppersByLevel[index] ?? 0;
    return {
      members,
      shoppers,
      total: members + shoppers,
    };
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
  const membersByLevel = snapshot.membersByLevel.map((count) => count * share);
  const shoppersByLevel = snapshot.shoppersByLevel.map((count) => count * share);
  const qgvPerLeg = snapshot.qgv * share;
  const rank = estimateAggregateRank(qgvPerLeg, legCount);

  return Array.from({ length: legCount }, (_, index) => ({
    id: index + 1,
    label: `Bein ${index + 1}`,
    rank,
    nodes: snapshot.networkSize * share,
    members: sum(membersByLevel),
    shoppers: sum(shoppersByLevel),
    qgv: qgvPerLeg,
    eur: snapshot.totalEUR * share,
    activity: 100,
    color: colorForLegIndex(index),
    levels: levelTotals.map((levelTotal, levelIndex) => ({
      members: membersByLevel[levelIndex] ?? 0,
      shoppers: shoppersByLevel[levelIndex] ?? 0,
      total: levelTotal * share,
    })),
  }));
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

function sumTotals(values: LevelBreakdown[]) {
  return values.reduce((total, value) => total + value.total, 0);
}

import { useEffect, useMemo, useState } from 'react';
import type {
  PersonTreeSnapshot,
  TreeCompensationResult,
} from '@mlm/simulator-core';
import {
  buildPersonHierarchy,
  collectInitiallyCollapsedIds,
  type PersonNode,
} from './person-tree-node';
import { HorizontalDendrogram } from './HorizontalDendrogram';
import { RadialTree } from './RadialTree';
import { HyperbolicTree } from './HyperbolicTree';

export type PersonTreeView = 'radial' | 'dendrogram' | 'hyperbolic';

const VIEW_TITLES: Record<PersonTreeView, string> = {
  radial: 'Radial Tree',
  dendrogram: 'Horizontales Dendrogramm',
  hyperbolic: 'Hyperbolic Tree',
};

export const DEFAULT_OPEN_DEPTH = 2;

interface PersonTreeVisualizationsProps {
  personYearEnds: PersonTreeSnapshot[];
  treeCompensationYearEnds?: TreeCompensationResult[];
  memberMonthlyVolume: number;
  shopperMonthlyVolume: number;
  unitToCurrency?: number;
  selectedView: PersonTreeView;
}

export function PersonTreeVisualizations({
  personYearEnds,
  treeCompensationYearEnds,
  memberMonthlyVolume,
  shopperMonthlyVolume,
  unitToCurrency = 1,
  selectedView,
}: PersonTreeVisualizationsProps) {
  const maxYear = Math.max(1, personYearEnds.length);
  const [year, setYear] = useState(maxYear);
  const [hideInactive, setHideInactive] = useState(false);
  const yearIndex = Math.min(year - 1, personYearEnds.length - 1);
  const snapshot = personYearEnds[yearIndex];
  const compensation = treeCompensationYearEnds?.[yearIndex];
  const treeIdentity = snapshot
    ? `${snapshot.monthIndex}:${snapshot.persons.length}:${hideInactive}`
    : 'empty';

  const tree = useMemo<PersonNode | null>(
    () =>
      snapshot
        ? buildPersonHierarchy({
            snapshot,
            memberMonthlyVolume,
            shopperMonthlyVolume,
            compensation,
            unitToCurrency,
            hideInactive,
          })
        : null,
    [
      snapshot,
      compensation,
      memberMonthlyVolume,
      shopperMonthlyVolume,
      unitToCurrency,
      hideInactive,
    ],
  );

  const initialCollapsed = useMemo(
    () => (tree ? collectInitiallyCollapsedIds(tree, DEFAULT_OPEN_DEPTH) : new Set<string>()),
    [tree],
  );

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(initialCollapsed);

  useEffect(() => {
    setCollapsedIds(initialCollapsed);
  }, [treeIdentity, initialCollapsed]);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Personenbaum
            </p>
            <h2 className="text-xl font-semibold text-gray-900">
              {VIEW_TITLES[selectedView]} · Jahr {year}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
            <Metric
              label="Personen"
              value={tree ? formatCount(tree.subtreeMemberCount + tree.subtreeShopperCount) : '–'}
            />
            <Metric
              label="QGV"
              value={tree ? formatNumber(tree.subtreeQGV) : '–'}
            />
            <Metric
              label="Rang"
              value={tree?.rankName ?? 'Member'}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500">1</span>
          <input
            aria-label="Jahr"
            type="range"
            min={1}
            max={maxYear}
            value={year}
            onChange={(event) => handleYearChange(Number(event.target.value))}
            className="flex-1"
          />
          <span className="text-xs font-medium text-gray-500">{maxYear}</span>
        </div>

        <label className="mt-3 inline-flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={hideInactive}
            onChange={(event) => setHideInactive(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          Inaktive ausblenden
        </label>
      </div>

      {!tree && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500 shadow-sm">
          Kein Personenbaum-Snapshot fuer Jahr {year} verfuegbar.
        </div>
      )}

      {tree && selectedView === 'dendrogram' && (
        <HorizontalDendrogram
          tree={tree}
          collapsedIds={collapsedIds}
          onToggleCollapse={toggleCollapse}
        />
      )}

      {tree && selectedView === 'radial' && (
        <RadialTree
          tree={tree}
          collapsedIds={collapsedIds}
          onToggleCollapse={toggleCollapse}
        />
      )}

      {tree && selectedView === 'hyperbolic' && <HyperbolicTree />}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function formatCount(n: number): string {
  return Math.round(n).toLocaleString('de-DE');
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('de-DE');
}

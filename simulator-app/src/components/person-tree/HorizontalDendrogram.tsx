import { useMemo, useState } from 'react';
import {
  hierarchy as d3hierarchy,
  tree as d3tree,
  type HierarchyPointNode,
} from 'd3-hierarchy';
import {
  hiddenSubtreeStats,
  type PersonNode,
  type PersonTreeNode,
  type PersonTreeStatus,
} from './person-tree-node';
import { usePanZoom } from './usePanZoom';

interface HorizontalDendrogramProps {
  tree: PersonNode;
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
}

const STATUS_COLORS: Record<PersonTreeStatus, string> = {
  active: '#10b981',
  under_qualified: '#f59e0b',
  inactive: '#9ca3af',
  not_paid: '#ef4444',
};

const SHOPPER_AGGREGATE_COLOR = '#0ea5e9';

const MEMBER_RADIUS = 6;
const ROW_HEIGHT = 28;
const COL_WIDTH = 200;
const PADDING_TOP = 24;
const PADDING_LEFT = 60;
const PADDING_RIGHT = 220;
const PADDING_BOTTOM = 24;

interface LayoutNode {
  data: PersonTreeNode;
  /** Horizontale Position im SVG (links nach rechts == Tiefe). */
  x: number;
  /** Vertikale Position im SVG. */
  y: number;
  parent: LayoutNode | null;
  isCollapsed: boolean;
  hiddenChildren: number;
}

/** Erstellt eine d3-hierarchy aus PersonTreeNode unter Beachtung des Collapse-Sets. */
function toVisibleHierarchy(
  root: PersonNode,
  collapsedIds: Set<string>,
): { hierarchy: ReturnType<typeof d3hierarchy<PersonTreeNode>>; isCollapsed: (n: PersonTreeNode) => boolean } {
  const isCollapsed = (node: PersonTreeNode) =>
    node.kind !== 'shopper-aggregate' &&
    collapsedIds.has(node.id) &&
    node.children.length > 0;

  const hierarchy = d3hierarchy<PersonTreeNode>(root, (node) =>
    isCollapsed(node) ? null : node.children,
  );
  return { hierarchy, isCollapsed };
}

export function HorizontalDendrogram({
  tree,
  collapsedIds,
  onToggleCollapse,
}: HorizontalDendrogramProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const { svgRef, transform, onPointerDown, reset, isPanning } = usePanZoom();

  const layout = useMemo(() => {
    const { hierarchy, isCollapsed } = toVisibleHierarchy(tree, collapsedIds);

    const treeLayout = d3tree<PersonTreeNode>().nodeSize([ROW_HEIGHT, COL_WIDTH]);
    const rooted = treeLayout(hierarchy);

    const nodes = rooted.descendants();
    const links = rooted.links();

    // d3.tree liefert x = vertikale Position (entlang Geschwister), y = horizontale Position (Tiefe).
    // Wir nutzen y als SVG-x und x als SVG-y (horizontales Layout).
    const xs = nodes.map((n) => n.x);
    const minY = Math.min(...xs);
    const maxY = Math.max(...xs);
    const maxX = Math.max(...nodes.map((n) => n.y));

    const offsetY = PADDING_TOP - minY;
    const width = PADDING_LEFT + maxX + PADDING_RIGHT;
    const height = PADDING_BOTTOM + (maxY - minY) + PADDING_TOP;

    const layoutNodes: LayoutNode[] = nodes.map((n) => ({
      data: n.data,
      x: PADDING_LEFT + n.y,
      y: n.x + offsetY,
      parent: null,
      isCollapsed: isCollapsed(n.data),
      hiddenChildren: isCollapsed(n.data) ? n.data.children.length : 0,
    }));

    const byD3 = new Map<HierarchyPointNode<PersonTreeNode>, LayoutNode>();
    nodes.forEach((n, i) => byD3.set(n, layoutNodes[i]));
    nodes.forEach((n, i) => {
      const parent = n.parent ? byD3.get(n.parent) ?? null : null;
      layoutNodes[i].parent = parent;
    });

    return { nodes: layoutNodes, links: links.map((link) => ({ source: byD3.get(link.source)!, target: byD3.get(link.target)! })), width, height };
  }, [tree, collapsedIds]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Arbeitsansicht
          </p>
          <h3 className="text-sm font-semibold text-gray-900">
            Horizontales Dendrogramm
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <Legend />
          <ResetButton onClick={reset} />
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-4 pt-3" style={{ maxHeight: '70vh', overflow: 'auto' }}>
        <svg
          ref={svgRef}
          width={layout.width}
          height={layout.height}
          role="img"
          aria-label="Personenbaum als horizontales Dendrogramm, scrollbar mit Mausrad und ziehbar"
          onPointerDown={onPointerDown}
          style={{
            cursor: isPanning ? 'grabbing' : 'grab',
            userSelect: 'none',
            touchAction: 'none',
            display: 'block',
          }}
        >
          <g transform={transform}>
            <g>
              {layout.links.map((link, i) => (
                <path
                  key={i}
                  d={linkPath(link.source, link.target)}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth={1.25}
                />
              ))}
            </g>
            <g>
              {layout.nodes.map((node) => (
                <NodeMark
                  key={node.data.id}
                  node={node}
                  hovered={hoverId === node.data.id}
                  onHover={setHoverId}
                  onToggleCollapse={onToggleCollapse}
                />
              ))}
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-gray-200 px-2 py-1 text-[10px] uppercase tracking-wider text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition"
      title="Ansicht zuruecksetzen"
    >
      Reset
    </button>
  );
}

function linkPath(source: LayoutNode, target: LayoutNode): string {
  const midX = (source.x + target.x) / 2;
  return `M${source.x},${source.y} C${midX},${source.y} ${midX},${target.y} ${target.x},${target.y}`;
}

interface NodeMarkProps {
  node: LayoutNode;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onToggleCollapse: (id: string) => void;
}

function NodeMark({ node, hovered, onHover, onToggleCollapse }: NodeMarkProps) {
  const data = node.data;
  const isShopperAggregate = data.kind === 'shopper-aggregate';
  const radius = isShopperAggregate
    ? Math.min(18, 4 + Math.sqrt(data.shopperCount) * 2)
    : MEMBER_RADIUS;
  const fill = isShopperAggregate
    ? SHOPPER_AGGREGATE_COLOR
    : STATUS_COLORS[data.status];
  const stroke = node.isCollapsed ? '#1f2937' : 'white';
  const strokeDasharray = node.isCollapsed ? '3 2' : undefined;

  const canCollapse = !isShopperAggregate && data.children.length > 0;

  const handleClick = () => {
    if (canCollapse) onToggleCollapse(data.id);
  };

  return (
    <g
      data-pan-ignore="true"
      transform={`translate(${node.x},${node.y})`}
      onMouseEnter={() => onHover(data.id)}
      onMouseLeave={() => onHover(null)}
      onClick={handleClick}
      style={{ cursor: canCollapse ? 'pointer' : 'default' }}
    >
      <circle
        r={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={node.isCollapsed ? 1.5 : 2}
        strokeDasharray={strokeDasharray}
      />
      {canCollapse && (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={9}
          fontWeight={700}
          fill="white"
          pointerEvents="none"
        >
          {node.isCollapsed ? '+' : '−'}
        </text>
      )}
      <NodeLabel node={node} hovered={hovered} />
    </g>
  );
}

function NodeLabel({ node, hovered }: { node: LayoutNode; hovered: boolean }) {
  const data = node.data;
  if (data.kind === 'shopper-aggregate') {
    return (
      <text
        x={Math.min(18, 4 + Math.sqrt(data.shopperCount) * 2) + 6}
        y={4}
        fontSize={11}
        fill="#0c4a6e"
      >
        {data.label}
        {hovered && (
          <tspan x={Math.min(18, 4 + Math.sqrt(data.shopperCount) * 2) + 6} dy={14} fill="#475569">
            {formatNumber(data.totalQGV)} IP
          </tspan>
        )}
      </text>
    );
  }

  const hidden = node.isCollapsed ? hiddenSubtreeStats(data) : null;
  const primary = data.kind === 'root' ? 'Du' : shortId(data.personId);
  const rankLine = data.rankName ? data.rankName : 'Member';

  return (
    <text x={MEMBER_RADIUS + 6} y={4} fontSize={11} fill="#1f2937">
      <tspan fontWeight={data.kind === 'root' ? 700 : 500}>{primary}</tspan>
      <tspan dx={6} fill="#64748b">{rankLine}</tspan>
      {hidden && (
        <tspan x={MEMBER_RADIUS + 6} dy={14} fill="#64748b">
          +{formatCount(hidden.hiddenMemberCount)} Personen
          {hidden.hiddenShopperCount > 0
            ? `, +${formatCount(hidden.hiddenShopperCount)} Shopper`
            : ''}{' '}
          &middot; {formatNumber(hidden.hiddenQGV)} IP
          {hidden.hiddenProvisionEUR > 0
            ? ` &middot; ${formatCurrency(hidden.hiddenProvisionEUR)}`
            : ''}
        </tspan>
      )}
      {hovered && !hidden && (
        <tspan x={MEMBER_RADIUS + 6} dy={14} fill="#64748b">
          {formatNumber(data.subtreeQGV)} IP &middot; {formatCurrency(data.subtreeProvisionEUR)}
        </tspan>
      )}
    </text>
  );
}

function Legend() {
  return (
    <div className="hidden sm:flex items-center gap-3 text-[10px] text-gray-500">
      <LegendDot color={STATUS_COLORS.active} label="aktiv" />
      <LegendDot color={STATUS_COLORS.under_qualified} label="reduziert" />
      <LegendDot color={STATUS_COLORS.inactive} label="inaktiv" />
      <LegendDot color={SHOPPER_AGGREGATE_COLOR} label="Shopper" />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block rounded-full"
        style={{ width: 8, height: 8, backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function shortId(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 12)}…`;
}

function formatCount(n: number): string {
  return Math.round(n).toLocaleString('de-DE');
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('de-DE');
}

function formatCurrency(n: number): string {
  return `${Math.round(n).toLocaleString('de-DE')} €`;
}

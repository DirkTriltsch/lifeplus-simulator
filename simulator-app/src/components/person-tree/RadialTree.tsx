import { useMemo, useState } from 'react';
import {
  hierarchy as d3hierarchy,
  tree as d3tree,
} from 'd3-hierarchy';
import {
  hiddenSubtreeStats,
  type PersonNode,
  type PersonTreeNode,
  type PersonTreeStatus,
} from './person-tree-node';

interface RadialTreeProps {
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

const MEMBER_RADIUS = 5;
const OUTER_RADIUS = 320;
const SVG_SIZE = (OUTER_RADIUS + 110) * 2; // Platz fuer Labels aussen herum.

interface PolarLayoutNode {
  data: PersonTreeNode;
  /** Winkel in Radiant, 0 = Norden, im Uhrzeigersinn. */
  angle: number;
  /** Radius vom Zentrum. */
  radius: number;
  /** Kartesische Position (x, y) mit Ursprung Zentrum. */
  cx: number;
  cy: number;
  parent: PolarLayoutNode | null;
  isCollapsed: boolean;
}

function toVisibleHierarchy(root: PersonNode, collapsedIds: Set<string>) {
  const isCollapsed = (node: PersonTreeNode) =>
    node.kind !== 'shopper-aggregate' &&
    collapsedIds.has(node.id) &&
    node.children.length > 0;

  const hierarchy = d3hierarchy<PersonTreeNode>(root, (node) =>
    isCollapsed(node) ? null : node.children,
  );
  return { hierarchy, isCollapsed };
}

export function RadialTree({ tree, collapsedIds, onToggleCollapse }: RadialTreeProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const layout = useMemo(() => {
    const { hierarchy, isCollapsed } = toVisibleHierarchy(tree, collapsedIds);

    const treeLayout = d3tree<PersonTreeNode>().size([2 * Math.PI, OUTER_RADIUS]);
    const rooted = treeLayout(hierarchy);
    const descendants = rooted.descendants();

    const nodes: PolarLayoutNode[] = descendants.map((n) => {
      const angle = n.x; // Radiant, 0..2π
      const radius = n.y;
      const cx = radius * Math.sin(angle); // 0 = Norden, im Uhrzeigersinn
      const cy = -radius * Math.cos(angle);
      return {
        data: n.data,
        angle,
        radius,
        cx,
        cy,
        parent: null,
        isCollapsed: isCollapsed(n.data),
      };
    });

    const byD3 = new Map(descendants.map((n, i) => [n, nodes[i]]));
    descendants.forEach((n, i) => {
      nodes[i].parent = n.parent ? byD3.get(n.parent) ?? null : null;
    });

    const links = rooted.links().map((link) => ({
      source: byD3.get(link.source)!,
      target: byD3.get(link.target)!,
    }));

    return { nodes, links };
  }, [tree, collapsedIds]);

  const half = SVG_SIZE / 2;
  const viewBox = `${-half} ${-half} ${SVG_SIZE} ${SVG_SIZE}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 pt-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Uebersicht</p>
          <h3 className="text-sm font-semibold text-gray-900">Radial Tree</h3>
        </div>
        <Legend />
      </div>

      <div className="px-4 sm:px-5 pb-4 pt-3 overflow-auto" style={{ maxHeight: '80vh' }}>
        <svg
          viewBox={viewBox}
          width="100%"
          style={{ maxWidth: SVG_SIZE, display: 'block', margin: '0 auto' }}
          role="img"
          aria-label="Personenbaum als Radial Tree"
        >
          <g>
            {layout.links.map((link, i) => (
              <path
                key={i}
                d={radialLinkPath(link.source, link.target)}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth={1}
              />
            ))}
          </g>
          <g>
            {layout.nodes.map((node) => (
              <RadialNodeMark
                key={node.data.id}
                node={node}
                hovered={hoverId === node.data.id}
                onHover={setHoverId}
                onToggleCollapse={onToggleCollapse}
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

/**
 * Bezier von Eltern- zu Kindknoten in Polarkoordinaten.
 * Steigt vom Eltern-Radius zum Kind-Radius, krummt sich tangential zum Eltern-Kreis.
 */
function radialLinkPath(source: PolarLayoutNode, target: PolarLayoutNode): string {
  const sX = source.cx;
  const sY = source.cy;
  const tX = target.cx;
  const tY = target.cy;
  const midR = (source.radius + target.radius) / 2;
  const c1X = midR * Math.sin(source.angle);
  const c1Y = -midR * Math.cos(source.angle);
  const c2X = midR * Math.sin(target.angle);
  const c2Y = -midR * Math.cos(target.angle);
  return `M${sX},${sY} C${c1X},${c1Y} ${c2X},${c2Y} ${tX},${tY}`;
}

interface RadialNodeMarkProps {
  node: PolarLayoutNode;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onToggleCollapse: (id: string) => void;
}

function RadialNodeMark({ node, hovered, onHover, onToggleCollapse }: RadialNodeMarkProps) {
  const data = node.data;
  const isShopperAggregate = data.kind === 'shopper-aggregate';
  const radius = isShopperAggregate
    ? Math.min(14, 3 + Math.sqrt(data.shopperCount) * 1.6)
    : MEMBER_RADIUS;
  const fill = isShopperAggregate ? SHOPPER_AGGREGATE_COLOR : STATUS_COLORS[data.status];
  const stroke = node.isCollapsed ? '#1f2937' : 'white';
  const strokeDasharray = node.isCollapsed ? '3 2' : undefined;
  const canCollapse = !isShopperAggregate && data.children.length > 0;

  const handleClick = () => {
    if (canCollapse) onToggleCollapse(data.id);
  };

  return (
    <g
      transform={`translate(${node.cx},${node.cy})`}
      onMouseEnter={() => onHover(data.id)}
      onMouseLeave={() => onHover(null)}
      onClick={handleClick}
      style={{ cursor: canCollapse ? 'pointer' : 'default' }}
    >
      <circle
        r={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={node.isCollapsed ? 1.25 : 1.5}
        strokeDasharray={strokeDasharray}
      />
      {canCollapse && data.kind !== 'root' && (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={8}
          fontWeight={700}
          fill="white"
          pointerEvents="none"
        >
          {node.isCollapsed ? '+' : '−'}
        </text>
      )}
      <RadialLabel node={node} hovered={hovered} radius={radius} />
    </g>
  );
}

function RadialLabel({
  node,
  hovered,
  radius,
}: {
  node: PolarLayoutNode;
  hovered: boolean;
  radius: number;
}) {
  const data = node.data;
  if (data.kind === 'root') {
    return (
      <text
        textAnchor="middle"
        y={radius + 14}
        fontSize={11}
        fontWeight={700}
        fill="#1f2937"
      >
        Du
      </text>
    );
  }

  // Label-Ausrichtung nach Halbkreis: rechte Haelfte normal, linke Haelfte gespiegelt.
  const angleDeg = (node.angle * 180) / Math.PI;
  const onLeftHalf = angleDeg > 180;
  const offset = radius + 6;
  const rotation = onLeftHalf ? angleDeg + 90 : angleDeg - 90;
  const textAnchor = onLeftHalf ? 'end' : 'start';
  const xOffset = onLeftHalf ? -offset : offset;

  if (data.kind === 'shopper-aggregate') {
    return (
      <g transform={`rotate(${rotation})`}>
        <text
          x={xOffset}
          y={3}
          fontSize={10}
          fill="#0c4a6e"
          textAnchor={textAnchor}
        >
          {data.label}
          {hovered && (
            <tspan x={xOffset} dy={12} fill="#475569">
              {formatNumber(data.totalQGV)} IP
            </tspan>
          )}
        </text>
      </g>
    );
  }

  const hidden = node.isCollapsed ? hiddenSubtreeStats(data) : null;
  const primary = shortId(data.personId);

  return (
    <g transform={`rotate(${rotation})`}>
      <text
        x={xOffset}
        y={3}
        fontSize={10}
        fill="#1f2937"
        textAnchor={textAnchor}
      >
        <tspan>{primary}</tspan>
        {hidden && (
          <tspan x={xOffset} dy={12} fill="#64748b">
            +{formatCount(hidden.hiddenMemberCount)}P
            {hidden.hiddenShopperCount > 0
              ? ` +${formatCount(hidden.hiddenShopperCount)}S`
              : ''}
          </tspan>
        )}
        {hovered && !hidden && data.rankName && (
          <tspan x={xOffset} dy={12} fill="#64748b">
            {data.rankName}
          </tspan>
        )}
      </text>
    </g>
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
  if (id.length <= 10) return id;
  return `${id.slice(0, 8)}…`;
}

function formatCount(n: number): string {
  return Math.round(n).toLocaleString('de-DE');
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('de-DE');
}

import type {
  PersonTreeSnapshot,
  SimPerson,
  TreeCompensationResult,
} from '@mlm/simulator-core';

export type PersonTreeStatus =
  | 'active'
  | 'under_qualified'
  | 'inactive'
  | 'not_paid';

interface BaseNodeFields {
  id: string;
  parentId: string | null;
  label: string;
  depth: number;
  subtreeMemberCount: number;
  subtreeShopperCount: number;
  subtreeQGV: number;
  subtreeProvisionEUR: number;
}

export interface PersonNode extends BaseNodeFields {
  kind: 'root' | 'member';
  personId: string;
  rankName?: string;
  status: PersonTreeStatus;
  ownMemberCount: number;
  ownIP: number;
  ownProvisionEUR: number;
  ownPhase1EUR: number;
  ownPhase2EUR: number;
  ownPhase3EUR: number;
  children: PersonTreeNode[];
}

export interface ShopperAggregateNode extends BaseNodeFields {
  kind: 'shopper-aggregate';
  parentId: string;
  shopperCount: number;
  totalQGV: number;
  totalProvisionEUR: number;
  children: [];
}

export type PersonTreeNode = PersonNode | ShopperAggregateNode;

export interface BuildPersonHierarchyInput {
  snapshot: PersonTreeSnapshot;
  memberMonthlyVolume: number;
  shopperMonthlyVolume: number;
  compensation?: TreeCompensationResult;
  unitToCurrency?: number;
  hideInactive?: boolean;
}

interface PayoutTotals {
  total: number;
  phase1: number;
  phase2: number;
  phase3: number;
}

const ZERO_PAYOUT: PayoutTotals = {
  total: 0,
  phase1: 0,
  phase2: 0,
  phase3: 0,
};

function buildPayoutMap(
  compensation: TreeCompensationResult,
  unitToCurrency: number,
): Map<string, PayoutTotals> {
  const payouts = new Map<string, PayoutTotals>();

  for (const payout of compensation.payouts) {
    const current = payouts.get(payout.receiverId) ?? { ...ZERO_PAYOUT };
    const amount = payout.amount * unitToCurrency;
    current.total += amount;
    if (payout.phase === 1) current.phase1 += amount;
    if (payout.phase === 2) current.phase2 += amount;
    if (payout.phase === 3) current.phase3 += amount;
    payouts.set(payout.receiverId, current);
  }

  return payouts;
}

function deriveStatus(person: SimPerson): PersonTreeStatus {
  if (!person.active) return 'inactive';
  if (person.weight < 0.95) return 'under_qualified';
  return 'active';
}

interface PersonContext {
  personsById: Map<string, SimPerson>;
  memberMonthlyVolume: number;
  shopperMonthlyVolume: number;
  payoutByReceiverId: Map<string, PayoutTotals>;
  rankByPersonId: Map<string, { rank: { name: string }; av: number }>;
  hideInactive: boolean;
}

interface AggregatedChildren {
  members: SimPerson[];
  shoppers: SimPerson[];
}

function childPersons(
  person: SimPerson,
  context: PersonContext,
): AggregatedChildren {
  const members: SimPerson[] = [];
  const shoppers: SimPerson[] = [];
  for (const childId of person.childrenIds) {
    const child = context.personsById.get(childId);
    if (!child || (context.hideInactive && !child.active)) continue;
    if (child.kind === 'member') members.push(child);
    else if (child.kind === 'shopper') shoppers.push(child);
  }
  return { members, shoppers };
}

function shopperQGV(shopper: SimPerson, context: PersonContext): number {
  if (!shopper.active) return 0;
  const av = context.rankByPersonId.get(shopper.id)?.av;
  const volume = av ?? context.shopperMonthlyVolume;
  return shopper.weight * volume;
}

function memberOwnIP(person: SimPerson, context: PersonContext): number {
  if (!person.active) return 0;
  const av = context.rankByPersonId.get(person.id)?.av;
  return person.weight * (av ?? person.personalMonthlyVolume);
}

function buildShopperAggregate(
  parentId: string,
  depth: number,
  shoppers: SimPerson[],
  context: PersonContext,
): ShopperAggregateNode | null {
  if (shoppers.length === 0) return null;

  let shopperCount = 0;
  let totalQGV = 0;

  for (const shopper of shoppers) {
    shopperCount += shopper.weight;
    totalQGV += shopperQGV(shopper, context);
  }

  return {
    kind: 'shopper-aggregate',
    id: `${parentId}::shoppers`,
    parentId,
    label: `${formatShopperCount(shopperCount)} Shopper`,
    depth,
    shopperCount,
    totalQGV,
    totalProvisionEUR: 0,
    subtreeMemberCount: 0,
    subtreeShopperCount: shopperCount,
    subtreeQGV: totalQGV,
    subtreeProvisionEUR: 0,
    children: [],
  };
}

function formatShopperCount(count: number): string {
  const rounded = Math.round(count * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1).replace('.', ',');
}

function buildMemberNode(
  person: SimPerson,
  parentId: string | null,
  depth: number,
  context: PersonContext,
): PersonNode {
  const { members, shoppers } = childPersons(person, context);

  const childNodes: PersonTreeNode[] = members.map((child) =>
    buildMemberNode(child, person.id, depth + 1, context),
  );

  const shopperAggregate = buildShopperAggregate(
    person.id,
    depth + 1,
    shoppers,
    context,
  );
  if (shopperAggregate) childNodes.push(shopperAggregate);

  const ownPayout = person.active
    ? context.payoutByReceiverId.get(person.id) ?? ZERO_PAYOUT
    : ZERO_PAYOUT;
  const ownIP = memberOwnIP(person, context);
  const ownMemberCount = person.kind === 'member' ? person.weight : 0;

  let subtreeMembers = ownMemberCount;
  let subtreeShoppers = 0;
  let subtreeQGV = person.kind === 'member' ? ownIP : 0;
  let subtreeProvision = ownPayout.total;

  for (const child of childNodes) {
    subtreeMembers += child.subtreeMemberCount;
    subtreeShoppers += child.subtreeShopperCount;
    subtreeQGV += child.subtreeQGV;
    subtreeProvision += child.subtreeProvisionEUR;
  }

  const rankState = context.rankByPersonId.get(person.id);

  return {
    kind: person.kind === 'root' ? 'root' : 'member',
    id: person.id,
    personId: person.id,
    parentId,
    label: person.id,
    depth,
    rankName: rankState?.rank.name,
    status: deriveStatus(person),
    ownMemberCount,
    ownIP,
    ownProvisionEUR: ownPayout.total,
    ownPhase1EUR: ownPayout.phase1,
    ownPhase2EUR: ownPayout.phase2,
    ownPhase3EUR: ownPayout.phase3,
    subtreeMemberCount: subtreeMembers,
    subtreeShopperCount: subtreeShoppers,
    subtreeQGV,
    subtreeProvisionEUR: subtreeProvision,
    children: childNodes,
  };
}

/**
 * Baut einen immutablen Personenbaum aus einem PersonTreeSnapshot.
 *
 * - Inaktive Personen bleiben sichtbar, koennen aber per hideInactive ausgeblendet werden.
 * - Direkte Shopper-Kinder eines Members werden zu einem 'shopper-aggregate'
 *   Sammelknoten zusammengefasst (Radius/Anzeige skaliert ueber Aufrufseite).
 * - Subtree-Stats (Member/Shopper/QGV/Provision) sind in jedem Knoten praeaggregiert,
 *   damit Collapse-Visualisierungen ohne erneutes Traversieren auskommen.
 */
export function buildPersonHierarchy({
  snapshot,
  memberMonthlyVolume,
  shopperMonthlyVolume,
  compensation,
  unitToCurrency = 1,
  hideInactive = false,
}: BuildPersonHierarchyInput): PersonNode | null {
  const personsById = new Map(snapshot.persons.map((p) => [p.id, p]));
  const rootPerson = personsById.get(snapshot.rootId);
  if (!rootPerson) return null;

  const context: PersonContext = {
    personsById,
    memberMonthlyVolume,
    shopperMonthlyVolume,
    payoutByReceiverId: compensation
      ? buildPayoutMap(compensation, unitToCurrency)
      : new Map(),
    rankByPersonId: new Map(
      compensation?.rankStates.map((state) => [state.personId, state]) ?? [],
    ),
    hideInactive,
  };

  return buildMemberNode(rootPerson, null, 0, context);
}

/** Sucht einen Knoten per ID rekursiv im Baum. */
export function findPersonNodeById(
  tree: PersonTreeNode,
  id: string,
): PersonTreeNode | null {
  if (tree.id === id) return tree;
  if (tree.kind === 'shopper-aggregate') return null;
  for (const child of tree.children) {
    const hit = findPersonNodeById(child, id);
    if (hit) return hit;
  }
  return null;
}

/**
 * Liefert die initial eingeklappten Node-IDs, sodass nur die ersten
 * `defaultOpenDepth` Ebenen offen sind. Knoten auf Tiefe >= defaultOpenDepth
 * mit Kindern werden eingeklappt; alles darueber bleibt sichtbar.
 */
export function collectInitiallyCollapsedIds(
  tree: PersonTreeNode,
  defaultOpenDepth: number,
): Set<string> {
  const collapsed = new Set<string>();
  const visit = (node: PersonTreeNode) => {
    if (node.kind === 'shopper-aggregate') return;
    if (node.depth >= defaultOpenDepth && node.children.length > 0) {
      collapsed.add(node.id);
      return;
    }
    for (const child of node.children) visit(child);
  };
  visit(tree);
  return collapsed;
}

/**
 * Aggregierte Stats fuer den Inhalt unter einem eingeklappten Knoten
 * (Knoten selbst ist nicht enthalten, weil er bereits sichtbar gerendert wird).
 */
export interface HiddenSubtreeStats {
  hiddenMemberCount: number;
  hiddenShopperCount: number;
  hiddenQGV: number;
  hiddenProvisionEUR: number;
}

export function hiddenSubtreeStats(node: PersonTreeNode): HiddenSubtreeStats {
  if (node.kind === 'shopper-aggregate') {
    return {
      hiddenMemberCount: 0,
      hiddenShopperCount: 0,
      hiddenQGV: 0,
      hiddenProvisionEUR: 0,
    };
  }
  const ownIP = node.ownIP;
  const ownPayout = node.ownProvisionEUR;
  return {
    hiddenMemberCount: clampTiny(node.subtreeMemberCount - node.ownMemberCount),
    hiddenShopperCount: node.subtreeShopperCount,
    hiddenQGV: clampTiny(node.subtreeQGV - ownIP),
    hiddenProvisionEUR: clampTiny(node.subtreeProvisionEUR - ownPayout),
  };
}

function clampTiny(value: number): number {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return Math.max(0, rounded);
}

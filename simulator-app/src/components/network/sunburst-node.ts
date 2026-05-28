import type {
  MonthResult,
  PersonTreeSnapshot,
  SimPerson,
  TreeCompensationResult,
} from '@mlm/simulator-core';

export interface LegLevelBreakdown {
  members: number;
  shoppers: number;
  total: number;
  /** Aggregiertes Volumen aller Personen dieser Ebene des Beins. */
  qgv: number;
  /** Aggregierte Provision dieser Ebene/des Subtrees, soweit Tree-Compensation vorhanden ist. */
  provisionEUR?: number;
}

export interface LegData {
  id: number;
  nodeId?: string;
  label: string;
  rank: string;
  nodes: number;
  members: number;
  shoppers: number;
  qgv: number;
  eur: number;
  activity: number;
  color: string;
  levels: LegLevelBreakdown[];
  /** Optional: Status des Bein-Roots (nur bei Personenbaum bekannt). */
  status?: SunburstStatus;
}

export type SunburstNodeKind = 'root' | 'leg' | 'level' | 'aggregate' | 'person';
export type SunburstStatus =
  | 'active'
  | 'under_qualified'
  | 'inactive'
  | 'not_paid';

export interface SunburstNode {
  id: string;
  parentId: string | null;
  label: string;
  kind: SunburstNodeKind;
  legId: number | null;
  /** 0 = Wurzel, 1 = direkte Beine, 2+ = Ebenen darunter. */
  depth: number;
  rankName?: string;
  members: number;
  shoppers: number;
  qgv: number;
  provisionEUR: number;
  phase1EUR?: number;
  phase2EUR?: number;
  phase3EUR?: number;
  status?: SunburstStatus;
  /** Eigene monatliche IP der Person (ohne Subtree). Nur bei Personenknoten gesetzt. */
  ownIP?: number;
  /** Bein-Farbe; ueber alle Tiefen identisch fuer das gleiche Bein. */
  color?: string;
  children: SunburstNode[];
}

export interface BuildSunburstTreeInput {
  snapshot: MonthResult;
  memberMonthlyVolume: number;
  shopperMonthlyVolume: number;
}

const LEG_PALETTE = [
  '#0d9488', // teal
  '#7c3aed', // violet
  '#ea580c', // orange
  '#0284c7', // sky
  '#dc2626', // red
  '#65a30d', // lime
  '#c026d3', // fuchsia
  '#0891b2', // cyan
  '#a16207', // amber
  '#475569', // slate
];

export function colorForLegIndex(index: number): string {
  return LEG_PALETTE[index % LEG_PALETTE.length];
}

export function buildSunburstTree({
  snapshot,
  memberMonthlyVolume,
  shopperMonthlyVolume,
}: BuildSunburstTreeInput): SunburstNode {
  const legQgvs = snapshot.legs.map((leg) =>
    sumLeg(leg, memberMonthlyVolume, shopperMonthlyVolume),
  );
  const totalLegQgv = Math.max(1, sumValues(legQgvs));

  const root: SunburstNode = {
    id: 'root',
    parentId: null,
    label: 'Du',
    kind: 'root',
    legId: null,
    depth: 0,
    rankName: snapshot.rankName,
    members: sumValues(snapshot.membersByLevel),
    shoppers: sumValues(snapshot.shoppersByLevel),
    qgv: snapshot.qgv,
    provisionEUR: snapshot.totalEUR,
    phase1EUR: snapshot.phase1EUR,
    phase2EUR: snapshot.phase2EUR,
    phase3EUR: snapshot.phase3EUR,
    children: [],
  };

  if (snapshot.legs.length === 0) {
    return root;
  }

  snapshot.legs.forEach((leg, index) => {
    const legId = index + 1;
    const members = sumValues(leg.membersByLevel);
    const shoppers = sumValues(leg.shoppersByLevel);
    const qgv = legQgvs[index];
    const share = qgv / totalLegQgv;
    const provisionEUR = snapshot.totalEUR * share;
    const qualifiedLegs = Math.floor((leg.membersByLevel[1] ?? 0) + 1e-9);
    const rankName = leg.ranksByLevel?.[0] ?? estimateAggregateRank(qgv, qualifiedLegs);
    const color = colorForLegIndex(index);

    const legNode: SunburstNode = {
      id: `leg-${legId}`,
      parentId: 'root',
      label: `Bein ${legId}`,
      kind: 'leg',
      legId,
      depth: 1,
      rankName,
      members,
      shoppers,
      qgv,
      provisionEUR,
      phase1EUR: (snapshot.phase1EUR ?? 0) * share,
      phase2EUR: (snapshot.phase2EUR ?? 0) * share,
      phase3EUR: (snapshot.phase3EUR ?? 0) * share,
      color,
      children: [],
    };

    const maxLevel = Math.max(
      leg.membersByLevel.length,
      leg.shoppersByLevel.length,
    );

    for (let l = 0; l < maxLevel; l++) {
      const m = leg.membersByLevel[l] ?? 0;
      const s = leg.shoppersByLevel[l] ?? 0;
      if (m === 0 && s === 0) continue;

      const levelQgv =
        m * memberMonthlyVolume + s * shopperMonthlyVolume;
      const levelShareOfLeg = qgv > 0 ? levelQgv / qgv : 0;

      legNode.children.push({
        id: `leg-${legId}-level-${l + 1}`,
        parentId: legNode.id,
        label: `Ebene ${l + 1}`,
        kind: 'level',
        legId,
        depth: l + 2,
        members: m,
        shoppers: s,
        qgv: levelQgv,
        provisionEUR: provisionEUR * levelShareOfLeg,
        phase1EUR: (legNode.phase1EUR ?? 0) * levelShareOfLeg,
        phase2EUR: (legNode.phase2EUR ?? 0) * levelShareOfLeg,
        phase3EUR: (legNode.phase3EUR ?? 0) * levelShareOfLeg,
        color,
        children: [],
      });
    }

    root.children.push(legNode);
  });

  return root;
}

export function findNode(
  root: SunburstNode,
  predicate: (node: SunburstNode) => boolean,
): SunburstNode | undefined {
  if (predicate(root)) return root;
  for (const child of root.children) {
    const hit = findNode(child, predicate);
    if (hit) return hit;
  }
  return undefined;
}

export function findNodeById(
  root: SunburstNode,
  id: string,
): SunburstNode | undefined {
  return findNode(root, (n) => n.id === id);
}

export function findLeg(
  root: SunburstNode,
  legId: number,
): SunburstNode | undefined {
  return findNode(root, (n) => n.kind === 'leg' && n.legId === legId);
}

export function findLevel(
  root: SunburstNode,
  legId: number,
  level: number,
): SunburstNode | undefined {
  return findNode(
    root,
    (n) => n.kind === 'level' && n.legId === legId && n.depth === level + 1,
  );
}

/** Liefert den Pfad von Root bis zum Knoten mit der gegebenen ID, inkl. beider Endpunkte. */
export function getPath(root: SunburstNode, id: string): SunburstNode[] {
  const path: SunburstNode[] = [];
  function visit(node: SunburstNode): boolean {
    path.push(node);
    if (node.id === id) return true;
    for (const child of node.children) {
      if (visit(child)) return true;
    }
    path.pop();
    return false;
  }
  visit(root);
  return path;
}

function sumLeg(
  leg: MonthResult['legs'][number],
  memberVolume: number,
  shopperVolume: number,
): number {
  return (
    sumValues(leg.membersByLevel) * memberVolume +
    sumValues(leg.shoppersByLevel) * shopperVolume
  );
}

function sumValues(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function estimateAggregateRank(qgv: number, qualifiedLegs: number): string {
  if (qgv >= 15000 && qualifiedLegs >= 12) return 'Diamond';
  if (qgv >= 9000 && qualifiedLegs >= 9) return 'Gold';
  if (qgv >= 6000 && qualifiedLegs >= 6) return 'Silver';
  if (qgv >= 3000 && qualifiedLegs >= 3) return 'Bronze';
  if (qgv >= 1000) return 'Builder';
  if (qgv >= 300) return 'Believer';
  return 'Member';
}

// ---------------------------------------------------------------------------
// Person-Tree-basierte Builder (Iteration 4)
// ---------------------------------------------------------------------------

export interface BuildFromPersonsInput {
  snapshot: PersonTreeSnapshot;
  memberMonthlyVolume: number;
  shopperMonthlyVolume: number;
  compensation?: TreeCompensationResult;
  unitToCurrency?: number;
}

interface SubtreeStats {
  members: number;
  shoppers: number;
  qgv: number;
  maxDepth: number;
}

/** Aufsummiert Personen und QGV im gesamten Subtree (inkl. self, nur aktive). */
function subtreeStats(
  person: SimPerson,
  personsById: Map<string, SimPerson>,
  memberVolume: number,
  shopperVolume: number,
  rankByPersonId: Map<string, { av: number }> = new Map(),
): SubtreeStats {
  let members = 0;
  let shoppers = 0;
  let qgv = 0;
  let maxDepth = 0;

  const visit = (p: SimPerson, depth: number) => {
    if (p.active) {
      if (p.kind === 'member') {
        members += p.weight;
        qgv += p.weight * (rankByPersonId.get(p.id)?.av ?? memberVolume);
      } else if (p.kind === 'shopper') {
        shoppers += p.weight;
        qgv += p.weight * shopperVolume;
      }
      if (depth > maxDepth) maxDepth = depth;
    }
    for (const childId of p.childrenIds) {
    const child = personsById.get(childId);
      if (child) visit(child, depth + 1);
    }
  };

  visit(person, 0);
  return { members, shoppers, qgv, maxDepth };
}

export function buildSunburstTreeFromPersons({
  snapshot,
  memberMonthlyVolume,
  shopperMonthlyVolume,
  compensation,
  unitToCurrency = 1,
}: BuildFromPersonsInput): SunburstNode {
  const personsById = new Map(snapshot.persons.map((p) => [p.id, p]));
  const rootPerson = personsById.get(snapshot.rootId);
  const payoutByReceiverId = compensation
    ? buildPayoutMap(compensation, unitToCurrency)
    : new Map<string, PayoutTotals>();
  const rankByPersonId = new Map(
    compensation?.rankStates.map((state) => [state.personId, state]) ?? [],
  );

  if (!rootPerson) {
    return {
      id: 'root',
      parentId: null,
      label: 'Du',
      kind: 'root',
      legId: null,
      depth: 0,
      members: 0,
      shoppers: 0,
      qgv: 0,
      provisionEUR: 0,
      children: [],
    };
  }

  const rootStats = subtreeStats(
    rootPerson,
    personsById,
    memberMonthlyVolume,
    shopperMonthlyVolume,
    rankByPersonId,
  );

  // Direkte Member-Kinder = Beine. Shopper-Kinder werden im Sunburst (vorerst) nicht als eigene Wedges gerendert.
  const legPersons = rootPerson.childrenIds
    .map((id) => personsById.get(id))
    .filter((c): c is SimPerson => !!c && c.kind === 'member' && c.active);

  const root: SunburstNode = {
    id: 'root',
    parentId: null,
    label: 'Du',
    kind: 'root',
    legId: null,
    depth: 0,
    members: rootStats.members,
    shoppers: rootStats.shoppers,
    qgv: compensation?.qgv ?? Math.max(0, rootStats.qgv - rootPerson.personalMonthlyVolume * rootPerson.weight),
    provisionEUR: subtreePayout(rootPerson, personsById, payoutByReceiverId).total,
    phase1EUR: subtreePayout(rootPerson, personsById, payoutByReceiverId).phase1,
    phase2EUR: subtreePayout(rootPerson, personsById, payoutByReceiverId).phase2,
    phase3EUR: subtreePayout(rootPerson, personsById, payoutByReceiverId).phase3,
    rankName: rankByPersonId.get(rootPerson.id)?.rank.name,
    children: [],
  };

  legPersons.forEach((legPerson, index) => {
    const legId = index + 1;
    const color = colorForLegIndex(index);
    root.children.push(
      buildPersonSubtree(
        legPerson,
        personsById,
        legId,
        1,
        'leg',
        color,
        memberMonthlyVolume,
        shopperMonthlyVolume,
        'root',
        payoutByReceiverId,
        rankByPersonId,
      ),
    );
  });

  return root;
}

function buildPersonSubtree(
  person: SimPerson,
  personsById: Map<string, SimPerson>,
  legId: number,
  depth: number,
  kind: 'leg' | 'person',
  color: string,
  memberVolume: number,
  shopperVolume: number,
  parentId: string,
  payoutByReceiverId: Map<string, PayoutTotals>,
  rankByPersonId: Map<string, { rank: { name: string }; av: number }>,
): SunburstNode {
  const stats = subtreeStats(
    person,
    personsById,
    memberVolume,
    shopperVolume,
    rankByPersonId,
  );
  const payouts = subtreePayout(person, personsById, payoutByReceiverId);
  const rankState = rankByPersonId.get(person.id);
  const qualifiedLegs = person.childrenIds
    .map((id) => personsById.get(id))
    .filter(
      (c): c is SimPerson => !!c && c.kind === 'member' && c.active,
    ).length;
  const rankName = rankState?.rank.name ?? estimateAggregateRank(stats.qgv, qualifiedLegs);

  const node: SunburstNode = {
    id: person.id,
    parentId,
    label: person.id,
    kind,
    legId,
    depth,
    rankName,
    members: stats.members,
    shoppers: stats.shoppers,
    qgv: stats.qgv,
    provisionEUR: payouts.total,
    phase1EUR: payouts.phase1,
    phase2EUR: payouts.phase2,
    phase3EUR: payouts.phase3,
    status: person.active
      ? person.weight < 0.95
        ? 'under_qualified'
        : 'active'
      : 'inactive',
    ownIP: (rankState?.av ?? person.personalMonthlyVolume) * person.weight,
    color,
    children: [],
  };

  for (const childId of person.childrenIds) {
    const child = personsById.get(childId);
    if (!child || !child.active) continue;
    if (child.kind === 'member') {
      node.children.push(
        buildPersonSubtree(
          child,
          personsById,
          legId,
          depth + 1,
          'person',
          color,
          memberVolume,
          shopperVolume,
          person.id,
          payoutByReceiverId,
          rankByPersonId,
        ),
      );
    }
  }

  return node;
}

/** Liefert LegData je Bein, aggregiert pro Tiefe — gleiche Form wie buildLegs aus dem Aggregat-Pfad. */
export function buildLegsFromPersons({
  snapshot,
  memberMonthlyVolume,
  shopperMonthlyVolume,
  compensation,
  unitToCurrency = 1,
}: BuildFromPersonsInput): LegData[] {
  const personsById = new Map(snapshot.persons.map((p) => [p.id, p]));
  const rootPerson = personsById.get(snapshot.rootId);
  if (!rootPerson) return [];
  const payoutByReceiverId = compensation
    ? buildPayoutMap(compensation, unitToCurrency)
    : new Map<string, PayoutTotals>();
  const rankByPersonId = new Map(
    compensation?.rankStates.map((state) => [state.personId, state]) ?? [],
  );

  const legPersons = rootPerson.childrenIds
    .map((id) => personsById.get(id))
    .filter((c): c is SimPerson => !!c && c.kind === 'member' && c.active);

  // Gesamt-QGV der Beine fuer eur-Verteilung.
  const legStats = legPersons.map((p) =>
    subtreeStats(
      p,
      personsById,
      memberMonthlyVolume,
      shopperMonthlyVolume,
      rankByPersonId,
    ),
  );
  const totalLegQgv = Math.max(
    1,
    legStats.reduce((sum, s) => sum + s.qgv, 0),
  );
  const averageShare = 1 / Math.max(1, legPersons.length);

  return legPersons.map((legPerson, index) => {
    const stats = legStats[index];
    const payouts = subtreePayout(legPerson, personsById, payoutByReceiverId);
    const levels = levelsByDepth(
      legPerson,
      personsById,
      memberMonthlyVolume,
      shopperMonthlyVolume,
      payoutByReceiverId,
      rankByPersonId,
    );
    const qualifiedDirect = legPerson.childrenIds
      .map((id) => personsById.get(id))
      .filter((c): c is SimPerson => !!c && c.kind === 'member' && c.active).length;
    const rank =
      rankByPersonId.get(legPerson.id)?.rank.name ??
      estimateAggregateRank(stats.qgv, qualifiedDirect);
    const share = stats.qgv / totalLegQgv;
    const nodes = sumLevels(levels);

    const status: SunburstStatus = legPerson.active
      ? legPerson.weight < 0.95
        ? 'under_qualified'
        : 'active'
      : 'inactive';

    return {
      id: index + 1,
      label: `Bein ${index + 1}`,
      rank,
      nodes,
      members: stats.members,
      shoppers: stats.shoppers,
      qgv: stats.qgv,
      nodeId: legPerson.id,
      eur: payouts.total,
      activity: Math.max(8, Math.min(100, (share / averageShare) * 82)),
      status,
      color: colorForLegIndex(index),
      levels,
    };
  });
}

function levelsByDepth(
  legRoot: SimPerson,
  personsById: Map<string, SimPerson>,
  memberVolume: number,
  shopperVolume: number,
  payoutByReceiverId: Map<string, PayoutTotals> = new Map(),
  rankByPersonId: Map<string, { av: number }> = new Map(),
): LegLevelBreakdown[] {
  const levels: LegLevelBreakdown[] = [];

  const ensure = (level: number) => {
    while (levels.length <= level) {
      levels.push({ members: 0, shoppers: 0, total: 0, qgv: 0 });
    }
  };

  const visit = (p: SimPerson, depth: number) => {
    if (p.active && depth >= 0) {
      ensure(depth);
      const payouts = payoutByReceiverId.get(p.id);
      if (p.kind === 'member') {
        levels[depth].members += p.weight;
        levels[depth].qgv += p.weight * (rankByPersonId.get(p.id)?.av ?? memberVolume);
      } else if (p.kind === 'shopper') {
        levels[depth].shoppers += p.weight;
        levels[depth].qgv += p.weight * shopperVolume;
      }
      levels[depth].provisionEUR =
        (levels[depth].provisionEUR ?? 0) + (payouts?.total ?? 0);
      levels[depth].total = levels[depth].members + levels[depth].shoppers;
    }
    for (const childId of p.childrenIds) {
      const child = personsById.get(childId);
      if (child) visit(child, depth + 1);
    }
  };

  // legRoot selbst ist auf Tiefe 0 = "Ebene 1" im Bein.
  visit(legRoot, 0);
  return levels;
}

function sumLevels(levels: LegLevelBreakdown[]): number {
  return levels.reduce((total, level) => total + level.total, 0);
}

interface PayoutTotals {
  total: number;
  phase1: number;
  phase2: number;
  phase3: number;
}

function buildPayoutMap(
  compensation: TreeCompensationResult,
  unitToCurrency: number,
): Map<string, PayoutTotals> {
  const payouts = new Map<string, PayoutTotals>();

  for (const payout of compensation.payouts) {
    const current = payouts.get(payout.receiverId) ?? {
      total: 0,
      phase1: 0,
      phase2: 0,
      phase3: 0,
    };
    const amount = payout.amount * unitToCurrency;
    current.total += amount;
    if (payout.phase === 1) current.phase1 += amount;
    if (payout.phase === 2) current.phase2 += amount;
    if (payout.phase === 3) current.phase3 += amount;
    payouts.set(payout.receiverId, current);
  }

  return payouts;
}

function subtreePayout(
  person: SimPerson,
  personsById: Map<string, SimPerson>,
  payoutByReceiverId: Map<string, PayoutTotals>,
): PayoutTotals {
  const own = payoutByReceiverId.get(person.id) ?? {
    total: 0,
    phase1: 0,
    phase2: 0,
    phase3: 0,
  };
  const totals = { ...own };

  for (const childId of person.childrenIds) {
    const child = personsById.get(childId);
    if (!child || !child.active) continue;
    const childTotals = subtreePayout(child, personsById, payoutByReceiverId);
    totals.total += childTotals.total;
    totals.phase1 += childTotals.phase1;
    totals.phase2 += childTotals.phase2;
    totals.phase3 += childTotals.phase3;
  }

  return totals;
}

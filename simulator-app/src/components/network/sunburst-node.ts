import type {
  QuarterResult,
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
  /**
   * True fuer den virtuellen Eintrag "Eigene Shopper" — das ist kein echtes Bein,
   * sondern die Phase-1-Provision, die Root auf seine direkten Shopper kassiert
   * (Sponsor-L1-Anteil aus Shopper-Aggregat-Orders). Damit gilt
   * Hero == Sum(legs.eur), inklusive dieses Eintrags.
   */
  isOwnShoppers?: boolean;
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
  snapshot: QuarterResult;
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
  leg: QuarterResult['legs'][number],
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
        shoppers += p.shopperCount ?? 0;
        qgv +=
          (p.shopperCount ?? 0) *
          (p.shopperMonthlyVolume ?? shopperVolume);
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
  const rootPayoutsByOrderPerson = compensation && rootPerson
    ? buildPayoutsByOrderPersonFor(compensation, unitToCurrency, rootPerson.id)
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

  const rootPayouts = rootPayoutFromSubtree(
    rootPerson,
    personsById,
    rootPayoutsByOrderPerson,
  );
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
    provisionEUR: rootPayouts.total,
    phase1EUR: rootPayouts.phase1,
    phase2EUR: rootPayouts.phase2,
    phase3EUR: rootPayouts.phase3,
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
        rootPayoutsByOrderPerson,
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
  rootPayoutsByOrderPerson: Map<string, PayoutTotals>,
  rankByPersonId: Map<string, { rank: { name: string }; av: number }>,
): SunburstNode {
  const stats = subtreeStats(
    person,
    personsById,
    memberVolume,
    shopperVolume,
    rankByPersonId,
  );
  // provisionEUR pro Knoten = Anteil dieses Subtrees an Root's Gesamt-Provision.
  // Summe ueber alle direkten Beine == Root-Provision (Hero-Zahl).
  const payouts = rootPayoutFromSubtree(person, personsById, rootPayoutsByOrderPerson);
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
          rootPayoutsByOrderPerson,
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
  const rootPayoutsByOrderPerson = compensation
    ? buildPayoutsByOrderPersonFor(compensation, unitToCurrency, rootPerson.id)
    : new Map<string, PayoutTotals>();
  const rankByPersonId = new Map(
    compensation?.rankStates.map((state) => [state.personId, state]) ?? [],
  );

  const legPersons = rootPerson.childrenIds
    .map((id) => personsById.get(id))
    .filter((c): c is SimPerson => !!c && c.kind === 'member' && c.active);

  // Robuste Bein-Zuordnung: pro Person den root-direkten Vorfahren ermitteln.
  // Damit lassen sich ALLE Payouts an Root exakt einem Bein zuordnen, auch
  // wenn die Subtree-Traversierung von einem Bein aus Knoten verfehlen wuerde
  // (z.B. wegen inaktiver Zwischenknoten oder Reattachment-Eigenheiten).
  const legAncestor = buildLegAncestorMap(personsById, rootPerson);
  const payoutsByLegId = new Map<string, PayoutTotals>();
  // Payouts mit orderPersonId=root entstehen aus Root's direkten
  // Shopper-Aggregaten: getShopperAggregateUplinePath stellt den Sponsor an L1,
  // d.h. Root kassiert 25 % L1 auf seine eigenen Shopper. Diese Provision
  // gehoert keinem Bein, sondern Root selbst — wird als virtueller Eintrag
  // "Eigene Shopper" ausgewiesen, damit Hero == Sum(legs.eur) bleibt.
  let ownShopperPayouts: PayoutTotals = { total: 0, phase1: 0, phase2: 0, phase3: 0 };
  for (const [orderPersonId, totals] of rootPayoutsByOrderPerson) {
    if (orderPersonId === rootPerson.id) {
      ownShopperPayouts = {
        total: ownShopperPayouts.total + totals.total,
        phase1: ownShopperPayouts.phase1 + totals.phase1,
        phase2: ownShopperPayouts.phase2 + totals.phase2,
        phase3: ownShopperPayouts.phase3 + totals.phase3,
      };
      continue;
    }
    const legId = legAncestor.get(orderPersonId);
    if (!legId) continue;
    const current = payoutsByLegId.get(legId) ?? {
      total: 0,
      phase1: 0,
      phase2: 0,
      phase3: 0,
    };
    current.total += totals.total;
    current.phase1 += totals.phase1;
    current.phase2 += totals.phase2;
    current.phase3 += totals.phase3;
    payoutsByLegId.set(legId, current);
  }

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

  const legs: LegData[] = legPersons.map((legPerson, index) => {
    const stats = legStats[index];
    const payouts = payoutsByLegId.get(legPerson.id) ?? {
      total: 0,
      phase1: 0,
      phase2: 0,
      phase3: 0,
    };
    const levels = levelsByDepth(
      legPerson,
      personsById,
      memberMonthlyVolume,
      shopperMonthlyVolume,
      rootPayoutsByOrderPerson,
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

  // Virtueller Eintrag fuer Root's eigene Shopper-Provision (Sponsor-L1
  // auf Root's direkte Shopper-Aggregate). Wird als "kurzes Bein" mit nur
  // einer Ebene (E1) gerendert, damit es visuell zu den echten Beinen passt.
  const ownShopperCount = rootPerson.shopperCount ?? 0;
  const ownShopperVolume = ownShopperCount * (rootPerson.shopperMonthlyVolume ?? shopperMonthlyVolume);
  if (ownShopperPayouts.total > 0.5) {
    legs.push({
      id: legs.length + 1,
      label: 'Eigene Shopper',
      rank: '—',
      nodes: ownShopperCount,
      members: 0,
      shoppers: ownShopperCount,
      qgv: ownShopperVolume,
      nodeId: rootPerson.id,
      eur: ownShopperPayouts.total,
      activity: Math.max(8, Math.min(100, (ownShopperVolume / Math.max(1, totalLegQgv)) * averageShare * 82)),
      status: 'active',
      color: '#0ea5e9',
      levels: [
        {
          members: 0,
          shoppers: ownShopperCount,
          total: ownShopperCount,
          qgv: ownShopperVolume,
          provisionEUR: ownShopperPayouts.total,
        },
      ],
      isOwnShoppers: true,
    });
  }

  return legs;
}

function levelsByDepth(
  legRoot: SimPerson,
  personsById: Map<string, SimPerson>,
  memberVolume: number,
  shopperVolume: number,
  rootPayoutsByOrderPerson: Map<string, PayoutTotals> = new Map(),
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
      // Root-Anteil aus den Orders genau dieser Person (= dieser Ebene des Beins).
      const payouts = rootPayoutsByOrderPerson.get(p.id);
      if (p.kind === 'member') {
        levels[depth].members += p.weight;
        levels[depth].qgv += p.weight * (rankByPersonId.get(p.id)?.av ?? memberVolume);
        const shopperCount = p.shopperCount ?? 0;
        if (shopperCount > 0) {
          ensure(depth + 1);
          levels[depth + 1].shoppers += shopperCount;
          levels[depth + 1].qgv +=
            shopperCount * (p.shopperMonthlyVolume ?? shopperVolume);
          levels[depth + 1].total =
            levels[depth + 1].members + levels[depth + 1].shoppers;
        }
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

/**
 * Gruppiert die Payouts nach Order-Person, gefiltert auf Auszahlungen an den
 * angegebenen Empfaenger (i.d.R. Root). Damit laesst sich pro Subtree
 * fragen: "Wie viel zahlt das Volumen aus diesem Subtree an Root aus?"
 */
function buildPayoutsByOrderPersonFor(
  compensation: TreeCompensationResult,
  unitToCurrency: number,
  receiverId: string,
): Map<string, PayoutTotals> {
  const payouts = new Map<string, PayoutTotals>();

  for (const payout of compensation.payouts) {
    if (payout.receiverId !== receiverId) continue;
    const current = payouts.get(payout.orderPersonId) ?? {
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
    payouts.set(payout.orderPersonId, current);
  }

  return payouts;
}

/**
 * Summiert alle Auszahlungen an Root, deren Order-Verursacher im Subtree
 * der gegebenen Person liegt. Bedeutung: "Anteil dieses Subtrees an
 * Root's Provision".
 *
 * Traversiert auch durch inaktive Knoten — children koennten aktiv sein
 * (z.B. wenn Reattachment unvollstaendig war oder ein Snapshot vor dem
 * Reattachment-Aufraeumen liegt). Inaktive Knoten tragen selbst keine
 * payouts bei (keine Orders), schliessen aber den Pfad nicht ab.
 *
 * Ein `visited`-Set schuetzt vor doppelter Buchung, falls Reattachment
 * dieselbe Person mehrfach in childrenIds eingetragen hat.
 */
function rootPayoutFromSubtree(
  person: SimPerson,
  personsById: Map<string, SimPerson>,
  rootPayoutsByOrderPerson: Map<string, PayoutTotals>,
): PayoutTotals {
  const totals: PayoutTotals = { total: 0, phase1: 0, phase2: 0, phase3: 0 };
  const visited = new Set<string>();

  const visit = (p: SimPerson) => {
    if (visited.has(p.id)) return;
    visited.add(p.id);
    if (p.active) {
      const own = rootPayoutsByOrderPerson.get(p.id);
      if (own) {
        totals.total += own.total;
        totals.phase1 += own.phase1;
        totals.phase2 += own.phase2;
        totals.phase3 += own.phase3;
      }
    }
    for (const childId of p.childrenIds) {
      const child = personsById.get(childId);
      if (child) visit(child);
    }
  };

  visit(person);
  return totals;
}

/**
 * Liefert fuer jede Person im Snapshot die ID ihres root-direkten Member-
 * Vorfahren (Bein-Wurzel). Personen, deren Pfad nicht zu einem root-direkten
 * Member fuehrt (z.B. Root selbst, Root-direkte Shopper-Aggregate), bekommen
 * keinen Eintrag. Mit dieser Map laesst sich Root's Provision exakt auf die
 * Beine verteilen: Summe ueber alle Beine == compensation.totalEUR
 * minus Root-eigene Beitraege (die per Konstruktion keine Payouts erzeugen).
 */
function buildLegAncestorMap(
  personsById: Map<string, SimPerson>,
  rootPerson: SimPerson,
): Map<string, string> {
  const map = new Map<string, string>();

  for (const childId of rootPerson.childrenIds) {
    const child = personsById.get(childId);
    if (!child || child.kind !== 'member') continue;
    const legId = child.id;

    const visit = (p: SimPerson) => {
      if (map.has(p.id)) return;
      map.set(p.id, legId);
      for (const ccId of p.childrenIds) {
        const cc = personsById.get(ccId);
        if (cc) visit(cc);
      }
    };
    visit(child);
  }

  return map;
}

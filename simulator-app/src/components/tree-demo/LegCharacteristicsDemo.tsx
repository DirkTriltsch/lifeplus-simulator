import type {
  PersonTreeSnapshot,
  SimPerson,
  TreeCompensationResult,
} from '@mlm/simulator-core';

interface Props {
  snapshot: PersonTreeSnapshot;
  compensation: TreeCompensationResult;
}

interface LegStats {
  count: number;
  maxDepth: number;
  ranks: Map<string, number>;
}

export function LegCharacteristicsDemo({ snapshot, compensation }: Props) {
  const root = snapshot.persons.find((p) => p.id === snapshot.rootId);
  if (!root) return null;

  const personsById = new Map(snapshot.persons.map((p) => [p.id, p]));
  const rankByPersonId = new Map(
    compensation.rankStates.map((rs) => [rs.personId, rs.rank.name]),
  );

  const legChildren = root.childrenIds
    .map((id) => personsById.get(id))
    .filter((c): c is SimPerson => !!c && c.kind === 'member' && c.active);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-gray-950">
        4. Bein-Charakteristik
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Pro Wurzelkind: aktive Knoten, maximale Tiefe, Rangverteilung im
        gesamten Subtree.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {legChildren.map((leg) => {
          const stats = collectStats(leg, personsById, rankByPersonId);
          const rootRank = rankByPersonId.get(leg.id) ?? 'Member';
          const sortedRanks = [...stats.ranks.entries()].sort(
            (a, b) => b[1] - a[1],
          );

          return (
            <div
              key={leg.id}
              className="rounded-md border border-gray-200 bg-gray-50 p-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-mono text-sm font-semibold text-gray-950">
                  {leg.id}
                </p>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-700">
                  {rootRank}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <Stat label="Aktive Knoten" value={stats.count} />
                <Stat label="Max. Tiefe" value={stats.maxDepth + 1} />
              </div>
              {sortedRanks.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Rang-Verteilung
                  </p>
                  <div className="mt-1 space-y-0.5 text-xs">
                    {sortedRanks.map(([rank, count]) => (
                      <div
                        key={rank}
                        className="flex items-center justify-between"
                      >
                        <span className="text-gray-700">{rank}</span>
                        <span className="font-mono text-gray-500">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-white px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-950">{value}</p>
    </div>
  );
}

function collectStats(
  start: SimPerson,
  personsById: Map<string, SimPerson>,
  rankByPersonId: Map<string, string>,
): LegStats {
  const stats: LegStats = { count: 0, maxDepth: 0, ranks: new Map() };

  function visit(p: SimPerson, depth: number) {
    if (p.active) {
      stats.count += 1;
      stats.maxDepth = Math.max(stats.maxDepth, depth);
      const rank = rankByPersonId.get(p.id) ?? (p.kind === 'shopper' ? 'Shopper' : 'Member');
      stats.ranks.set(rank, (stats.ranks.get(rank) ?? 0) + 1);
    }
    for (const childId of p.childrenIds) {
      const child = personsById.get(childId);
      if (child) visit(child, depth + 1);
    }
  }

  visit(start, 0);
  return stats;
}

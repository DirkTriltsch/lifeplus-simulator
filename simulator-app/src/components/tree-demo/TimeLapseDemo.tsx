import { useMemo, useState } from 'react';
import type { PersonTreeSnapshot } from '@mlm/simulator-core';

interface Props {
  snapshots: PersonTreeSnapshot[];
}

interface SeriesPoint {
  month: number;
  activeMembers: number;
  inactiveMembers: number;
  activeShoppers: number;
}

export function TimeLapseDemo({ snapshots }: Props) {
  const [month, setMonth] = useState(snapshots.length - 1);

  const series = useMemo<SeriesPoint[]>(
    () =>
      snapshots.map((snap, i) => ({
        month: i,
        activeMembers: snap.persons.filter(
          (p) => p.active && p.kind === 'member',
        ).length,
        inactiveMembers: snap.persons.filter(
          (p) => !p.active && p.kind === 'member',
        ).length,
        activeShoppers: snap.persons.filter(
          (p) => p.active && p.kind === 'shopper',
        ).length,
      })),
    [snapshots],
  );

  const trackedIds = useMemo(() => {
    const last = snapshots[snapshots.length - 1];
    if (!last) return [];
    return last.persons
      .filter((p) => p.kind === 'member' && p.sponsorId === last.rootId)
      .map((p) => p.id)
      .slice(0, 6);
  }, [snapshots]);

  const trackedStatus = useMemo(() => {
    return trackedIds.map((id) => {
      const points = snapshots.map((snap) => {
        const person = snap.persons.find((p) => p.id === id);
        if (!person) return 'absent' as const;
        if (!person.active) return 'inactive' as const;
        if (person.weight < 0.95) return 'reduced' as const;
        return 'active' as const;
      });
      return { id, points };
    });
  }, [snapshots, trackedIds]);

  const current = snapshots[month];
  const maxY = Math.max(
    1,
    ...series.map((s) => s.activeMembers + s.inactiveMembers),
  );
  const width = Math.max(snapshots.length * 4, 240);
  const height = 80;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-gray-950">
        5. Time-Lapse mit persistenter Identitaet
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Personen-IDs bleiben ueber alle Monate stabil. Du siehst, wann genau
        eine Person ausfaellt - nicht nur, dass ein Aggregat schrumpft.
      </p>

      <div className="mt-4">
        <input
          type="range"
          min={0}
          max={snapshots.length - 1}
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="w-full accent-brand-600"
        />
        <p className="mt-1 text-xs text-gray-600">
          Monat {month + 1} / {snapshots.length}: aktive Members{' '}
          <strong>{series[month].activeMembers}</strong>, Shopper{' '}
          <strong>{series[month].activeShoppers}</strong>, inaktive Members{' '}
          <strong>{series[month].inactiveMembers}</strong>
        </p>
      </div>

      <div className="mt-3 overflow-x-auto">
        <svg width={width} height={height} className="block">
          {series.map((s, i) => {
            const totalH = ((s.activeMembers + s.inactiveMembers) / maxY) * (height - 4);
            const activeH = (s.activeMembers / maxY) * (height - 4);
            return (
              <g key={i}>
                <rect
                  x={i * 4}
                  y={height - totalH}
                  width={3}
                  height={totalH - activeH}
                  fill="#d1d5db"
                />
                <rect
                  x={i * 4}
                  y={height - activeH}
                  width={3}
                  height={activeH}
                  fill="#10b981"
                />
              </g>
            );
          })}
          <line
            x1={month * 4 + 1.5}
            y1={0}
            x2={month * 4 + 1.5}
            y2={height}
            stroke="#0d9488"
            strokeWidth={1}
          />
        </svg>
        <p className="mt-1 text-[11px] text-gray-500">
          Gruen = aktive Members, grau = inaktiv. Vertikale Linie = aktueller
          Monat.
        </p>
      </div>

      {trackedStatus.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-700">
            Verlauf einzelner Personen (erste Wurzelkinder):
          </p>
          <div className="mt-2 space-y-1.5">
            {trackedStatus.map(({ id, points }) => (
              <div key={id} className="flex items-center gap-2">
                <span className="w-12 shrink-0 font-mono text-[10px] text-gray-500">
                  {id}
                </span>
                <div className="flex h-3 grow gap-px">
                  {points.map((status, i) => {
                    const color =
                      status === 'active'
                        ? 'bg-emerald-500'
                        : status === 'reduced'
                          ? 'bg-amber-400'
                          : status === 'inactive'
                            ? 'bg-gray-400'
                            : 'bg-gray-100';
                    return (
                      <div
                        key={i}
                        className={`flex-1 ${color} ${i === month ? 'ring-1 ring-brand-700' : ''}`}
                        title={`Monat ${i + 1}: ${status}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-gray-500">
            Pro Person eine Zeile: gruen = aktiv, gelb = reduziert, grau =
            inaktiv, hellgrau = noch nicht da.
          </p>
        </div>
      )}

      <p className="mt-3 text-[11px] text-gray-500">
        Snapshot-Detail bei Monat {month + 1}: {current.persons.length}{' '}
        Personen-IDs im Modell (inkl. inaktive).
      </p>
    </section>
  );
}

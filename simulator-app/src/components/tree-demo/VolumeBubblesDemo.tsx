import type { PersonTreeSnapshot } from '@mlm/simulator-core';

interface Props {
  snapshot: PersonTreeSnapshot;
}

export function VolumeBubblesDemo({ snapshot }: Props) {
  const persons = snapshot.persons.filter(
    (p) => p.active && p.kind !== 'root',
  );
  const volumes = persons.map((p) => p.personalMonthlyVolume * p.weight);
  const maxVolume = Math.max(1, ...volumes);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-gray-950">
        3. Volumen als Bubble-Groesse
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Radius proportional zu{' '}
        <code className="rounded bg-gray-100 px-1">
          personalMonthlyVolume x weight
        </code>
        . Members teal, Shopper grau.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        {persons.map((p) => {
          const v = p.personalMonthlyVolume * p.weight;
          const r = 6 + (v / maxVolume) * 22;
          const size = r * 2 + 4;
          const isShopper = p.kind === 'shopper';
          const fill = isShopper ? '#6b7280' : '#0d9488';
          return (
            <div
              key={p.id}
              className="flex flex-col items-center"
              title={`${p.id}: ${v.toFixed(1)} IP/Monat`}
            >
              <svg width={size} height={size}>
                <circle
                  cx={r + 2}
                  cy={r + 2}
                  r={r}
                  fill={fill}
                  fillOpacity={0.55}
                  stroke={fill}
                  strokeWidth={1.4}
                />
              </svg>
              <span className="mt-0.5 font-mono text-[10px] text-gray-500">
                {p.id}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

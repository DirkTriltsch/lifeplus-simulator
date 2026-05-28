import type { PersonTreeSnapshot, SimPerson } from '@mlm/simulator-core';

interface Props {
  snapshot: PersonTreeSnapshot;
}

type Status = 'active' | 'reduced' | 'inactive';

function statusOf(p: SimPerson): Status {
  if (!p.active) return 'inactive';
  if (p.weight < 0.95) return 'reduced';
  return 'active';
}

const STATUS_LABEL: Record<Status, string> = {
  active: 'aktiv',
  reduced: 'teilweise abgefallen',
  inactive: 'inaktiv',
};

const STATUS_BG: Record<Status, string> = {
  active: 'bg-emerald-500',
  reduced: 'bg-amber-400',
  inactive: 'bg-gray-300',
};

const SUMMARY_TILE: Record<Status, string> = {
  active: 'bg-emerald-50 text-emerald-800',
  reduced: 'bg-amber-50 text-amber-800',
  inactive: 'bg-gray-100 text-gray-600',
};

export function ActivityAmpelDemo({ snapshot }: Props) {
  const persons = snapshot.persons.filter((p) => p.kind !== 'root');

  const counts = persons.reduce<Record<Status, number>>(
    (acc, p) => {
      acc[statusOf(p)] += 1;
      return acc;
    },
    { active: 0, reduced: 0, inactive: 0 },
  );

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-gray-950">
        2. Per-Person-Aktivitaetsstatus
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Ampel pro Person aus <code className="rounded bg-gray-100 px-1">SimPerson.active</code>{' '}
        + Gewicht. Reduzierte sind durch Fluktuation geschwaecht aber noch im
        Netzwerk.
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {(['active', 'reduced', 'inactive'] as Status[]).map((s) => (
          <div key={s} className={`rounded-md p-3 ${SUMMARY_TILE[s]}`}>
            <p className="text-[11px] uppercase tracking-wide">
              {STATUS_LABEL[s]}
            </p>
            <p className="mt-0.5 text-xl font-semibold">{counts[s]}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-10 gap-1 sm:grid-cols-16">
        {persons.map((p) => {
          const s = statusOf(p);
          return (
            <div
              key={p.id}
              title={`${p.id} · ${p.kind} · weight=${p.weight.toFixed(2)} · ${STATUS_LABEL[s]}`}
              className={`h-6 rounded ${STATUS_BG[s]}`}
            />
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-gray-500">
        Hover ueber eine Kachel zeigt ID, Gewicht und Status.
      </p>
    </section>
  );
}

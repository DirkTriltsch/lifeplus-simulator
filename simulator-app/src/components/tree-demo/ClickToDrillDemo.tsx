import { useState } from 'react';
import {
  getUplinePath,
  type PersonTreeSnapshot,
} from '@mlm/simulator-core';

interface Props {
  snapshot: PersonTreeSnapshot;
}

export function ClickToDrillDemo({ snapshot }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const persons = snapshot.persons.filter((p) => p.kind !== 'root');
  const selected = selectedId
    ? snapshot.persons.find((p) => p.id === selectedId)
    : null;
  const upline = selected ? getUplinePath(snapshot, selected.id) : [];

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-gray-950">
        1. Click-to-drill (echte Upline)
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Tippe eine Person an — die Upline-Kette via{' '}
        <code className="rounded bg-gray-100 px-1">getUplinePath()</code>{' '}
        erscheint rechts. Mode A im Lineage-Editor wuerde diese Liste 1:1
        uebernehmen.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="grid max-h-72 grid-cols-3 gap-2 overflow-auto sm:grid-cols-4">
          {persons.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`rounded-md border p-2 text-left text-xs transition ${
                p.id === selectedId
                  ? 'border-brand-500 bg-brand-50'
                  : p.active
                    ? 'border-gray-200 bg-white hover:border-brand-300'
                    : 'border-gray-200 bg-gray-50 text-gray-400'
              }`}
            >
              <p className="font-mono font-semibold">{p.id}</p>
              <p className="mt-0.5 text-[10px]">
                {p.kind} · w={p.weight.toFixed(2)}
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          {selected ? (
            <div className="space-y-2 text-sm">
              <p className="font-semibold">
                Upline von <span className="font-mono">{selected.id}</span>:
              </p>
              {upline.length === 0 ? (
                <p className="text-xs text-gray-500">
                  (direkt unter Root, keine Upline-Members)
                </p>
              ) : (
                <ol className="space-y-1 text-xs">
                  {upline.map((p, i) => (
                    <li
                      key={p.id}
                      className="rounded bg-white px-2 py-1 font-mono"
                    >
                      L{i + 1}: {p.id}{' '}
                      <span className="text-gray-500">({p.kind})</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              Person links auswaehlen, um die Upline zu sehen.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

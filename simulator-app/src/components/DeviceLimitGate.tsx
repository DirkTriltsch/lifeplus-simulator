import { useEffect, useState } from 'react';
import { listDevices, revokeDevice, type DeviceItem } from '../auth/api';
import { useAuth } from '../auth/useAuth';

export function DeviceLimitGate(): JSX.Element {
  const { refresh } = useAuth();
  const [devices, setDevices] = useState<DeviceItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    listDevices()
      .then((r) => setDevices(r.devices))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const onRevoke = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await revokeDevice(id);
      if (res.promoted) {
        await refresh();
        return;
      }
      // Refresh local list.
      const list = await listDevices();
      setDevices(list.devices);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">
          Geraete-Limit erreicht
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          Du nutzt deinen Zugang bereits auf der maximalen Anzahl von Geraeten.
          Melde ein Geraet ab, um dieses hier zu verwenden.
        </p>

        {!devices && !error && (
          <p className="text-sm text-gray-500">Lade Geraete...</p>
        )}
        {error && (
          <p className="text-sm text-red-600">Fehler: {error}</p>
        )}

        <ul className="divide-y divide-gray-200">
          {devices?.map((d) => (
            <li key={d.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{d.label}</p>
                <p className="text-xs text-gray-500">
                  zuletzt aktiv: {formatLastSeen(d.lastSeenAt)}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === d.id || d.isCurrent}
                onClick={() => onRevoke(d.id)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {d.isCurrent ? 'Dieses Geraet' : 'Abmelden'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function formatLastSeen(ts: number): string {
  const diffMs = Date.now() - ts;
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  return `vor ${days} Tagen`;
}

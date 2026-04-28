import { useState } from 'react';

interface SettingsDrawerProps {
  ipToEur: number;
  onIpToEurChange: (v: number) => void;
}

export function SettingsDrawer({
  ipToEur,
  onIpToEurChange,
}: SettingsDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Einstellungen"
        className="text-gray-500 hover:text-gray-900 transition p-2 rounded-md hover:bg-gray-100"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium">Einstellungen</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Schließen"
                className="text-gray-500 p-1"
              >
                ✕
              </button>
            </div>

            <div className="mb-5">
              <label className="block text-sm text-gray-700 mb-1">
                Umrechnung IP → Euro
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">1 IP =</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={ipToEur}
                  onChange={(e) => onIpToEurChange(Number(e.target.value) || 0)}
                  className="border border-gray-300 rounded-md px-2 py-1 w-24 text-sm"
                />
                <span className="text-sm text-gray-600">€</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Wenn du den genauen LifePlus-Faktor kennst, hier eintragen.
                Default: 1 IP = 1 €.
              </p>
            </div>

            <div className="mb-2">
              <h3 className="text-sm font-medium mb-2">Modell-Annahmen</h3>
              <ul className="text-xs text-gray-600 space-y-1.5 leading-relaxed">
                <li>
                  • Members duplizieren mit gleicher Rate (über Slider
                  einstellbar)
                </li>
                <li>• Shopper sponsern niemanden</li>
                <li>• Symmetrisches Wachstum: alle Beine gleich aktiv</li>
                <li>• Keine Saisonalität</li>
                <li>• Brutto-Provision (vor Steuern und Abgaben)</li>
                <li>
                  • Phase 2/3 vereinfacht: volle Quote des eigenen Rangs auf
                  Volumen ab Ebene 4
                </li>
              </ul>
              <p className="text-xs text-gray-500 mt-3 italic">
                Die Zahlen sind eine Schätzung auf Basis der Eingaben — keine
                Garantie für tatsächliche Provisionen.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

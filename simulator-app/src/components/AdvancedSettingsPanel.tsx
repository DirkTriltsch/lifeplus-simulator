export type RealityStrategy =
  | 'standard'
  | 'dirichlet'
  | 'momentum'
  | 'lifecycle';

const STRATEGY_OPTIONS: { value: RealityStrategy; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'dirichlet', label: 'Zufallsverteilung' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'lifecycle', label: 'Persoenlichkeitsprofile (bald)' },
];

interface AdvancedSettingsPanelProps {
  open: boolean;
  onToggle: () => void;
  maxDirectMembersPerMember: number;
  onMaxDirectChange: (v: number) => void;
  monthlyProductCostEUR: number;
  onMonthlyProductCostChange: (v: number) => void;
  realityStrategy: RealityStrategy;
  onRealityStrategyChange: (s: RealityStrategy) => void;
  onResetAll: () => void;
}

export function AdvancedSettingsPanel({
  open,
  onToggle,
  maxDirectMembersPerMember,
  onMaxDirectChange,
  monthlyProductCostEUR,
  onMonthlyProductCostChange,
  realityStrategy,
  onRealityStrategyChange,
  onResetAll,
}: AdvancedSettingsPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 sm:px-6 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-gray-700">
          Erweiterte Einstellungen
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-5 border-t border-gray-100 pt-4">
          <div className="mb-4 flex justify-end">
            <button
              onClick={onResetAll}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              Zuruecksetzen
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Max. Members je Sponsor
              </label>
              <input
                type="number"
                min={1}
                value={maxDirectMembersPerMember}
                onChange={(e) =>
                  onMaxDirectChange(Math.max(1, Number(e.target.value) || 1))
                }
                className="border border-gray-300 rounded-md px-2 py-1 text-sm w-full sm:w-24"
              />
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                Wie viele direkte Members ein Member maximal betreut.
              </p>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Eigenkonsum / Monat
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  value={monthlyProductCostEUR}
                  onChange={(e) =>
                    onMonthlyProductCostChange(
                      Math.max(0, Number(e.target.value) || 0),
                    )
                  }
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm w-full sm:w-24"
                />
                <span className="text-xs text-gray-500">EUR</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                Basis fuer Refinanzierung und Ueberschuss.
              </p>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Reality Simulation
              </label>
              <select
                value={realityStrategy}
                onChange={(e) =>
                  onRealityStrategyChange(e.target.value as RealityStrategy)
                }
                className="border border-gray-300 rounded-md px-2 py-1 text-sm w-full bg-white"
              >
                {STRATEGY_OPTIONS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.value === 'lifecycle'}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                Verteilung des Wachstums auf die Beine.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

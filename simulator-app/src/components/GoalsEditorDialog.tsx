import type { Goal, GoalKind } from '@mlm/simulator-goals';
import { GoalIcon, type GoalIconName } from './GoalIcon';

export type GoalUnit = 'EUR/Monat' | 'EUR/Jahr';

export type GoalUI = Goal & { icon: GoalIconName };

export function unitForKind(kind: GoalKind): GoalUnit {
  return kind === 'yearlySurplus' ? 'EUR/Jahr' : 'EUR/Monat';
}

interface GoalsEditorDialogProps {
  open: boolean;
  goals: GoalUI[];
  onChange: (goals: GoalUI[]) => void;
  onClose: () => void;
}

const ICON_OPTIONS: { value: GoalIconName; label: string }[] = [
  { value: 'leaf', label: 'Blatt' },
  { value: 'plane', label: 'Flugzeug' },
  { value: 'car', label: 'Auto' },
  { value: 'home', label: 'Haus' },
  { value: 'crown', label: 'Krone' },
];

export function GoalsEditorDialog({
  open,
  goals,
  onChange,
  onClose,
}: GoalsEditorDialogProps) {
  if (!open) return null;

  const updateGoal = (index: number, patch: Partial<GoalUI>) => {
    const next = goals.map((g, i) => (i === index ? { ...g, ...patch } : g));
    onChange(next);
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium">Ziele-Leiter bearbeiten</h2>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="text-gray-500 p-1"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2.5">
          {goals.map((goal, index) => (
            <div
              key={goal.id}
              className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_auto_1fr_auto_auto] items-center gap-2 sm:gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-2 sm:border-0 sm:bg-transparent sm:p-0"
            >
              <span className="text-brand-700">
                <GoalIcon name={goal.icon} size={18} />
              </span>

              <select
                value={goal.icon}
                onChange={(e) =>
                  updateGoal(index, { icon: e.target.value as GoalIconName })
                }
                className="border border-gray-300 rounded-md px-1.5 py-1 text-sm bg-white"
                aria-label="Symbol"
              >
                {ICON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={goal.label}
                onChange={(e) => updateGoal(index, { label: e.target.value })}
                className="col-span-2 sm:col-span-1 border border-gray-300 rounded-md px-2 py-1 text-sm w-full"
                aria-label="Ziel-Name"
              />

              <div className="col-span-2 sm:col-span-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:contents">
                <input
                  type="number"
                  value={goal.kind === 'productsRefinanced' ? '' : goal.amountEUR}
                  disabled={goal.kind === 'productsRefinanced'}
                  placeholder={goal.kind === 'productsRefinanced' ? 'Eigenkonsum' : undefined}
                  onChange={(e) => {
                    if (goal.kind === 'productsRefinanced') return;
                    updateGoal(index, { amountEUR: Number(e.target.value) || 0 });
                  }}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm w-full sm:w-24 text-right"
                  aria-label="Wert"
                />

                <span className="text-xs text-gray-500 whitespace-nowrap px-1 py-1">
                  {unitForKind(goal.kind)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-4 italic">
          Wert 0 oder leer blendet das Ziel aus. Das Refinanzierungsziel nutzt
          den Eigenkonsum aus den erweiterten Einstellungen.
        </p>
      </div>
    </div>
  );
}

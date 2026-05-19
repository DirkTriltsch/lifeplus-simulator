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
  defaultGoals: GoalUI[];
  onClose: () => void;
}

const ICON_OPTIONS: { value: GoalIconName; label: string }[] = [
  { value: 'leaf', label: 'Blatt' },
  { value: 'plane', label: 'Flugzeug' },
  { value: 'car', label: 'Auto' },
  { value: 'home', label: 'Haus' },
  { value: 'crown', label: 'Krone' },
];

const GOAL_KIND_OPTIONS: { value: GoalKind; label: string }[] = [
  { value: 'monthlySurplus', label: 'Ueberschuss / Monat' },
  { value: 'monthlyIncome', label: 'Provision / Monat' },
  { value: 'yearlySurplus', label: 'Ueberschuss / Jahr' },
];

export function GoalsEditorDialog({
  open,
  goals,
  onChange,
  defaultGoals,
  onClose,
}: GoalsEditorDialogProps) {
  if (!open) return null;

  const updateGoal = (index: number, patch: Partial<GoalUI>) => {
    const next = goals.map((g, i) => (i === index ? { ...g, ...patch } : g));
    onChange(next);
  };

  const addGoal = () => {
    onChange([
      ...goals,
      {
        id: `custom-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        label: 'Neues Ziel',
        icon: 'crown',
        kind: 'monthlySurplus',
        amountEUR: 1000,
        requiresRefinanced: true,
      },
    ]);
  };

  const removeGoal = (index: number) => {
    onChange(goals.filter((_, i) => i !== index));
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-base font-medium">Ziele-Leiter bearbeiten</h2>
          <button
            onClick={onClose}
            aria-label="Schliessen"
            className="text-gray-500 p-1 text-lg leading-none rounded-md hover:bg-gray-100"
          >
            x
          </button>
        </div>

        <div className="space-y-3">
          {goals.map((goal, index) => {
            const systemGoal = goal.kind === 'productsRefinanced';

            return (
              <div
                key={goal.id}
                className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_auto_minmax(0,1fr)_180px_110px_auto] items-center gap-2 sm:gap-3 rounded-lg border border-gray-100 bg-gray-50/70 p-2"
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
                  className="col-span-3 sm:col-span-1 border border-gray-300 rounded-md px-2 py-1 text-sm w-full"
                  aria-label="Ziel-Name"
                />

                <select
                  value={goal.kind}
                  disabled={systemGoal}
                  onChange={(e) =>
                    updateGoal(index, { kind: e.target.value as GoalKind })
                  }
                  className="col-span-2 sm:col-span-1 border border-gray-300 rounded-md px-2 py-1 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500"
                  aria-label="Zieltyp"
                >
                  {systemGoal && (
                    <option value="productsRefinanced">
                      Produkte refinanziert
                    </option>
                  )}
                  {GOAL_KIND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <div className="col-span-1 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <input
                    type="number"
                    min={0}
                    value={systemGoal ? '' : goal.amountEUR}
                    disabled={systemGoal}
                    placeholder={systemGoal ? 'Eigenkonsum' : undefined}
                    onChange={(e) => {
                      if (systemGoal) return;
                      updateGoal(index, { amountEUR: Math.max(0, Number(e.target.value) || 0) });
                    }}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm w-full text-right disabled:bg-gray-100"
                    aria-label="Wert"
                  />

                  <span className="text-xs text-gray-500 whitespace-nowrap px-1 py-1">
                    {unitForKind(goal.kind)}
                  </span>
                </div>

                <button
                  onClick={() => removeGoal(index)}
                  disabled={systemGoal}
                  aria-label="Ziel loeschen"
                  className="text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-gray-400 rounded-md px-2 py-1"
                >
                  x
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-gray-500 italic">
            Wert 0 blendet ein Ziel aus. Das Refinanzierungsziel nutzt den Eigenkonsum.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChange(defaultGoals)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Defaults
            </button>
            <button
              onClick={addGoal}
              className="rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-800"
            >
              + Neues Ziel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

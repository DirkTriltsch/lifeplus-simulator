import { useState } from 'react';
import type { GoalKind, GoalProgress } from '@mlm/simulator-goals';
import { GoalIcon } from './GoalIcon';
import {
  GoalsEditorDialog,
  type GoalUI,
} from './GoalsEditorDialog';

export type RealityStrategy =
  | 'standard'
  | 'dirichlet'
  | 'momentum'
  | 'lifecycle';

const STRATEGY_OPTIONS: { value: RealityStrategy; label: string }[] = [
  { value: 'standard', label: 'Standard (gleichmaessig)' },
  { value: 'dirichlet', label: 'Zufallsverteilung' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'lifecycle', label: 'Persoenlichkeitsprofile' },
];

interface AdvancedSettingsPanelProps {
  maxDirectMembersPerMember: number;
  onMaxDirectChange: (v: number) => void;
  monthlyProductCostEUR: number;
  onMonthlyProductCostChange: (v: number) => void;
  realityStrategy: RealityStrategy;
  onRealityStrategyChange: (s: RealityStrategy) => void;
  goals: GoalUI[];
  onGoalsChange: (goals: GoalUI[]) => void;
  goalProgress?: GoalProgress[];
}

export function AdvancedSettingsPanel({
  maxDirectMembersPerMember,
  onMaxDirectChange,
  monthlyProductCostEUR,
  onMonthlyProductCostChange,
  realityStrategy,
  onRealityStrategyChange,
  goals,
  onGoalsChange,
  goalProgress,
}: AdvancedSettingsPanelProps) {
  const progressById = new Map(
    (goalProgress ?? []).map((p) => [p.goal.id, p]),
  );
  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
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
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                Verteilung des Wachstums auf die Beine.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">Ziele-Leiter</span>
                <button
                  onClick={() => setEditorOpen(true)}
                  aria-label="Ziele bearbeiten"
                  className="text-gray-500 hover:text-gray-900 p-1 -mr-1 rounded-md hover:bg-gray-100"
                >
                  <GearIcon />
                </button>
              </div>
              <ul className="space-y-1">
                {goals
                  .filter((g) => g.amountEUR > 0)
                  .map((g) => {
                    const p = progressById.get(g.id);
                    return (
                      <li
                        key={g.id}
                        className="flex items-center gap-2 text-xs text-gray-700"
                      >
                        <span
                          className={`shrink-0 ${p?.achieved ? 'text-brand-700' : 'text-gray-400'}`}
                        >
                          <GoalIcon name={g.icon} size={14} />
                        </span>
                        <span className="truncate">{g.label}</span>
                        <span className="ml-auto text-gray-500 whitespace-nowrap">
                          {formatAmount(displayAmountForGoal(g, monthlyProductCostEUR))} {shortUnit(g.kind)}
                          {p?.achieved && p.achievedInYear !== undefined && (
                            <span className="ml-1.5 text-brand-700 font-medium">
                              · J{p.achievedInYear}
                            </span>
                          )}
                          {p?.blockedByRefinanced && (
                            <span
                              className="ml-1.5 text-amber-600"
                              title="Wartet auf Produkt-Refinanzierung"
                            >
                              ⏳
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>
        </div>
      )}

      <GoalsEditorDialog
        open={editorOpen}
        goals={goals}
        onChange={onGoalsChange}
        onClose={() => setEditorOpen(false)}
      />
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

function GearIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function formatAmount(value: number): string {
  return value.toLocaleString('de-DE');
}

function displayAmountForGoal(goal: GoalUI, monthlyProductCostEUR: number): number {
  return goal.kind === 'productsRefinanced'
    ? monthlyProductCostEUR
    : goal.amountEUR;
}

function shortUnit(kind: GoalKind): string {
  return kind === 'yearlySurplus' ? 'EUR/Jahr' : 'EUR/Mon';
}

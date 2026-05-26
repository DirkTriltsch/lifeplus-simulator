import { useState } from 'react';
import type { GoalKind, GoalProgress } from '@mlm/simulator-goals';
import { GoalIcon } from './GoalIcon';
import {
  GoalsEditorDialog,
  type GoalUI,
} from './GoalsEditorDialog';

interface GoalsLadderPanelProps {
  open: boolean;
  onToggle: () => void;
  goals: GoalUI[];
  onGoalsChange: (goals: GoalUI[]) => void;
  defaultGoals: GoalUI[];
  monthlyProductCostEUR: number;
  goalProgress?: GoalProgress[];
}

export function GoalsLadderPanel({
  open,
  onToggle,
  goals,
  onGoalsChange,
  defaultGoals,
  monthlyProductCostEUR,
  goalProgress,
}: GoalsLadderPanelProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const progressById = new Map(
    (goalProgress ?? []).map((p) => [p.goal.id, p]),
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 sm:px-6 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-gray-700">Ziele-Leiter</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-5 border-t border-gray-100 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Zwischenziele im Verlauf deiner aktuellen Simulation.
            </p>
            <button
              onClick={() => setEditorOpen(true)}
              aria-label="Ziele bearbeiten"
              className="shrink-0 text-gray-500 hover:text-gray-900 p-1.5 -mr-1 rounded-md hover:bg-gray-100"
            >
              <GearIcon />
            </button>
          </div>

          <ul className="space-y-2">
            {goals
              .filter((g) => goalVisible(g))
              .map((g) => {
                const p = progressById.get(g.id);
                return (
                  <li
                    key={g.id}
                    className="flex items-start gap-2.5 text-xs text-gray-700"
                  >
                    <span
                      className={`shrink-0 mt-0.5 ${p?.achieved ? 'text-brand-700' : 'text-gray-400'}`}
                    >
                      <GoalIcon name={g.icon} size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{g.label}</span>
                      {p && (
                        <span className="block text-[11px] text-gray-500 truncate">
                          {progressLabel(p, g, monthlyProductCostEUR)}
                        </span>
                      )}
                    </span>
                    <span className="text-gray-500 whitespace-nowrap text-right">
                      <span>
                        {formatAmount(displayAmountForGoal(g, monthlyProductCostEUR))}{' '}
                        {shortUnit(g.kind)}
                      </span>
                      {p?.achieved && p.achievedInYear !== undefined && (
                        <span className="ml-1.5 text-brand-700 font-medium">
                          - J{p.achievedInYear}
                        </span>
                      )}
                      {p?.blockedByRefinanced && (
                        <span
                          className="ml-1.5 text-amber-600"
                          title="Wartet auf Produkt-Refinanzierung"
                        >
                          wartet
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      <GoalsEditorDialog
        open={editorOpen}
        goals={goals}
        onChange={onGoalsChange}
        defaultGoals={defaultGoals}
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
  return Math.round(value).toLocaleString('de-DE');
}

function displayAmountForGoal(
  goal: GoalUI,
  monthlyProductCostEUR: number,
): number {
  return goal.kind === 'productsRefinanced'
    ? monthlyProductCostEUR
    : goal.amountEUR;
}

function shortUnit(kind: GoalKind): string {
  return kind === 'yearlySurplus' ? 'EUR/Jahr' : 'EUR/Mon';
}

function goalVisible(goal: GoalUI): boolean {
  return goal.kind === 'productsRefinanced' || goal.amountEUR > 0;
}

function progressLabel(
  progress: GoalProgress,
  goal: GoalUI,
  monthlyProductCostEUR: number,
): string {
  const target = displayAmountForGoal(goal, monthlyProductCostEUR);
  const current = progress.currentValueEUR;
  const remaining = Math.max(0, target - current);
  const percent = Math.max(0, Math.min(999, Math.round(progress.percentage * 100)));

  if (progress.achieved) {
    return `${formatAmount(Math.max(0, current))} erreicht (${percent}%)`;
  }

  if (progress.blockedByRefinanced) {
    return 'Bedingung erfuellt, wartet auf Refinanzierung';
  }

  return `noch -${formatAmount(remaining)} EUR (${percent}%)`;
}

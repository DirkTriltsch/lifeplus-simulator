import type { ExampleLinePerson } from '@mlm/product-lifeplus';
import { useState } from 'react';
import {
  PHASE1_RANKS,
  PHASE2_RANKS,
  PHASE3_RANKS,
  rankLabel,
} from './rankStats';

interface StatusPickerSheetProps {
  person: ExampleLinePerson;
  onChange: (rank: string) => void;
  onClose: () => void;
}

type StatusTab = 'phase1' | 'phase2' | 'phase3';

export function StatusPickerSheet({
  person,
  onChange,
  onClose,
}: StatusPickerSheetProps) {
  const [activeTab, setActiveTab] = useState<StatusTab>(tabForRank(person.rank));
  const ranks =
    activeTab === 'phase1'
      ? PHASE1_RANKS
      : activeTab === 'phase2'
        ? PHASE2_RANKS
        : PHASE3_RANKS;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/35 px-3 pb-3 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Statusauswahl schliessen"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Status setzen
            </p>
            <h2 className="mt-1 text-lg font-semibold text-gray-950">
              {person.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Schliessen"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="m6 6 12 12" />
              <path d="m18 6-12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-3 rounded-lg bg-gray-100 p-1 text-sm">
          <TabButton
            label="Phase 1"
            active={activeTab === 'phase1'}
            onClick={() => setActiveTab('phase1')}
          />
          <TabButton
            label="Phase 2"
            active={activeTab === 'phase2'}
            onClick={() => setActiveTab('phase2')}
          />
          <TabButton
            label="Phase 3"
            active={activeTab === 'phase3'}
            onClick={() => setActiveTab('phase3')}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {ranks.map((rank) => (
            <button
              key={rank}
              type="button"
              onClick={() => {
                onChange(rank);
                onClose();
              }}
              className={`rounded-lg border px-3 py-3 text-left text-sm font-medium transition ${
                person.rank === rank
                  ? 'border-brand-400 bg-brand-50 text-brand-800'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300'
              }`}
            >
              {rankLabel(rank)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-2 text-center ${
        active ? 'bg-white text-brand-800 shadow-sm' : 'text-gray-500'
      }`}
    >
      {label}
    </button>
  );
}

function tabForRank(rank: string): StatusTab {
  if (rank.includes('*')) return 'phase3';
  if (rank === 'Bronze' || rank === 'Silver' || rank === 'Gold' || rank === 'Diamond') {
    return 'phase2';
  }
  return 'phase1';
}

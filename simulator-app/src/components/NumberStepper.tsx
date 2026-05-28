import { useState } from 'react';

interface NumberStepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step: number;
  unit?: string;
  fastStep?: number;
  onChange: (value: number) => void;
}

export function NumberStepper({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  fastStep,
  onChange,
}: NumberStepperProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const applyStep = (delta: number) => {
    onChange(roundToStep(clamp(value + delta, min, max), step));
  };

  const startEdit = () => {
    setDraft(formatValue(value));
    setEditing(true);
  };

  const commitEdit = () => {
    const parsed = Number(draft.replace(',', '.'));
    if (Number.isFinite(parsed)) {
      onChange(roundToStep(clamp(parsed, min, max), step));
    }
    setEditing(false);
  };

  const atMin = min !== undefined && value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-gray-600">{label}</label>
      <div className="flex items-center gap-1">
        {fastStep && (
          <StepButton
            label={`−${fastStep}`}
            onClick={() => applyStep(-fastStep)}
            disabled={atMin}
          />
        )}
        <StepButton
          label={`−${formatValue(step)}`}
          onClick={() => applyStep(-step)}
          disabled={atMin}
        />
        {editing ? (
          <input
            type="text"
            inputMode="decimal"
            value={draft}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitEdit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitEdit();
              if (event.key === 'Escape') setEditing(false);
            }}
            className="w-12 rounded-md border border-brand-400 bg-white px-1.5 py-1 text-center text-sm font-semibold text-gray-900 outline-none focus:border-brand-500"
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="min-w-12 rounded-md border border-gray-300 bg-white px-1.5 py-1 text-center text-sm font-semibold text-gray-900 transition hover:border-brand-300"
            title="Tippen zum direkten Eingeben"
          >
            {formatValue(value)}
            {unit && <span className="ml-0.5 text-[11px] font-medium text-gray-500">{unit}</span>}
          </button>
        )}
        <StepButton
          label={`+${formatValue(step)}`}
          onClick={() => applyStep(step)}
          disabled={atMax}
        />
        {fastStep && (
          <StepButton
            label={`+${fastStep}`}
            onClick={() => applyStep(fastStep)}
            disabled={atMax}
          />
        )}
      </div>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-gray-300 bg-gray-50 px-1.5 py-1 text-xs font-medium text-gray-600 transition hover:border-gray-400 hover:bg-white hover:text-gray-900 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-300"
    >
      {label}
    </button>
  );
}

function clamp(value: number, min?: number, max?: number): number {
  let result = value;
  if (min !== undefined) result = Math.max(result, min);
  if (max !== undefined) result = Math.min(result, max);
  return result;
}

function roundToStep(value: number, step: number): number {
  const precision = decimalPlaces(step);
  return Number(value.toFixed(precision));
}

function decimalPlaces(value: number): number {
  const [, decimals = ''] = String(value).split('.');
  return decimals.length;
}

function formatValue(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value
        .toFixed(2)
        .replace(/0+$/, '')
        .replace(/\.$/, '')
        .replace('.', ',');
}

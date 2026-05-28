import { useEffect, useState } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: SliderProps) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  const commitValue = (nextValue = draftValue) => {
    if (nextValue !== value) {
      onChange(nextValue);
    }
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-xs text-gray-600">{label}</label>
        <span className="text-sm font-medium text-gray-900">
          {formatValue(draftValue)}
          {unit && <span className="text-xs text-gray-500 ml-0.5">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={draftValue}
        onChange={(e) => setDraftValue(Number(e.target.value))}
        onPointerUp={(e) => commitValue(Number(e.currentTarget.value))}
        onKeyUp={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
            commitValue(Number(e.currentTarget.value));
          }
        }}
        onBlur={(e) => commitValue(Number(e.currentTarget.value))}
        aria-label={label}
      />
    </div>
  );
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

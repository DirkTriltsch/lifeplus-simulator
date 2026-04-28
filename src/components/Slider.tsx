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
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-xs text-gray-600">{label}</label>
        <span className="text-sm font-medium text-gray-900">
          {value}
          {unit && <span className="text-xs text-gray-500 ml-0.5">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  );
}

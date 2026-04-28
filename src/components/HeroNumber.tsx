interface HeroNumberProps {
  monthlyEUR: number;
  year: number;
}

function formatEUR(n: number): string {
  if (!isFinite(n) || isNaN(n)) return '€0';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function HeroNumber({ monthlyEUR, year }: HeroNumberProps) {
  const annualEUR = monthlyEUR * 12;
  return (
    <div className="text-center py-5 border-y border-gray-200">
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
        Provision in Jahr {year}
      </p>
      <p className="text-4xl sm:text-5xl font-medium text-brand-400 leading-tight">
        {formatEUR(monthlyEUR)}
        <span className="text-base text-gray-500 font-normal ml-1">
          / Monat
        </span>
      </p>
      <p className="text-xs text-gray-400 mt-1">
        ≈ {formatEUR(annualEUR)} / Jahr
      </p>
    </div>
  );
}

import type { Goal } from './contracts';

export const DEFAULT_GOALS: Goal[] = [
  {
    id: 'products-refinanced',
    label: 'Produkte refinanziert',
    kind: 'productsRefinanced',
    amountEUR: 100,
  },
  {
    id: 'holiday',
    label: 'Urlaub',
    kind: 'yearlySurplus',
    amountEUR: 2000,
    requiresRefinanced: true,
  },
  {
    id: 'car',
    label: 'Auto',
    kind: 'monthlySurplus',
    amountEUR: 500,
    requiresRefinanced: true,
  },
  {
    id: 'rent-free',
    label: 'Mietfrei wohnen',
    kind: 'monthlySurplus',
    amountEUR: 1400,
    requiresRefinanced: true,
  },
  {
    id: 'free-life',
    label: 'Frei leben',
    kind: 'monthlyIncome',
    amountEUR: 5000,
    requiresRefinanced: true,
  },
];

import type { SimulatorInputs } from '@mlm/simulator-core';

export type GrowthStrategyName = 'standard' | 'dirichlet' | 'momentum';

export interface BenchmarkParameterSet {
  id: string;
  label: string;
  purpose: string;
  inputs: SimulatorInputs;
  productMode: boolean;
}

const BASE_INPUTS = {
  duplicationRate: 1,
  memberMonthlyVolume: 45,
  shopperMonthlyVolume: 45,
  personalMonthlyVolume: 45,
  unitToCurrency: 1,
  maxDirectMembersPerMember: 29,
} satisfies Partial<SimulatorInputs>;

export const B1_PARAMETER_SETS: BenchmarkParameterSet[] = [
  {
    id: 'P1',
    label: 'Konservativ',
    purpose: 'Untere realistische Last',
    productMode: true,
    inputs: {
      ...BASE_INPUTS,
      membersPerYear: 1,
      shoppersPerYear: 2,
      duplicationRate: 0.5,
      attritionRate: 0.25,
    },
  },
  {
    id: 'P2',
    label: 'Default realistisch',
    purpose: 'Haupt-Default',
    productMode: true,
    inputs: {
      ...BASE_INPUTS,
      membersPerYear: 2,
      shoppersPerYear: 3,
      attritionRate: 0.18,
    },
  },
  {
    id: 'P3',
    label: 'Default optimistisch',
    purpose: 'Stresstest ohne Mindest-Churn',
    productMode: false,
    inputs: {
      ...BASE_INPUTS,
      membersPerYear: 2,
      shoppersPerYear: 3,
      attritionRate: 0,
    },
  },
  {
    id: 'P4',
    label: 'Mittel aggressiv',
    purpose: 'Grenze fuer Tree-Pfad',
    productMode: true,
    inputs: {
      ...BASE_INPUTS,
      membersPerYear: 2.5,
      shoppersPerYear: 3,
      attritionRate: 0.18,
    },
  },
  {
    id: 'P5',
    label: 'Aggressiv',
    purpose: 'Hoher Produktmodus',
    productMode: true,
    inputs: {
      ...BASE_INPUTS,
      membersPerYear: 3,
      shoppersPerYear: 3,
      attritionRate: 0.25,
    },
  },
  {
    id: 'P6',
    label: 'Extrem',
    purpose: 'Cap-/Abbruchtest',
    productMode: true,
    inputs: {
      ...BASE_INPUTS,
      membersPerYear: 4,
      shoppersPerYear: 3,
      attritionRate: 0.3,
    },
  },
];

export const B1_STRATEGIES: GrowthStrategyName[] = [
  'standard',
  'dirichlet',
  'momentum',
];

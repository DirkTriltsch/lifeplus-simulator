import type { NetworkSnapshot } from './network';

export type ProductId = 'lifeplus' | 'fitline' | 'eqology';

export interface BrandLockup {
  initial: string;
  wordNeutral: string;
  wordAccent: string;
  markFill: string;
  darkBg: string;
  accentOnDark: string;
  waveColor: string;
  taglineDe: string;
}

export interface BrandDefinition {
  name: string;
  shortName: string;
  accentColor: string;
  lockup: BrandLockup;
}

export interface LegalDefinition {
  siteName: string;
  contactEmail: string;
}

export interface Terminology {
  productName: string;
  memberLabel: string;
  shopperLabel: string;
  volumeUnit: string;
  currencyLabel: string;
  rankLabel: string;
}

export interface SimulatorInputs {
  membersPerYear: number;
  shoppersPerYear: number;
  duplicationRate: number;
  attritionRate: number;
  memberMonthlyVolume: number;
  shopperMonthlyVolume: number;
  personalMonthlyVolume?: number;
  unitToCurrency?: number;
}

export interface CompensationResult {
  totalUnits: number;
  phase1Units: number;
  phase2Units: number;
  phase3Units: number;
  rankName: string;
  av: number;
  qgv: number;
  networkSize: number;
  directLegs: number;
  members: number;
  shoppers: number;
}

export interface CompensationPlan {
  calculateMonth(
    snapshot: NetworkSnapshot,
    inputs: SimulatorInputs,
  ): CompensationResult;
}

export interface ProductDefinition {
  id: ProductId;
  domain: string;
  siteUrl: string;
  brand: BrandDefinition;
  legal: LegalDefinition;
  terminology: Terminology;
  simulator: {
    defaultInputs: SimulatorInputs;
    plan: CompensationPlan;
  };
}

import type { NetworkSnapshot } from './network';
import type { PersonTreeSnapshot } from './person-tree';

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
  /** Monatlicher Eigenkonsum in EUR. Basis fuer Refinanzierung und Ueberschuss. */
  monthlyProductCostEUR?: number;
  /** Maximale Anzahl direkter Members pro Member. Default 29. */
  maxDirectMembersPerMember?: number;
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

export interface TreePayout {
  orderId: string;
  orderPersonId: string;
  receiverId: string;
  phase: 1 | 2 | 3;
  levelFromOrder: number;
  slot: string;
  rate: number;
  baseVolume: number;
  amount: number;
  reason: string;
}

export interface PersonRankState {
  personId: string;
  rank: {
    name: string;
  };
  av: number;
  qgv: number;
  qualifiedLegs: number;
  bronzeLegs: number;
  diamondLegs: number;
}

export interface TreeCompensationResult extends CompensationResult {
  payouts: TreePayout[];
  rankStates: PersonRankState[];
}

export interface CompensationPlan {
  calculateMonth(
    snapshot: NetworkSnapshot,
    inputs: SimulatorInputs,
  ): CompensationResult;
  calculateTreeMonth?(
    snapshot: PersonTreeSnapshot,
    inputs: SimulatorInputs,
  ): TreeCompensationResult;
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

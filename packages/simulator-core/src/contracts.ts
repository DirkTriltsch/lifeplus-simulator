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
  bronzeLegs?: number;
  diamondLegs?: number;
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

export type ExampleOrderKind =
  | 'shopper'
  | 'member_first_150'
  | 'member_above_150'
  | 'member_order';

export interface ExampleLinePerson {
  id: string;
  name?: string;
  rank: string;
  qualifiedForPhase1?: boolean;
}

export interface ExampleOrder {
  kind: ExampleOrderKind;
  ip: number;
}

export interface ExampleLineInput {
  peopleFromCustomerUp: ExampleLinePerson[];
  order: ExampleOrder;
}

export interface ExamplePayout {
  personId: string;
  name?: string;
  rank: string;
  phase: 1 | 2 | 3;
  levelFromCustomer: number;
  slot?: string;
  rate: number;
  baseIP: number;
  amountIP: number;
  note: string;
}

export interface ExampleLineCalculation {
  payouts: ExamplePayout[];
  phase1IP: number;
  phase2IP: number;
  phase3IP: number;
  totalIP: number;
  totalRateOnOrder: number;
}

export interface CompensationPlan {
  calculateTreeMonth(
    snapshot: PersonTreeSnapshot,
    inputs: SimulatorInputs,
  ): TreeCompensationResult;
  calculateExampleLine?(
    input: ExampleLineInput,
  ): ExampleLineCalculation;
  selectTreeMemberChurnCandidates?(
    snapshot: PersonTreeSnapshot,
    inputs: SimulatorInputs,
  ): string[];
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

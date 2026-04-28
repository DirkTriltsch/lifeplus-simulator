// Verguetungsplan-Konstanten gemaess LifePlus PDF, Italien ausgenommen.

export const PHASE1 = {
  shop: { level1: 0.25, level2: 0.1, level3: 0.05 },
  referral: { level1: 0.05, level2: 0.25, level3: 0.1 },
  shopDiscount: { level1: 0.1, level2: 0.05, level3: 0.05 },
} as const;

export const PHASE1_QUALIFICATION = {
  level1: { minAV: 40, minQL: 0 },
  level2: { minAV: 40, minQL: 0 },
  level3: { minAV: 40, minQL: 3 },
} as const;

// Erste 150 IP einer Member-Bestellung sind Referral [R].
export const REFERRAL_THRESHOLD_IP = 150;

// Member erhalten auf den Anteil oberhalb 150 IP einen Sofortrabatt.
export const MEMBER_SELF_DISCOUNT = 0.2;

export const PRELIM_RANKS = [
  { name: 'Believer', minAV: 40, minQGV: 500, minQL: 3 },
  { name: 'Builder', minAV: 40, minQGV: 1500, minQL: 3 },
] as const;

export const PHASE2_RANKS = [
  { name: 'Bronze', rate: 0.03, minAV: 100, minQGV: 3000, minQL: 3 },
  { name: 'Silver', rate: 0.06, minAV: 100, minQGV: 6000, minQL: 6 },
  { name: 'Gold', rate: 0.09, minAV: 150, minQGV: 9000, minQL: 9 },
  { name: 'Diamond', rate: 0.12, minAV: 150, minQGV: 15000, minQL: 12 },
] as const;

export const PHASE3_RANKS = [
  {
    name: '1*Diamond',
    incrementalRate: 0.03,
    cumulativeRate: 0.03,
    minAV: 150,
    minQGV: 15000,
    minQL: 12,
    minDiamondLegs: 1,
    minBronzeLegs: 2,
  },
  {
    name: '2*Diamond',
    incrementalRate: 0.03,
    cumulativeRate: 0.06,
    minAV: 150,
    minQGV: 20000,
    minQL: 12,
    minDiamondLegs: 2,
    minBronzeLegs: 1,
  },
  {
    name: '3*Diamond',
    incrementalRate: 0.02,
    cumulativeRate: 0.08,
    minAV: 150,
    minQGV: 25000,
    minQL: 12,
    minDiamondLegs: 3,
    minBronzeLegs: 0,
  },
] as const;

export const DEFAULT_IP_TO_EUR = 1;
export const SIMULATION_YEARS = 10;
export const MONTHS_PER_YEAR = 12;
export const TOTAL_MONTHS = SIMULATION_YEARS * MONTHS_PER_YEAR;

export type GoalKind =
  | 'productsRefinanced'
  | 'monthlyIncome'
  | 'monthlySurplus'
  | 'yearlySurplus';

export interface Goal {
  id: string;
  label: string;
  kind: GoalKind;
  amountEUR: number;
  /** Ziel gilt erst als erreicht, wenn auch das productsRefinanced-Ziel erfuellt ist. */
  requiresRefinanced?: boolean;
}

export interface GoalProgress {
  goal: Goal;
  achieved: boolean;
  achievedInMonth?: number;
  achievedInYear?: number;
  /** Aktueller Wert der Ziel-Vergleichsgroesse im letzten Monat. */
  currentValueEUR: number;
  /** 0..1+ (ungebremst fuer Fortschrittsanzeigen). */
  percentage: number;
  /** True, wenn die Zielbedingung selbst erfuellt ist, aber Refinanzierung noch fehlt. */
  blockedByRefinanced?: boolean;
}

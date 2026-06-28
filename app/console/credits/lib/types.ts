/**
 * Minimal vendored types for the Credits tab.
 *
 * Copied (not cross-imported) from the Amex Credit Tracker's
 * `shared/types.ts` — only the fields this read-only view consumes. Money
 * is INTEGER cents end-to-end; format only at the view boundary.
 *
 * Keep in shape-lockstep with the vendored `data/dataset.json`. M5 will
 * swap the static dataset for a live adapter; widen these then if needed.
 */

export const CATEGORIES = [
  "travel",
  "dining",
  "wellness",
  "retail",
  "entertainment",
  "offers",
  // (v2/M0) widened for non-Amex issuers (Chase / DoorDash / Apple TV).
  "transit",
  "grocery",
  "rideshare",
  "subscription",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Frequency =
  | "monthly"
  | "quarterly"
  | "semi_annual"
  | "annual"
  | "every_4_years"
  | "ad_hoc";

export type RedemptionStatus = "captured" | "pending" | "missed" | "at_risk";

export type AutomationTier =
  | "set_and_forget"
  | "browser_auto"
  | "manual_reminder"
  | "one_time_setup";

export interface Card {
  cardId: string;
  name: string;
  issuer: string;
  annualFeeCents: number;
  colorHex: string;
}

export interface Credit {
  creditId: string;
  cardId: string;
  name: string;
  frequency: Frequency;
  perPeriodCents: number;
  annualValueCents: number;
  enrollmentRequired: boolean;
  automationTier: AutomationTier;
  category: Category;
  notifyLeadDays?: number | null;
  sortOrder: number;
  active: boolean;
}

export interface CreditPeriod {
  periodId: string;
  creditId: string;
  label: string;
  periodStart: string;
  periodEnd: string;
  maxAmountCents: number;
}

export interface Redemption {
  redemptionId: string;
  periodId: string;
  status: RedemptionStatus;
  capturedAmountCents: number;
  capturedAt: string | null;
}

export interface DashboardKpis {
  totalCapturedCents: number;
  totalAnnualValueCents: number;
  feesCents: number;
  netRecoveredCents: number;
  pctOfFeesRecovered: number;
  nextPostingAt: string | null;
  nextPostingCreditName: string | null;
  countAtRisk: number;
  capturedYtdPct: number;
}

/** The minimal shape we read off `data/dataset.json`. */
export interface CreditsDataset {
  generatedAt: string;
  year: number;
  cards: Card[];
  credits: Credit[];
  periods: CreditPeriod[];
  redemptions: Redemption[];
  kpis: DashboardKpis;
}

/** Per-credit derived view-model for the current open period. */
export interface CreditProgress {
  credit: Credit;
  windowLabel: string;
  capturedCents: number;
  maxCents: number;
  status: RedemptionStatus;
  daysUntilPeriodEnd: number;
  periodEnd: string | null;
  atRisk: boolean;
  /** Enroll-once comp item (perPeriodCents === 0) — render as a badge, not a ring. */
  enrollOnce: boolean;
}

/**
 * Derived view-model helpers for the Credits tab — pure functions, no I/O.
 *
 * Ported (not cross-imported) from the tracker's `web/lib/derive.ts`, kept
 * to what this read-only view needs: per-credit progress for the open
 * period, KPI rollups, category buckets, and the at-risk predicate.
 *
 * Money stays in INTEGER cents; format only at the view boundary.
 */

import type {
  Card,
  Category,
  Credit,
  CreditPeriod,
  CreditProgress,
  CreditsDataset,
  Frequency,
  Redemption,
  RedemptionStatus,
} from "./types";
import { CATEGORIES } from "./types";

/**
 * Stable "as-of" anchor for the vendored M1 snapshot.
 *
 * The dataset is a fixed showcase, so we anchor "now" to a deterministic
 * instant rather than `new Date()` — this keeps the at-risk banner and
 * day-counts reproducible across renders. Chosen near a month/quarter
 * close so the lead-window predicate has live examples to show (Resy Q3,
 * Dunkin' Sep, DoorDash Sep all land in-window here).
 *
 * M5 (live data) replaces this with `new Date()`.
 */
export const AS_OF = new Date("2026-09-27T12:00:00Z");

/**
 * Lead window per frequency — how close to `periodEnd` an unfilled credit
 * is flagged "at risk". Per the M3 spec: monthly 5d / quarterly 14d /
 * semi-annual & annual 30d. A credit's own `notifyLeadDays` overrides.
 */
const FREQUENCY_LEAD_DAYS: Record<Frequency, number> = {
  monthly: 5,
  quarterly: 14,
  semi_annual: 30,
  annual: 30,
  every_4_years: 30,
  ad_hoc: 30,
};

export function leadWindowDays(credit: Credit): number {
  return credit.notifyLeadDays ?? FREQUENCY_LEAD_DAYS[credit.frequency] ?? 30;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  travel: "Travel",
  dining: "Dining",
  wellness: "Wellness",
  retail: "Retail",
  entertainment: "Entertainment",
  offers: "Offers",
  transit: "Transit",
  grocery: "Grocery",
  rideshare: "Rideshare",
  subscription: "Subscription",
};

/**
 * The window containing `asOf`, else the most recently closed window.
 * Mirrors the tracker's `currentPeriodFor`.
 */
export function currentPeriodFor(
  credit: Credit,
  periods: CreditPeriod[],
  asOf: Date,
): CreditPeriod | null {
  const candidates = periods
    .filter((p) => p.creditId === credit.creditId)
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  const inside = candidates.find(
    (p) =>
      new Date(p.periodStart) <= asOf &&
      new Date(`${p.periodEnd}T23:59:59Z`) >= asOf,
  );
  if (inside) return inside;
  const past = candidates.filter((p) => new Date(p.periodEnd) < asOf);
  return past.at(-1) ?? candidates[0] ?? null;
}

export function progressFor(
  credit: Credit,
  periods: CreditPeriod[],
  redemptions: Redemption[],
  asOf: Date,
): CreditProgress {
  const period = currentPeriodFor(credit, periods, asOf);
  const periodRedemptions = period
    ? redemptions.filter((r) => r.periodId === period.periodId)
    : [];
  const captured = periodRedemptions.reduce(
    (s, r) => s + r.capturedAmountCents,
    0,
  );
  const max = period?.maxAmountCents ?? credit.perPeriodCents;
  const enrollOnce = credit.perPeriodCents === 0;

  const daysLeft = period
    ? Math.max(
        0,
        Math.round(
          (new Date(`${period.periodEnd}T23:59:59Z`).getTime() -
            asOf.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  // Open period (contains asOf), not yet filled, within the lead window.
  const periodIsOpen = period
    ? new Date(period.periodStart) <= asOf &&
      new Date(`${period.periodEnd}T23:59:59Z`) >= asOf
    : false;
  const filled = max > 0 && captured >= max;
  const atRisk =
    !enrollOnce && periodIsOpen && !filled && daysLeft <= leadWindowDays(credit);

  const status: RedemptionStatus = atRisk
    ? "at_risk"
    : filled
      ? "captured"
      : periodRedemptions.find((r) => r.status === "missed")
        ? "missed"
        : "pending";

  return {
    credit,
    windowLabel: period?.label ?? "—",
    capturedCents: captured,
    maxCents: max,
    status,
    daysUntilPeriodEnd: daysLeft,
    periodEnd: period?.periodEnd ?? null,
    atRisk,
    enrollOnce,
  };
}

export function allProgress(
  ds: CreditsDataset,
  asOf: Date = AS_OF,
): CreditProgress[] {
  return ds.credits
    .filter((c) => c.active)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => progressFor(c, ds.periods, ds.redemptions, asOf));
}

/** Progress grouped by card, in the dataset's card order. */
export function progressByCard(
  ds: CreditsDataset,
  asOf: Date = AS_OF,
): Array<{ card: Card; items: CreditProgress[] }> {
  const progress = allProgress(ds, asOf);
  return ds.cards.map((card) => ({
    card,
    items: progress.filter((p) => p.credit.cardId === card.cardId),
  }));
}

export function atRiskProgress(progress: CreditProgress[]): CreditProgress[] {
  return progress.filter((p) => p.atRisk);
}

/** Captured-to-date by category, descending; zero buckets dropped. */
export function capturedByCategory(
  ds: CreditsDataset,
): Array<{ category: Category; label: string; cents: number }> {
  const totals = Object.fromEntries(
    CATEGORIES.map((c) => [c, 0]),
  ) as Record<Category, number>;

  for (const r of ds.redemptions) {
    if (!r.capturedAmountCents) continue;
    const period = ds.periods.find((p) => p.periodId === r.periodId);
    if (!period) continue;
    const credit = ds.credits.find((c) => c.creditId === period.creditId);
    if (!credit) continue;
    totals[credit.category] += r.capturedAmountCents;
  }

  return CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    cents: totals[category],
  }))
    .filter((row) => row.cents > 0)
    .sort((a, b) => b.cents - a.cents);
}

/**
 * The four KPI-strip rollups. Captured/fees figures come straight from the
 * dataset's precomputed `kpis`; `countAtRisk` is recomputed from the
 * lead-window predicate so it matches the banner exactly.
 */
export function kpiSummary(ds: CreditsDataset, asOf: Date = AS_OF) {
  const atRisk = atRiskProgress(allProgress(ds, asOf));
  return {
    ...ds.kpis,
    countAtRisk: atRisk.length,
  };
}

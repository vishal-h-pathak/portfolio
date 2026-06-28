/**
 * At-risk banner — the visual payoff. Credits whose open window is within
 * the lead window and not yet filled (e.g. "Resy Dining Credit — 3d left").
 *
 * Server component. Renders nothing when nothing is at risk. Uses the
 * cockpit's `--red` tone (defined on the internal surface) at low alpha —
 * no new color system.
 */

import { dollarsCompact, shortDate } from "../lib/format";
import type { CreditProgress } from "../lib/types";

export function AtRiskBanner({ items }: { items: CreditProgress[] }) {
  if (items.length === 0) return null;
  const totalGap = items.reduce((s, i) => s + (i.maxCents - i.capturedCents), 0);

  return (
    <section
      role="alert"
      className="flex flex-col gap-3 border border-l-2 border-red-dim border-l-red bg-bg-raised p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-ink">
          <span className="text-red">{items.length}</span> credit
          {items.length === 1 ? "" : "s"} at risk —{" "}
          <span className="text-red tabular-nums">{dollarsCompact(totalGap)}</span>{" "}
          on the line
        </p>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-red">
          window closing
        </span>
      </div>
      <ul className="grid gap-1.5">
        {items.map((p) => (
          <li
            key={p.credit.creditId}
            className="flex items-baseline justify-between gap-3 text-[12px]"
          >
            <span className="truncate text-ink-dim">{p.credit.name}</span>
            <span className="shrink-0 tabular-nums text-ink-faint">
              {dollarsCompact(p.maxCents - p.capturedCents)} left · use by{" "}
              {shortDate(p.periodEnd)} ({p.daysUntilPeriodEnd}d)
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

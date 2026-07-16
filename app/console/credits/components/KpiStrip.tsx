/**
 * KPI strip — captured YTD, fees recovered, next posting, # at risk.
 *
 * Server component. Reads the dataset's precomputed rollups plus the
 * lead-window at-risk count. Styled with console tokens only (no new
 * color system); accent left-borders mirror the jobs/insights KpiTile.
 */

import { dollarsCompact, percent, relativeFromNow, shortDate } from "../lib/format";
import type { DashboardKpis } from "../lib/types";

function KpiTile({
  label,
  value,
  hint,
  accent,
  valueClass = "text-ink",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
  valueClass?: string;
}) {
  return (
    <div
      className="border border-rule bg-bg-raised px-4 py-3"
      style={accent ? { borderLeft: `2px solid ${accent}` } : undefined}
    >
      <div className="text-meta uppercase tracking-kicker text-ink-faint">
        {label}
      </div>
      <div className={`mt-1 text-2xl tabular-nums ${valueClass}`}>{value}</div>
      {hint && <div className="mt-0.5 text-meta text-ink-faint">{hint}</div>}
    </div>
  );
}

export function KpiStrip({ kpis, asOf }: { kpis: DashboardKpis; asOf: Date }) {
  const recovered = percent(kpis.pctOfFeesRecovered, 0);
  const recoveredClass =
    kpis.pctOfFeesRecovered >= 100 ? "text-green" : "text-ink";
  const atRiskClass = kpis.countAtRisk > 0 ? "text-red" : "text-green";

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiTile
        label="Captured YTD"
        value={dollarsCompact(kpis.totalCapturedCents)}
        hint={`of ${dollarsCompact(kpis.totalAnnualValueCents)} possible · ${percent(
          kpis.capturedYtdPct,
          0,
        )}`}
      />
      <KpiTile
        label="Fees recovered"
        value={recovered}
        valueClass={recoveredClass}
        accent="var(--green)"
        hint={`net ${dollarsCompact(kpis.netRecoveredCents)} vs ${dollarsCompact(
          kpis.feesCents,
        )} fees`}
      />
      <KpiTile
        label="Next posting"
        value={kpis.nextPostingAt ? relativeFromNow(kpis.nextPostingAt, asOf) : "—"}
        hint={`${kpis.nextPostingCreditName ?? "—"} · ${shortDate(kpis.nextPostingAt)}`}
      />
      <KpiTile
        label="Credits at risk"
        value={kpis.countAtRisk}
        valueClass={atRiskClass}
        accent={kpis.countAtRisk > 0 ? "var(--red)" : "var(--green)"}
        hint={kpis.countAtRisk === 0 ? "all on track" : "window closing soon"}
      />
    </section>
  );
}

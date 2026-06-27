import { createAdminClient } from "@/app/lib/supabase-admin";

/**
 * Sanitized agent-spend signal for the public workshop rail.
 *
 * Server-only: reads `cost_events` (migration 016) on the service role
 * (the ledger is service-role-only under RLS). The return value is
 * world-readable on the portfolio, so it carries ONLY rounded USD
 * aggregates — never raw rows, per-prompt detail, model names, token
 * units, or anything that leaks prompt/agent structure. Only a 7-day
 * total and a coarse per-stage breakdown leave this module.
 *
 * The dollar figures match the gated console's cost route
 * (`app/api/console/dashboard/costs/route.ts`): same `cost_events`
 * source, same 7-day window, same per-stage sum — just rounded to whole
 * cents and sanitized for public exposure.
 *
 * Returns null on any failure — the rail degrades to a plain "—", it
 * never errors. Mirrors the `getBenchActivity` never-throws contract.
 *
 * Do not import from client components.
 */

export type AgentSpendStage = { stage: string; usd: number };
export type AgentSpend = {
  /** Rolling 7-day total spend, USD, rounded to whole cents. */
  total7d: number;
  /** Top 2–3 stages by spend, descending; rounded, sub-cent floored out. */
  byStage: AgentSpendStage[];
};

// Whole-cent rounding floors sub-cent accumulation noise to $0.00.
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function getAgentSpend(): Promise<AgentSpend | null> {
  try {
    const admin = createAdminClient();
    if (!admin) return null;

    const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString();

    // Pull only the two columns the aggregate needs — stage (coarse label)
    // and cost. Never select model/units/run_id/job_id into this path.
    const { data, error } = await admin
      .from("cost_events")
      .select("stage, cost_usd")
      .gte("created_at", sevenDaysAgo);
    if (error) return null;

    const rows = data ?? [];
    const byStageMap: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      const usd = Number(row.cost_usd) || 0;
      if (usd <= 0) continue;
      total += usd;
      const stage =
        typeof row.stage === "string" && row.stage ? row.stage : "unknown";
      byStageMap[stage] = (byStageMap[stage] ?? 0) + usd;
    }

    const byStage = Object.entries(byStageMap)
      .map(([stage, usd]) => ({ stage, usd: round2(usd) }))
      .filter((s) => s.usd > 0) // drop stages that round to sub-cent
      .sort((a, b) => b.usd - a.usd)
      .slice(0, 3);

    return { total7d: round2(total), byStage };
  } catch {
    return null;
  }
}

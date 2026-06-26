import { NextResponse } from "next/server";
import { createAdminClient, MISCONFIGURED_MSG } from "@/app/lib/supabase-admin";

/**
 * GET /api/dashboard/costs  (Cost Tracker S4)
 *
 * Aggregates the `cost_events` ledger (migration 016) into the spend summary
 * the S5 dashboard UI renders:
 *
 *   {
 *     total:        { allTime, d30, d7 },   // USD over time windows
 *     byStage:      { hunt, tailor, chat, insight, ... },
 *     byService:    { anthropic, serpapi, ... },
 *     byModel:      { "claude-opus-4-6": ..., ... },
 *     daily:        [{ date: "YYYY-MM-DD", usd }],  // ascending
 *     costPerApplied                                // allTime ÷ #applied jobs
 *   }
 *
 * Source of truth is `cost_events` (one row per billable call). `runs.cost_usd`
 * is a *denormalized rollup of the same events*, so summing the ledger here is
 * both complete and avoids double-counting — and it includes portfolio
 * chat/insight calls, which carry no run_id. `runs.cost_usd` is consumed
 * separately by the S5 RunsPanel for the per-run column.
 *
 * Applications count comes from `jobs` (status='applied'), the same signal the
 * mark-applied route sets.
 *
 * Auth: protected by middleware.ts (dashboard_auth cookie), like every
 * sibling /api/dashboard/* route; reads on the service role (RLS lockdown).
 */

type CostEventRow = {
  created_at: string;
  stage: string | null;
  service: string | null;
  model: string | null;
  cost_usd: number | string | null;
};

// numeric(10,4) — round rollups to 4 dp to shed float-accumulation noise.
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function bump(map: Record<string, number>, key: string, usd: number): void {
  map[key] = (map[key] ?? 0) + usd;
}

function roundAll(map: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) out[k] = round4(v);
  return out;
}

export async function GET() {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: MISCONFIGURED_MSG }, { status: 500 });
  }

  const { data, error } = await admin
    .from("cost_events")
    .select("created_at, stage, service, model, cost_usd");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Applications = jobs the human has marked applied. head:true → count only.
  const { count: appliedCount, error: jobsErr } = await admin
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "applied");
  if (jobsErr) {
    return NextResponse.json({ error: jobsErr.message }, { status: 500 });
  }

  const rows = (data ?? []) as CostEventRow[];

  // 30d / 7d window edges, computed once.
  const nowMs = Date.now();
  const d30Edge = nowMs - 30 * 24 * 60 * 60 * 1000;
  const d7Edge = nowMs - 7 * 24 * 60 * 60 * 1000;

  let allTime = 0;
  let d30 = 0;
  let d7 = 0;
  const byStage: Record<string, number> = {};
  const byService: Record<string, number> = {};
  const byModel: Record<string, number> = {};
  const dailyMap: Record<string, number> = {};

  for (const row of rows) {
    const usd = Number(row.cost_usd) || 0;
    allTime += usd;

    const tMs = Date.parse(row.created_at);
    if (Number.isFinite(tMs)) {
      if (tMs >= d30Edge) d30 += usd;
      if (tMs >= d7Edge) d7 += usd;
    }

    bump(byStage, row.stage ?? "unknown", usd);
    bump(byService, row.service ?? "unknown", usd);
    bump(byModel, row.model ?? "unknown", usd);
    bump(dailyMap, row.created_at.slice(0, 10), usd);
  }

  const daily = Object.keys(dailyMap)
    .sort()
    .map((date) => ({ date, usd: round4(dailyMap[date]) }));

  const applied = appliedCount ?? 0;
  const costPerApplied = applied > 0 ? round4(allTime / applied) : null;

  return NextResponse.json({
    total: {
      allTime: round4(allTime),
      d30: round4(d30),
      d7: round4(d7),
    },
    byStage: roundAll(byStage),
    byService: roundAll(byService),
    byModel: roundAll(byModel),
    daily,
    costPerApplied,
    appliedCount: applied,
  });
}

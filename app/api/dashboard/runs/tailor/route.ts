import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dispatchWorkflow } from "@/app/lib/github-dispatch";

/**
 * POST /api/dashboard/runs/tailor  (Phase 3 dashboard run-buttons)
 *
 * Dashboard "Run tailor" button. Inserts a public.runs row (status=
 * 'pending') and dispatches .github/workflows/tailor.yml in the job-
 * pipeline repo with the row id as the workflow `run_id` input.
 *
 * No body parameters: jobpipe-tailor takes no flags beyond --once after
 * PR-13's split (it processes status='approved' rows only, no mode
 * switch).
 *
 * Auth: protected by middleware.ts (dashboard_auth cookie).
 */
export async function POST(_req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Server misconfigured (missing Supabase env vars)" },
      { status: 500 },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: inserted, error: insertErr } = await admin
    .from("runs")
    .insert({
      kind: "tailor",
      status: "pending",
      triggered_by: "dashboard",
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Failed to insert runs row" },
      { status: 500 },
    );
  }

  const runId = inserted.id as string;

  const dispatch = await dispatchWorkflow("tailor.yml", {
    run_id: runId,
  });

  if (!dispatch.ok) {
    await admin
      .from("runs")
      .update({
        status: "failed",
        ended_at: new Date().toISOString(),
        failure_reason: dispatch.errorMessage,
      })
      .eq("id", runId);
    return NextResponse.json(
      { error: dispatch.errorMessage, run_id: runId },
      { status: dispatch.status === 500 ? 500 : 502 },
    );
  }

  return NextResponse.json({ ok: true, run_id: runId });
}

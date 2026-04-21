import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/dashboard/jobs/[job_id]/approve
 *
 * Called by the review-queue detail page when the reviewer has watched the
 * Browserbase replay and is satisfied the agent filled the form correctly.
 *
 * Transition: status=needs_review → submitted. applied_at is stamped so the
 * row sorts correctly in the rest of the dashboard.
 *
 * We deliberately DO NOT clear submission_log here — keeping the packet is
 * useful audit trail if the reviewer later regrets the call. The status
 * column is the source-of-truth for "is this job done".
 *
 * Auth: protected by middleware.ts (dashboard_auth cookie).
 */

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ job_id: string }> },
) {
  const { job_id } = await context.params;
  if (!job_id) {
    return NextResponse.json({ error: "Missing job_id" }, { status: 400 });
  }

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

  // Guard: only flip out of needs_review. If a background submitter job
  // already moved this row (e.g. back to failed on retry), we don't want to
  // trample that.
  const { data: current, error: readErr } = await admin
    .from("jobs")
    .select("id, status")
    .eq("id", job_id)
    .maybeSingle();
  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (current.status !== "needs_review") {
    return NextResponse.json(
      {
        error: `Job is in state "${current.status}", not needs_review. Refresh the queue and try again.`,
      },
      { status: 409 },
    );
  }

  const nowIso = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("jobs")
    .update({
      status: "submitted",
      status_updated_at: nowIso,
      applied_at: nowIso,
    })
    .eq("id", job_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, job_id, status: "submitted" });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/dashboard/jobs/[job_id]/dismiss
 *
 * Called by the review-queue detail page when the reviewer decides the
 * failed/partial submission isn't worth approving OR rerunning. The row
 * gets archived to `ignored` so it stops showing up in the queue.
 *
 * Transition: status=needs_review → ignored. We preserve submission_log
 * so the archival trail stays intact — if the reviewer later changes
 * their mind, the packet is still there.
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

  const { error: updateErr } = await admin
    .from("jobs")
    .update({
      status: "ignored",
      status_updated_at: new Date().toISOString(),
    })
    .eq("id", job_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, job_id, status: "ignored" });
}

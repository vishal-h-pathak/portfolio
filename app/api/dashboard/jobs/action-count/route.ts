import { NextResponse } from "next/server";
import { createAdminClient, MISCONFIGURED_MSG } from "@/app/lib/supabase-admin";

/**
 * GET /api/dashboard/jobs/action-count
 *
 * Count of jobs waiting on the human reviewer (ready_for_review +
 * legacy needs_review). Polled by DashboardNav for the badge. Part of
 * the RLS lockdown — was a direct anon-key count query.
 *
 * Auth: protected by middleware.ts (dashboard_auth cookie).
 */
export async function GET() {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: MISCONFIGURED_MSG }, { status: 500 });
  }

  const { count, error } = await admin
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["ready_for_review", "needs_review"]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ count: count ?? 0 });
}

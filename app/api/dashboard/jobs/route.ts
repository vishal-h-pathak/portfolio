import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, MISCONFIGURED_MSG } from "@/app/lib/supabase-admin";

/**
 * GET /api/dashboard/jobs?view=list|insights|review-queue
 *
 * Server-side jobs reads for the dashboard (RLS lockdown). The browser
 * used to query Supabase directly with the anon key; jobs now has RLS
 * enabled with no anon policies, so all reads go through here on the
 * service role, gated by the dashboard_auth middleware.
 *
 * Views:
 *   - list (default): the /dashboard browse+swipe list. Narrow column
 *     set — jobs rows carry large jsonb (form_answers, submission_log,
 *     match_chat) and a full description that the list never renders,
 *     so they are deliberately excluded from the payload. Includes the
 *     scalar fields ReviewPanel needs since it's opened from list rows.
 *   - insights: /dashboard/insights analytics. Only the handful of
 *     scalar columns the charts aggregate over.
 *   - review-queue: /dashboard/review. Full rows — the queue renders
 *     submission_log packet details, and this surface is the documented
 *     "keep the full fetch" exception.
 *
 * Auth: protected by middleware.ts (dashboard_auth cookie).
 */

// Columns the /dashboard list view (and the panels it opens —
// MatchAgent, ReviewPanel) actually reads. If you render a new job
// field on the list, add it here.
const LIST_COLUMNS = [
  "id",
  "title",
  "company",
  "location",
  "score",
  "tier",
  "reasoning",
  "url",
  "source",
  "status",
  "created_at",
  "status_updated_at",
  "ats_kind",
  "applied_at",
  "failure_reason",
  "confidence",
  "legitimacy",
  "legitimacy_reasoning",
  "archetype",
  "archetype_confidence",
  "application_url",
  "application_notes",
  "resume_path",
  "cover_letter_path",
  "resume_pdf_path",
  "cover_letter_pdf_path",
].join(", ");

const INSIGHTS_COLUMNS = [
  "id",
  "created_at",
  "notified",
  "score",
  "source",
  "status",
  "tier",
].join(", ");

export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: MISCONFIGURED_MSG }, { status: 500 });
  }

  const view = req.nextUrl.searchParams.get("view") ?? "list";

  let query;
  switch (view) {
    case "list":
      query = admin
        .from("jobs")
        .select(LIST_COLUMNS)
        .order("score", { ascending: false });
      break;
    case "insights":
      query = admin
        .from("jobs")
        .select(INSIGHTS_COLUMNS)
        .order("created_at", { ascending: false });
      break;
    case "review-queue":
      query = admin
        .from("jobs")
        .select("*")
        .in("status", ["ready_for_review", "needs_review"])
        .order("status_updated_at", { ascending: false });
      break;
    default:
      return NextResponse.json(
        { error: `Unknown view: ${view}` },
        { status: 400 },
      );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ jobs: data ?? [] });
}

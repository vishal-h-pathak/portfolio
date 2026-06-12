import { NextResponse } from "next/server";
import { getBenchActivity } from "@/app/lib/bench-activity";

/**
 * GET /api/bench/activity — public jobpipe telemetry for the rail.
 *
 * Deliberately NOT in the middleware matcher: this endpoint is
 * world-readable on the portfolio. It must only ever return the
 * sanitized aggregates from getBenchActivity() — no company names, job
 * titles, URLs, run args, or ids. The underlying runs/jobs tables are
 * service-role-only under RLS, which is why this is a server route at
 * all.
 *
 * Cached: ISR-style, revalidated every 5 minutes.
 */

export const revalidate = 300;

export async function GET() {
  const activity = await getBenchActivity();
  if (!activity) {
    // Degrade to an empty-but-valid shape; consumers fall back to
    // their placeholder. Never a 5xx for a decorative rail slot.
    return NextResponse.json({
      events: [],
      totals: { roles_tracked: 0, scored_7d: 0, applications_out: 0 },
    });
  }
  return NextResponse.json(activity);
}

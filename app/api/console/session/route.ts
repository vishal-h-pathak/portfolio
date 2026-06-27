import { NextResponse } from "next/server";

/**
 * Reachability probe for the auth-aware footer console link.
 *
 * This route lives under the gated /api/console/* matcher, so middleware
 * returns 401 for visitors and lets the signed-in owner through to this
 * 200. Only the status code matters — the body is trivial. Keeping the
 * check here (rather than reading the httpOnly cookie in the homepage)
 * means the public landing page stays static/ISR; the probe runs
 * client-side from ConsoleLink after hydration.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true });
}

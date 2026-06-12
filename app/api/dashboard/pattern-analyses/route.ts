import { NextResponse } from "next/server";
import { createAdminClient, MISCONFIGURED_MSG } from "@/app/lib/supabase-admin";

/**
 * GET /api/dashboard/pattern-analyses
 *
 * Latest pattern_analyses row (J-6) for the insights page. Part of the
 * RLS lockdown — was a direct anon-key read.
 *
 * Auth: protected by middleware.ts (dashboard_auth cookie).
 */
export async function GET() {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: MISCONFIGURED_MSG }, { status: 500 });
  }

  const { data, error } = await admin
    .from("pattern_analyses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ analysis: data ?? null });
}

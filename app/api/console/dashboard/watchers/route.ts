import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * /api/console/dashboard/watchers  (feat/dual-machine-watcher)
 *
 * GET  → { active_watcher_id, heartbeats: [{ watcher_id, last_seen, state }] }
 *        The "Active watcher" control reads this to show which machines exist,
 *        whether each is live, and which one is currently allowed to claim
 *        prefilling jobs.
 *
 * POST { watcher_id } → upserts the singleton watcher_config row so the named
 *        machine becomes the active claimer. Pass watcher_id: null to clear it
 *        (every watcher goes dormant). The local watchers pick up the change on
 *        their next poll cycle.
 *
 * Both tables (watcher_config, watcher_heartbeats) are service-role-only (RLS
 * enabled, no policies) — see job-pipeline migration 015. The service-role
 * read/write here is fine because the route is gated by the dashboard_auth
 * middleware.
 *
 * Auth: protected by middleware.ts (dashboard_auth cookie).
 */

function admin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET() {
  const db = admin();
  if (!db) {
    return NextResponse.json(
      { error: "Server misconfigured (missing Supabase env vars)" },
      { status: 500 },
    );
  }

  const [{ data: config, error: cfgErr }, { data: heartbeats, error: hbErr }] =
    await Promise.all([
      db
        .from("watcher_config")
        .select("active_watcher_id")
        .eq("id", true)
        .limit(1),
      db
        .from("watcher_heartbeats")
        .select("watcher_id, last_seen, state")
        .order("last_seen", { ascending: false }),
    ]);

  if (cfgErr) {
    return NextResponse.json({ error: cfgErr.message }, { status: 500 });
  }
  if (hbErr) {
    return NextResponse.json({ error: hbErr.message }, { status: 500 });
  }

  return NextResponse.json({
    active_watcher_id: config?.[0]?.active_watcher_id ?? null,
    heartbeats: heartbeats ?? [],
  });
}

export async function POST(req: NextRequest) {
  const db = admin();
  if (!db) {
    return NextResponse.json(
      { error: "Server misconfigured (missing Supabase env vars)" },
      { status: 500 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    watcher_id?: string | null;
  };
  // Allow null (clear), reject anything that isn't a string or null.
  const watcherId =
    body.watcher_id === null
      ? null
      : typeof body.watcher_id === "string" && body.watcher_id.trim()
        ? body.watcher_id.trim()
        : undefined;
  if (watcherId === undefined) {
    return NextResponse.json(
      { error: "Body must include watcher_id (string) or null to clear" },
      { status: 400 },
    );
  }

  const { error } = await db.from("watcher_config").upsert(
    {
      id: true,
      active_watcher_id: watcherId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ active_watcher_id: watcherId });
}

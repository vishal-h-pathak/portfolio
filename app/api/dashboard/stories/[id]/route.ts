import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, MISCONFIGURED_MSG } from "@/app/lib/supabase-admin";

/**
 * PATCH /api/dashboard/stories/[id]  — toggle is_master.
 *
 * The only star_stories write the dashboard makes. Part of the RLS
 * lockdown — was a direct anon-key update.
 *
 * Auth: protected by middleware.ts (dashboard_auth cookie).
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: `Invalid id: ${id}` }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: MISCONFIGURED_MSG }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as {
    is_master?: unknown;
  } | null;
  if (!body || typeof body.is_master !== "boolean") {
    return NextResponse.json(
      { error: "Expected body { is_master: boolean }" },
      { status: 400 },
    );
  }

  const { error } = await admin
    .from("star_stories")
    .update({ is_master: body.is_master })
    .eq("id", numericId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

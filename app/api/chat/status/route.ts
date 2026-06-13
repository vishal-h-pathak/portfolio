/**
 * GET /api/chat/status → { mode: "api" | "oauth" | "disabled", reason? }
 *
 * Read-only view of the chat-auth resolution chain so the dashboard can
 * decide server-truthfully whether to render the MatchAgent UI at all
 * (no flash of chat UI that then errors). Spends no tokens.
 *
 * Auth: protected by middleware.ts (dashboard_auth cookie).
 */

import { NextResponse } from "next/server";
import { resolveChatAuth } from "../../../lib/chat-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = resolveChatAuth();
  return NextResponse.json(
    auth.mode === "disabled"
      ? { mode: auth.mode, reason: auth.reason }
      : { mode: auth.mode },
    { headers: { "Cache-Control": "no-store" } },
  );
}

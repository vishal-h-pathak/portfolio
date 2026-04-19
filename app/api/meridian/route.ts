import { NextResponse } from "next/server";

/**
 * GET /api/meridian
 *
 * Returns trading decisions from Supabase for the MERIDIAN visualization.
 * Query params:
 *   limit  — max rows (default 100)
 *   from   — ISO date string filter (cycle_date >= from)
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const revalidate = 300; // ISR: revalidate every 5 minutes

export async function GET(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 100), 500);
  const from = searchParams.get("from"); // e.g. "2026-03-29"

  let url = `${SUPABASE_URL}/rest/v1/trading_decisions?order=created_at.desc&limit=${limit}`;
  if (from) {
    url += `&cycle_date=gte.${from}`;
  }

  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error("Supabase fetch failed:", res.status, await res.text());
      return NextResponse.json(
        { error: "Failed to fetch decisions" },
        { status: 502 }
      );
    }

    const rows = await res.json();

    // Transform into the shape the MERIDIAN page expects
    const decisions = rows.map((r: Record<string, unknown>) => ({
      ts: formatTimestamp(r.created_at as string),
      action: r.action,
      symbol: r.symbol ?? null,
      instrument: r.instrument ?? null,
      qty: r.quantity ?? null,
      price: r.price_at_decision ? Number(r.price_at_decision) : null,
      confidence: r.confidence ?? "LOW",
      theme: r.theme ?? r.news_theme ?? "none",
      cycle: r.cycle_type ?? "STANDARD",
      reasoning: r.thesis ?? "",
      quant_score: r.quant_score ? Number(r.quant_score) : null,
      quant_grade: r.quant_grade ?? null,
      component_scores: r.component_scores ?? null,
      brain_agreement: r.brain_agreement ?? null,
      executed: r.executed ?? false,
      mode: r.mode ?? "paper",
      portfolio_value: r.portfolio_value ? Number(r.portfolio_value) : null,
      geo_focus: r.geo_focus ?? null,
      sentiment: r.sentiment ?? null,
    }));

    // Summary stats
    const buys = decisions.filter((d: { action: string }) => d.action === "BUY").length;
    const sells = decisions.filter((d: { action: string }) => d.action === "SELL").length;
    const holds = decisions.filter((d: { action: string }) => d.action === "HOLD").length;

    return NextResponse.json({
      decisions,
      summary: {
        total: decisions.length,
        buys,
        sells,
        holds,
        latest: decisions[0]?.ts ?? null,
      },
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Meridian API error:", err);
    return NextResponse.json(
      { error: "Internal error fetching decisions" },
      { status: 500 }
    );
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mon = months[d.getMonth()];
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${mon} ${day} ${h}:${m}`;
}

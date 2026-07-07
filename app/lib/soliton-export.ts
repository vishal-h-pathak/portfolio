import { createAdminClient } from "@/app/lib/supabase-admin";
import sampleBundle from "@/content/soliton/site-export.sample.json";

/**
 * SOLITON site-export reader.
 *
 * The engine (trading-agent, `rebuild/soliton`) writes a public-safe JSON
 * bundle after every cycle and pushes it to Supabase via
 * `python -m soliton.engine push-export` — default target: table
 * `site_export`, one upserted row `id='soliton'` with the bundle in a
 * `bundle` jsonb column. The contract is docs/SITE_EXPORT_SCHEMA.md in the
 * trading-agent repo (schema_version 1); the engine validates every bundle
 * against it before writing, including public-safety greps (no keys, no
 * account ids, no order ids) — so serving it verbatim from a public page
 * is by construction safe.
 *
 * Server-only (imports the service-role client). Never throws: any
 * failure — missing env, missing table, wrong schema_version — falls back
 * to the checked-in sample fixture (a real P4 dry-run bundle), so the page
 * static-renders the pre-launch state instead of erroring. Mirrors the
 * getFleetStatus / getBenchActivity never-throws contract.
 */

// ── Schema v1 types (docs/SITE_EXPORT_SCHEMA.md) ───────────────────────────
// Per the versioning policy, additive unknown keys MAY appear without a
// version bump, so every shape here is "at least these fields" — renderers
// must tolerate extras and missing optionals.

/** [ISO date, dollars] */
export type CurvePoint = [string, number];

export type SpreadLeg = {
  occ: string;
  option_type: string;
  strike: number;
  expiration: string;
  side: string;
};

export type OpenPosition = {
  kind: "spread" | "equity" | "long_option" | string;
  symbol: string;
  label?: string;
  opened?: string;
  // spread
  legs?: SpreadLeg[];
  qty?: number;
  entry_credit?: number;
  last_mark?: number;
  mark_stale?: boolean;
  // equity
  shares?: number;
  avg_cost?: number;
  // long_option
  occ?: string;
  option_type?: string;
  strike?: number;
  expiration?: string;
  entry_debit?: number;
};

export type ClosedTrade = {
  kind: "spread" | "equity" | "long_option" | "assignment_friction" | string;
  symbol: string;
  pnl: number;
  closed: string;
  reason?: string;
  label?: string;
  qty?: number;
  entry_credit?: number;
  exit_debit?: number;
  expiration_close?: string;
  settlement?: string;
  entry_price?: number;
  exit_price?: number;
  entry_debit?: number;
  exit_value?: number;
  // assignment_friction
  fill_price?: number;
  reference_close?: number;
  side?: string;
};

export type OrderSummary = {
  expiration?: string;
  strikes?: number[];
  qty?: number;
  limit_credit?: number;
  modeled_credit_mid?: number;
  [key: string]: unknown;
};

/**
 * Journal reasoning record, public projection. Known kinds:
 * gate_evaluation (Track A), state_print (Track C/CS2), kill, skip_decide.
 * Future tracks (the Fable accounts) will add kinds — render unknowns
 * generically off decision/reason/rationale rather than dropping them.
 */
export type DecisionRecord = {
  record: string;
  as_of?: string;
  timestamp?: string;
  track?: string;
  decision?: string;
  reason?: string;
  rationale?: string;
  // gate_evaluation
  iv_rank?: number;
  gate?: number;
  n_open?: number;
  order?: OrderSummary;
  // state_print
  dials?: { ts?: number | null; d200?: number | null; lppls?: number | null };
  raw_state?: string;
  state?: string;
  prev_state?: string;
  transition?: boolean;
  orders?: OrderSummary[];
  [key: string]: unknown;
};

export type SolitonTrack = {
  id: string;
  name: string;
  symbol: string;
  evidence_label: string;
  signals_only: boolean;
  status: "armed" | "halted" | string;
  halt_reason: string | null;
  virtual_capital: number;
  equity_curve: CurvePoint[];
  spy_benchmark: CurvePoint[];
  open_positions: OpenPosition[];
  trade_log: ClosedTrade[];
  decisions: DecisionRecord[];
  last_updated: string;
};

export type SolitonBundle = {
  schema_version: number;
  generated_at: string;
  as_of: string;
  benchmark: { symbol: string; closes: CurvePoint[] };
  tracks: SolitonTrack[];
};

export type SolitonExport = {
  bundle: SolitonBundle;
  /** "live" = read from Supabase this render; "sample" = checked-in fixture. */
  source: "live" | "sample";
};

// ── Fetch ───────────────────────────────────────────────────────────────────

const SCHEMA_VERSION = 1;

function isBundle(x: unknown): x is SolitonBundle {
  if (typeof x !== "object" || x === null) return false;
  const b = x as Record<string, unknown>;
  return (
    b.schema_version === SCHEMA_VERSION &&
    typeof b.generated_at === "string" &&
    typeof b.as_of === "string" &&
    Array.isArray(b.tracks) &&
    b.tracks.every(
      (t) =>
        typeof t === "object" &&
        t !== null &&
        typeof (t as Record<string, unknown>).id === "string" &&
        Array.isArray((t as Record<string, unknown>).equity_curve),
    )
  );
}

const SAMPLE: SolitonBundle = sampleBundle as unknown as SolitonBundle;

export async function getSolitonExport(): Promise<SolitonExport> {
  try {
    const admin = createAdminClient();
    if (!admin) return { bundle: SAMPLE, source: "sample" };

    const { data, error } = await admin
      .from("site_export")
      .select("bundle")
      .eq("id", "soliton")
      .maybeSingle();

    // A schema_version we don't speak is treated as absent (the versioning
    // policy says a bump means breaking change — safer to show the honest
    // pre-launch fixture than to misrender live money curves).
    if (error || !data || !isBundle(data.bundle)) {
      return { bundle: SAMPLE, source: "sample" };
    }
    return { bundle: data.bundle, source: "live" };
  } catch {
    return { bundle: SAMPLE, source: "sample" };
  }
}

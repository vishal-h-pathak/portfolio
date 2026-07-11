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
 * trading-agent repo (schema_version 2); the engine validates every bundle
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

// ── Schema v2 types (docs/SITE_EXPORT_SCHEMA.md) ───────────────────────────
// Per the versioning policy, additive unknown keys MAY appear without a
// version bump, so every shape here is "at least these fields" — renderers
// must tolerate extras and missing optionals.
//
// v1 → v2: client_order_id is gone everywhere, replaced by a public
// position_key (stable sha256 prefix) shared across a decision's order
// summary, the open position, and the closed trade — linking is exact now.
// The Fable tracks landed with PINNED ids: FA = fable-aggressive,
// FE = fable-economist (there is NO FC — removed by operator amendment
// before build), plus the fable_decision record kind, per-track caps, and
// regime_plane on the Track C family.

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
  position_key?: string;
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
  position_key?: string;
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
  // v2: share delta implied by physical exercise/assignment on settlements
  physical_delta_shares?: number;
};

export type OrderSummary = {
  expiration?: string;
  strikes?: number[];
  qty?: number;
  limit_credit?: number;
  modeled_credit_mid?: number;
  position_key?: string;
  // Fable equity order summaries (code-built; the model never constructs
  // orders) carry these instead of the spread fields:
  side?: string;
  symbol?: string;
  shares?: number;
  est_notional_usd?: number;
  requested_notional_usd?: number;
  thesis_id?: string;
  // FA option punts
  structure?: string;
  underlying?: string;
  risk_budget_usd?: number;
  [key: string]: unknown;
};

/** v2 — cap config + loss-stop/cost-cap state on tracks that declare them
 * (the Fable accounts). day/week P&L are null until enough equity points. */
export type TrackCaps = {
  bankroll_usd?: number;
  day_pnl_usd?: number | null;
  week_pnl_usd?: number | null;
  daily_loss_stop_usd?: number;
  weekly_loss_stop_usd?: number;
  per_punt_cap_usd?: number; // FA
  per_position_cap_usd?: number; // FE
  max_concurrent?: number;
  daily_llm_cost_cap_usd?: number;
  [key: string]: unknown;
};

/** v2 — outcome of validating a Fable decision against the coded caps. */
export type FableValidation = {
  outcome?: string; // accepted | accepted_partial | all_orders_invalid | ...
  problems?: string[];
};

/** v2, FE only — an active thesis-journal entry. */
export type FableThesis = {
  id?: string;
  title?: string;
  thesis?: string;
  conviction?: number;
  created?: string;
  updated?: string;
};

export type FableThesisUpdate = {
  action?: string;
  thesis_id?: string;
  title?: string;
  rationale?: string;
  [key: string]: unknown;
};

export type FableCost = {
  usd?: number;
  day_usd?: number;
  cap_usd?: number;
  n_calls?: number;
  input_tokens?: number;
  output_tokens?: number;
  web_searches?: number;
  [key: string]: unknown;
};

/**
 * Journal reasoning record, public projection. Known kinds:
 * gate_evaluation (Track A), state_print (Track C/CS2), kill, skip_decide,
 * and fable_decision (FA/FE, v2 — one per Fable track per session). Render
 * unknown future kinds generically off decision/reason/rationale rather
 * than dropping them.
 */
export type DecisionRecord = {
  record: string;
  as_of?: string;
  timestamp?: string;
  track?: string;
  decision?: string;
  reason?: string;
  /** Fable one-paragraph rationale, VERBATIM — untrusted prose, render as
   * text only, never as markup. */
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
  // fable_decision (v2)
  model?: string;
  prompt_version?: string;
  prompt_sha256?: string;
  state_packet_sha256?: string;
  decision_raw?: Record<string, unknown>;
  /** Model's own flag: traded only to satisfy the daily-trade mandate. */
  mandate_forced?: boolean;
  /** Code's accounting: did at least one position action survive validation. */
  mandate_met?: boolean;
  validation?: FableValidation;
  cost?: FableCost;
  // FE only
  thesis_updates?: FableThesisUpdate[];
  theses?: FableThesis[];
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
  // v2, optional — Fable accounts only
  caps?: TrackCaps;
  // v2, optional — Track C family only: [date, hurst, entropy], nullable dims
  regime_plane?: [string, number | null, number | null][];
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

const SCHEMA_VERSION = 2;

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

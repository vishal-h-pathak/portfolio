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
 * trading-agent repo; the engine validates every bundle against it before
 * writing, including public-safety greps (no keys, no account ids, no order
 * ids) — so serving it verbatim from a public page is by construction safe.
 *
 * Schema versions: we speak v2 and v3. v3 was an ADDITIVE bump — it added
 * fields (top-level `methodology`; per-fable-decision `llm_backend` /
 * `llm_client_version`; `cost.billing`) without changing or removing any v2
 * field. Per the versioning policy additive keys may appear WITHOUT a bump,
 * so validation only asserts the fields we actually render and tolerates
 * unknown extras. We accept any version in SUPPORTED_SCHEMA_VERSIONS.
 *
 * Server-only (imports the service-role client). Never throws: any
 * failure — missing env, missing table, malformed bundle — falls back to the
 * checked-in sample fixture, so the page static-renders the pre-launch state
 * instead of erroring. Mirrors the getFleetStatus / getBenchActivity
 * never-throws contract. The fallback is NEVER silent: when a live row is
 * present but rejected (notably a schema_version we don't yet speak — exactly
 * the class of bug a future additive→breaking bump would cause), we log the
 * reason and surface it on `SolitonExport.fallbackReason` so it is visible.
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
  // v3 — how this decision's LLM call was billed: "metered" (Anthropic API,
  // real per-token spend) or "subscription" (headless Claude Code on the
  // operator's Claude Max plan, no marginal cost).
  billing?: "metered" | "subscription" | string;
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
  // v3 — transport of the LLM call: "anthropic_api" (metered) or
  // "claude_code" (headless, on the Claude Max subscription). Paired with
  // llm_client_version (e.g. the Claude Code version string).
  llm_backend?: string;
  llm_client_version?: string;
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
  // v3, optional — operator prose describing how LLM decisions are made and
  // billed (rendered as text only; never as markup).
  methodology?: string[];
};

export type SolitonExport = {
  bundle: SolitonBundle;
  /** "live" = read from Supabase this render; "sample" = checked-in fixture. */
  source: "live" | "sample";
  /** Set only when we HAD a live row but fell back to the sample anyway —
   * the human-readable reason (e.g. an unsupported schema_version). Undefined
   * on a clean live read or an expected pre-launch fallback. */
  fallbackReason?: string;
};

// ── Fetch ───────────────────────────────────────────────────────────────────

// Every version whose rendered shape we understand. v3 is additive over v2
// (see the header comment), so both render with the same code. A future
// version is rejected rather than misrendered — but LOUDLY (see below), so
// the next additive bump is a one-line edit here, not a silent blank page.
const SUPPORTED_SCHEMA_VERSIONS = [2, 3];

/**
 * Validate a candidate bundle. Returns null if it is a bundle we can render,
 * otherwise a human-readable rejection reason. We assert only the fields the
 * page actually reads (version, generated_at, as_of, and each track's id +
 * equity_curve) and ignore unknown/additive keys — that tolerance is what
 * lets an additive bump land without a code change.
 */
function bundleRejectReason(x: unknown): string | null {
  if (typeof x !== "object" || x === null) return "bundle is not an object";
  const b = x as Record<string, unknown>;
  if (typeof b.schema_version !== "number")
    return `missing/non-numeric schema_version (${typeof b.schema_version})`;
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(b.schema_version))
    return `unsupported schema_version ${b.schema_version} (this reader speaks ${SUPPORTED_SCHEMA_VERSIONS.join("/")}) — likely a new bundle version the reader hasn't been taught yet`;
  if (typeof b.generated_at !== "string") return "missing generated_at";
  if (typeof b.as_of !== "string") return "missing as_of";
  if (!Array.isArray(b.tracks)) return "tracks is not an array";
  const bad = b.tracks.findIndex(
    (t) =>
      typeof t !== "object" ||
      t === null ||
      typeof (t as Record<string, unknown>).id !== "string" ||
      !Array.isArray((t as Record<string, unknown>).equity_curve),
  );
  if (bad !== -1) return `track[${bad}] missing id or equity_curve`;
  return null;
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

    if (error) {
      const reason = `site_export query error: ${error.message}`;
      console.warn(`[soliton-export] falling back to sample — ${reason}`);
      return { bundle: SAMPLE, source: "sample", fallbackReason: reason };
    }
    if (!data) {
      // No row yet — the expected pre-launch state. Quiet, non-alarming.
      return { bundle: SAMPLE, source: "sample" };
    }

    // A row exists. If we reject it we are choosing the fixture over real
    // data, so this must NEVER be silent — log the reason and surface it.
    const reason = bundleRejectReason(data.bundle);
    if (reason) {
      console.warn(
        `[soliton-export] live row present but rejected; serving sample instead — ${reason}`,
      );
      return { bundle: SAMPLE, source: "sample", fallbackReason: reason };
    }

    return { bundle: data.bundle as SolitonBundle, source: "live" };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.warn(`[soliton-export] falling back to sample — threw: ${reason}`);
    return { bundle: SAMPLE, source: "sample", fallbackReason: reason };
  }
}

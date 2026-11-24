import { createAdminClient } from "@/app/lib/supabase-admin";
import { assessStaleness, type Staleness } from "@/app/lib/vane-sessions";

/**
 * VANE site-export reader.
 *
 * Contract: ops/vane/EXPORT_SCHEMA.md in the trading-agent repo (schema_version
 * 1). The engine upserts one row into `public.site_export` with id `vane` and
 * the bundle in the `bundle` jsonb column; rehearsals write `vane-staging`,
 * which this reader never touches.
 *
 * The rule this file exists to enforce: NEVER show something that looks live
 * and is not. There is no sample fixture in the app. Every outcome is one of
 *   ok     - a row was found, passed strict validation (and may still carry a
 *            stale warning, computed separately)
 *   empty  - the query succeeded and there is no `vane` row yet (the expected
 *            state before the engine's first export)
 *   error  - missing config, query failure, or a row that fails validation
 *            (including any schema_version we do not list). Rendered explicitly.
 * `getVaneExport` never throws and never substitutes data.
 */

export const SUPPORTED_SCHEMA_VERSIONS = [1] as const;
export const EXPORT_ROW_ID = "vane";

// ── types ──────────────────────────────────────────────────────────────────
export type Regime = "risk_on" | "risk_off";
export type EvidenceLabel = "unproven" | "backtested-oos-pass";

export type CurvePoint = {
  session: string;
  equity: number;
  spy_tr_index: number;
  vane_index: number;
};
export type Position = {
  tranche: number;
  symbol: string;
  qty: number;
  avg_entry: number | null;
  mark: number;
  market_value: number;
  entered_session: string | null;
};
export type Trade = {
  session: string;
  submitted_at: string | null;
  filled_at: string | null;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  fill_price: number | null;
  tranche: number;
  client_order_id: string;
  floor_trade: boolean;
  status: string;
};
export type Week = {
  week_start: string;
  sessions: number;
  required: number;
  filled: number;
  floor_trades: number;
  met: boolean;
  complete: boolean;
};
export type VaneBundle = {
  schema_version: 1;
  system: "vane";
  config_id: string;
  evidence_label: EvidenceLabel;
  as_of_session: string;
  exported_at: string;
  day0: { session: string; equity: number; spy_tr_close: number };
  equity_curve: CurvePoint[];
  summary: {
    equity: number;
    total_return: number;
    spy_total_return: number;
    excess_return: number;
    peak_equity: number;
    drawdown: number;
    degrossed: boolean;
    regime: Regime;
  };
  positions: Position[];
  cash: number;
  tbill: { symbol: string; qty: number; market_value: number };
  trades: Trade[];
  weeks: Week[];
  last_cycle: {
    started_at: string;
    finished_at: string | null;
    outcome: string;
    error: string | null;
  };
  strategy_text: string;
  research: { verdict: string; evidence_label: EvidenceLabel; report_url: string | null };
  disclosures: { date: string; text: string }[];
};

export type VaneResult =
  | { status: "ok"; bundle: VaneBundle; staleness: Staleness }
  | { status: "empty" }
  | { status: "error"; kind: "config" | "query" | "validation" | "unexpected"; message: string; details?: string[] };

// ── validation ─────────────────────────────────────────────────────────────
type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const HTTPS_RE = /^https:\/\//;
// Retired names never render. Assembled from fragments so this source stays grep-clean.
const RETIRED_RE = new RegExp(["sol" + "iton", "mer" + "idian"].join("|"), "i");
const EVIDENCE: readonly string[] = ["unproven", "backtested-oos-pass"];
const REGIMES: readonly string[] = ["risk_on", "risk_off"];
const TOP_KEYS = [
  "schema_version", "system", "config_id", "evidence_label", "as_of_session", "exported_at",
  "day0", "equity_curve", "summary", "positions", "cash", "tbill", "trades", "weeks",
  "last_cycle", "strategy_text", "research", "disclosures",
] as const;

class Check {
  errors: string[] = [];
  fail(path: string, msg: string) {
    if (this.errors.length < 25) this.errors.push(`${path}: ${msg}`);
  }
  num(o: Rec, k: string, path: string, opts: { int?: boolean; min?: number; nullable?: boolean } = {}) {
    const v = o[k];
    if (v === null && opts.nullable) return;
    if (typeof v !== "number" || !Number.isFinite(v)) return this.fail(`${path}.${k}`, "expected finite number");
    if (opts.int && !Number.isInteger(v)) this.fail(`${path}.${k}`, "expected integer");
    if (opts.min !== undefined && v < opts.min) this.fail(`${path}.${k}`, `expected >= ${opts.min}`);
  }
  str(o: Rec, k: string, path: string, opts: { nullable?: boolean; re?: RegExp; nonEmpty?: boolean } = {}) {
    const v = o[k];
    if (v === null && opts.nullable) return;
    if (typeof v !== "string") return this.fail(`${path}.${k}`, "expected string");
    if (opts.nonEmpty && v.trim() === "") this.fail(`${path}.${k}`, "must not be empty");
    if (opts.re && !opts.re.test(v)) this.fail(`${path}.${k}`, `bad format: ${JSON.stringify(v.slice(0, 40))}`);
  }
  bool(o: Rec, k: string, path: string) {
    if (typeof o[k] !== "boolean") this.fail(`${path}.${k}`, "expected boolean");
  }
  oneOf(o: Rec, k: string, path: string, allowed: readonly string[]) {
    if (typeof o[k] !== "string" || !allowed.includes(o[k] as string))
      this.fail(`${path}.${k}`, `expected one of ${allowed.join("|")}`);
  }
  obj(o: Rec, k: string, path: string): Rec | null {
    const v = o[k];
    if (!isRec(v)) {
      this.fail(`${path}.${k}`, "expected object");
      return null;
    }
    return v;
  }
  arr(o: Rec, k: string, path: string): unknown[] | null {
    const v = o[k];
    if (!Array.isArray(v)) {
      this.fail(`${path}.${k}`, "expected array");
      return null;
    }
    return v;
  }
  each(o: Rec, k: string, path: string, fn: (item: Rec, p: string) => void) {
    const a = this.arr(o, k, path);
    if (!a) return;
    a.forEach((item, i) => {
      const p = `${path}.${k}[${i}]`;
      if (!isRec(item)) return this.fail(p, "expected object");
      fn(item, p);
    });
  }
}

export type Validation = { ok: true; bundle: VaneBundle } | { ok: false; errors: string[] };

/** Strict validation of one `vane` bundle. Pure; no I/O. */
export function validateVaneBundle(raw: unknown): Validation {
  if (!isRec(raw)) return { ok: false, errors: ["bundle: expected a JSON object"] };

  // Version gate first: a version we do not list is a mismatch, whatever else is in there.
  const ver = raw.schema_version;
  if (!(SUPPORTED_SCHEMA_VERSIONS as readonly unknown[]).includes(ver)) {
    return {
      ok: false,
      errors: [
        `schema_version ${JSON.stringify(ver)} is not supported (this reader speaks ${SUPPORTED_SCHEMA_VERSIONS.join(", ")})`,
      ],
    };
  }

  const c = new Check();
  const known = new Set<string>(TOP_KEYS);
  for (const k of Object.keys(raw)) if (!known.has(k)) c.fail(k, "unexpected top-level key (contract change requires a schema_version bump)");
  for (const k of TOP_KEYS) if (!(k in raw)) c.fail(k, "missing");

  if (raw.system !== "vane") c.fail("system", `expected "vane", got ${JSON.stringify(raw.system)}`);
  c.str(raw, "config_id", "$", { nonEmpty: true });
  c.oneOf(raw, "evidence_label", "$", EVIDENCE);
  c.str(raw, "as_of_session", "$", { re: DATE_RE });
  c.str(raw, "exported_at", "$", { re: TS_RE });
  c.num(raw, "cash", "$");

  const day0 = c.obj(raw, "day0", "$");
  if (day0) {
    c.str(day0, "session", "$.day0", { re: DATE_RE });
    c.num(day0, "equity", "$.day0", { min: 0 });
    c.num(day0, "spy_tr_close", "$.day0", { min: 0 });
  }

  c.each(raw, "equity_curve", "$", (p, path) => {
    c.str(p, "session", path, { re: DATE_RE });
    c.num(p, "equity", path);
    c.num(p, "spy_tr_index", path);
    c.num(p, "vane_index", path);
  });
  if (Array.isArray(raw.equity_curve) && raw.equity_curve.length === 0)
    c.fail("$.equity_curve", "must contain at least the Day 0 point");

  const s = c.obj(raw, "summary", "$");
  if (s) {
    for (const k of ["equity", "total_return", "spy_total_return", "excess_return", "peak_equity", "drawdown"])
      c.num(s, k, "$.summary");
    c.bool(s, "degrossed", "$.summary");
    c.oneOf(s, "regime", "$.summary", REGIMES);
  }

  c.each(raw, "positions", "$", (p, path) => {
    c.num(p, "tranche", path, { int: true, min: 0 });
    c.str(p, "symbol", path, { nonEmpty: true });
    for (const k of ["qty", "mark", "market_value"]) c.num(p, k, path);
    c.num(p, "avg_entry", path, { nullable: true });
    c.str(p, "entered_session", path, { re: DATE_RE, nullable: true });
  });

  const tb = c.obj(raw, "tbill", "$");
  if (tb) {
    c.str(tb, "symbol", "$.tbill", { nonEmpty: true });
    c.num(tb, "qty", "$.tbill");
    c.num(tb, "market_value", "$.tbill");
  }

  c.each(raw, "trades", "$", (t, path) => {
    c.str(t, "session", path, { re: DATE_RE });
    c.str(t, "submitted_at", path, { re: TS_RE, nullable: true });
    c.str(t, "filled_at", path, { re: TS_RE, nullable: true });
    c.str(t, "symbol", path, { nonEmpty: true });
    c.oneOf(t, "side", path, ["buy", "sell"]);
    c.num(t, "qty", path);
    c.num(t, "fill_price", path, { nullable: true });
    c.num(t, "tranche", path, { int: true, min: 0 });
    c.str(t, "client_order_id", path, { nonEmpty: true });
    c.bool(t, "floor_trade", path);
    c.str(t, "status", path, { nonEmpty: true });
  });
  if (Array.isArray(raw.trades) && raw.trades.length > 200) c.fail("$.trades", "more than the contracted cap of 200");

  c.each(raw, "weeks", "$", (w, path) => {
    c.str(w, "week_start", path, { re: DATE_RE });
    for (const k of ["sessions", "required", "filled", "floor_trades"]) c.num(w, k, path, { int: true, min: 0 });
    c.bool(w, "met", path);
    c.bool(w, "complete", path);
    const { sessions, required, filled, floor_trades: ft, met } = w as Record<string, unknown>;
    if ([sessions, required, filled, ft].every((v) => typeof v === "number")) {
      if (met !== undefined && met !== ((filled as number) >= (required as number)))
        c.fail(`${path}.met`, "must equal (filled >= required)");
      if ((ft as number) > (filled as number)) c.fail(`${path}.floor_trades`, "must not exceed filled");
      if (required !== ((sessions as number) >= 3 ? 3 : 2))
        c.fail(`${path}.required`, "must be 3 if sessions >= 3 else 2");
    }
  });

  const lc = c.obj(raw, "last_cycle", "$");
  if (lc) {
    c.str(lc, "started_at", "$.last_cycle", { re: TS_RE });
    c.str(lc, "finished_at", "$.last_cycle", { re: TS_RE, nullable: true });
    c.str(lc, "outcome", "$.last_cycle", { nonEmpty: true });
    c.str(lc, "error", "$.last_cycle", { nullable: true });
  }

  c.str(raw, "strategy_text", "$", { nonEmpty: true });

  const r = c.obj(raw, "research", "$");
  if (r) {
    c.str(r, "verdict", "$.research", { nonEmpty: true });
    c.oneOf(r, "evidence_label", "$.research", EVIDENCE);
    c.str(r, "report_url", "$.research", { nullable: true, re: HTTPS_RE });
  }

  c.each(raw, "disclosures", "$", (d, path) => {
    c.str(d, "date", path, { re: DATE_RE });
    c.str(d, "text", path, { nonEmpty: true });
  });

  // Cross-field consistency: a bundle that contradicts itself is a mismatch, not data.
  if (raw.evidence_label !== undefined && r && r.evidence_label !== raw.evidence_label)
    c.fail("$.research.evidence_label", "disagrees with top-level evidence_label");
  if (day0 && Array.isArray(raw.equity_curve) && raw.equity_curve.length > 0) {
    const first = raw.equity_curve[0];
    if (isRec(first) && first.session !== day0.session) c.fail("$.equity_curve[0].session", "must equal day0.session");
  }

  // Retired names never render: reject any string (value or key) that contains one.
  const scan = (v: unknown, path: string) => {
    if (typeof v === "string") {
      if (RETIRED_RE.test(v)) c.fail(path, "contains a retired name");
    } else if (Array.isArray(v)) v.forEach((x, i) => scan(x, `${path}[${i}]`));
    else if (isRec(v))
      for (const [k, x] of Object.entries(v)) {
        if (RETIRED_RE.test(k)) c.fail(`${path}.${k}`, "key contains a retired name");
        scan(x, `${path}.${k}`);
      }
  };
  scan(raw, "$");

  return c.errors.length ? { ok: false, errors: c.errors } : { ok: true, bundle: raw as unknown as VaneBundle };
}

// ── reader ─────────────────────────────────────────────────────────────────
export async function getVaneExport(now: Date = new Date()): Promise<VaneResult> {
  try {
    const admin = createAdminClient();
    if (!admin) {
      return {
        status: "error",
        kind: "config",
        message: "Export source is not configured (Supabase env vars missing on this deployment).",
      };
    }
    const { data, error } = await admin
      .from("site_export")
      .select("bundle")
      .eq("id", EXPORT_ROW_ID)
      .maybeSingle();
    if (error) {
      console.error(`[vane-export] query error: ${error.message}`);
      return { status: "error", kind: "query", message: `Could not read the export row: ${error.message}` };
    }
    if (!data) return { status: "empty" };
    return interpretRow(data.bundle, now);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[vane-export] unexpected failure: ${message}`);
    return { status: "error", kind: "unexpected", message: `Export read failed: ${message}` };
  }
}

/** Row payload -> result. Split out so tests exercise the exact production path without a database. */
export function interpretRow(bundle: unknown, now: Date = new Date()): VaneResult {
  const v = validateVaneBundle(bundle);
  if (!v.ok) {
    console.error(`[vane-export] row rejected: ${v.errors.join("; ")}`);
    return {
      status: "error",
      kind: "validation",
      message: "The export row does not match the schema this page understands, so nothing is shown.",
      details: v.errors,
    };
  }
  return { status: "ok", bundle: v.bundle, staleness: assessStaleness(v.bundle.as_of_session, now) };
}

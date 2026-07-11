import type {
  CurvePoint,
  DecisionRecord,
  OrderSummary,
  SolitonBundle,
  SolitonTrack,
} from "@/app/lib/soliton-export";
import { trackRole } from "./derive";

/**
 * The daily digest — pure derivations for the written day-over-day log.
 * Everything is computed deterministically from the export bundle (no LLM
 * call, no engine change): a "cycle" is a session date on which at least
 * one Fable account produced a fable_decision record, and every number in
 * an entry traces back to a bundle field. Tolerates day-zero bundles and
 * missing tracks; returns [] pre-launch so the page degrades cleanly.
 */

// ── Anchors ─────────────────────────────────────────────────────────────────
// The digest links each entry's rationale excerpt to the full record in the
// decision log. fable_decision is one-per-track-per-session, so track+date
// is a stable id; DecisionLog stamps the same anchor on its entries.

export function decisionAnchor(trackId: string, d: DecisionRecord): string {
  const date = d.as_of ?? (d.timestamp ?? "").slice(0, 10);
  return `sol-dec-${trackId}-${date}-${d.record}`.replace(/[^\w-]/g, "");
}

// ── Curve lookups ───────────────────────────────────────────────────────────

/** Marked value on the session date (exact point, else the last one before). */
function curveValueOn(curve: CurvePoint[], date: string): number | null {
  let best: number | null = null;
  for (const [d, v] of curve) {
    if (d <= date) best = v;
    else break;
  }
  return best;
}

/** Marked value on the previous session (last point strictly before date). */
function curveValueBefore(curve: CurvePoint[], date: string): number | null {
  let best: number | null = null;
  for (const [d, v] of curve) {
    if (d < date) best = v;
    else break;
  }
  return best;
}

// ── Digest shape ────────────────────────────────────────────────────────────

export type FableDay = {
  track: SolitonTrack;
  record: DecisionRecord;
  /** vs the previous session's mark; null on the first session. */
  dayPnl: number | null;
  /** vs the account's starting bankroll (virtual_capital). */
  sinceLaunchPnl: number | null;
  anchor: string;
};

export type ReferenceDay = {
  track: SolitonTrack;
  /** The session's effective gate/state record, if any. */
  record: DecisionRecord | null;
  /** kill / skip_decide reason when the track sat the session out. */
  haltReason: string | null;
};

export type DigestDay = {
  date: string;
  /** 1-based, counted from the first Fable session ("Day N"). */
  dayNumber: number;
  fa: FableDay | null;
  fe: FableDay | null;
  /** Track A (the mechanical control) on this date. */
  gate: ReferenceDay | null;
  /** SPY close-over-close move for the session, %; null without a prior close. */
  spyPct: number | null;
};

function fableDecisionOn(
  track: SolitonTrack,
  date: string,
): DecisionRecord | undefined {
  // decisions arrive most-recent-first; first hit is the session's record
  return track.decisions.find(
    (d) => d.record === "fable_decision" && (d.as_of ?? "") === date,
  );
}

function fableDay(track: SolitonTrack | undefined, date: string): FableDay | null {
  if (!track) return null;
  const record = fableDecisionOn(track, date);
  if (!record) return null;
  const value = curveValueOn(track.equity_curve, date);
  const prev = curveValueBefore(track.equity_curve, date);
  return {
    track,
    record,
    dayPnl: value != null && prev != null ? value - prev : null,
    sinceLaunchPnl:
      value != null && Number.isFinite(track.virtual_capital)
        ? value - track.virtual_capital
        : null,
    anchor: decisionAnchor(track.id, record),
  };
}

function referenceDay(bundle: SolitonBundle, date: string): ReferenceDay | null {
  // The mechanical control is the reference story the template tells; key
  // off the gate_evaluation record kind rather than a hard-coded id.
  for (const track of bundle.tracks) {
    if (trackRole(track) === "protagonist" || track.signals_only) continue;
    const forDate = track.decisions.filter((d) => (d.as_of ?? "") === date);
    if (forDate.length === 0) continue;
    const gate = forDate.find((d) => d.record === "gate_evaluation");
    if (gate) return { track, record: gate, haltReason: null };
    const halt = forDate.find(
      (d) => d.record === "kill" || d.record === "skip_decide",
    );
    if (halt) {
      return { track, record: null, haltReason: halt.reason ?? null };
    }
  }
  return null;
}

function spyPctOn(bundle: SolitonBundle, date: string): number | null {
  const closes = bundle.benchmark?.closes ?? [];
  const close = curveValueOn(closes, date);
  const prev = curveValueBefore(closes, date);
  if (close == null || prev == null || prev === 0) return null;
  return ((close - prev) / prev) * 100;
}

/**
 * One entry per cycle, newest first. Empty when no Fable account has logged
 * a session yet — the pre-launch state.
 */
export function digestDays(bundle: SolitonBundle): DigestDay[] {
  const faTrack = bundle.tracks.find((t) => t.id === "FA");
  const feTrack = bundle.tracks.find((t) => t.id === "FE");

  const dates = new Set<string>();
  for (const t of [faTrack, feTrack]) {
    for (const d of t?.decisions ?? []) {
      if (d.record === "fable_decision" && d.as_of) dates.add(d.as_of);
    }
  }
  const ordered = [...dates].sort(); // ascending → day numbers

  return ordered
    .map((date, i) => ({
      date,
      dayNumber: i + 1,
      fa: fableDay(faTrack, date),
      fe: fableDay(feTrack, date),
      gate: referenceDay(bundle, date),
      spyPct: spyPctOn(bundle, date),
    }))
    .reverse(); // newest first
}

// ── Order/record readings used by the prose templates ───────────────────────

/** "put_spread" → "put spread"; unknown structures pass through cleaned. */
export function fmtStructure(s: string | undefined): string {
  return (s ?? "position").replace(/_/g, " ");
}

/**
 * FA's proposed order for the session: prefer the code-built summaries
 * (validated, carry position_key); when validation bounced everything the
 * summaries are empty, so fall back to the model's own proposal in
 * decision_raw — clearly a proposal, never an executed order.
 */
export function faProposedOrder(record: DecisionRecord): OrderSummary | null {
  const built = record.orders?.[0];
  if (built) return built;
  const raw = record.decision_raw?.orders;
  if (Array.isArray(raw) && raw.length > 0) return raw[0] as OrderSummary;
  return null;
}

/** Unique symbols on a side ("buy"/"sell") of the executed order summaries. */
export function orderSymbols(record: DecisionRecord, side: string): string[] {
  const out: string[] = [];
  for (const o of record.orders ?? []) {
    const sym = o.symbol ?? o.underlying;
    if (o.side === side && typeof sym === "string" && !out.includes(sym)) {
      out.push(sym);
    }
  }
  return out;
}

/** Unique thesis names across the executed order summaries (FE). */
export function orderTheses(record: DecisionRecord): string[] {
  const out: string[] = [];
  for (const o of record.orders ?? []) {
    if (typeof o.thesis_id === "string" && !out.includes(o.thesis_id)) {
      out.push(o.thesis_id);
    }
  }
  return out;
}

/** First ~n chars of the verbatim rationale, cut on a word boundary. */
export function rationaleExcerpt(
  record: DecisionRecord,
  n = 220,
): string | null {
  const r = record.rationale;
  if (typeof r !== "string" || r.length === 0) return null;
  if (r.length <= n) return r;
  const cut = r.slice(0, n);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), n - 30))}…`;
}

/** English list: ["MU","VRT"] → "MU and VRT"; 3+ get commas. */
export function englishList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

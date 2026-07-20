import type {
  ClosedTrade,
  CurvePoint,
  DecisionRecord,
  SolitonBundle,
  SolitonTrack,
} from "@/app/lib/soliton-export";

/**
 * Pure derivations over the site-export bundle — no fetching, no React.
 * Everything here must tolerate day-zero bundles (single-point curves,
 * empty trade logs) and unknown future tracks/record kinds.
 */

// ── Track roles ─────────────────────────────────────────────────────────────
// The page's framing: the two Fable accounts are the protagonists;
// everything else is a reference line. The engine doesn't export a role
// field, so classify off id/name. Schema v2 PINS the Fable ids:
// FA = fable-aggressive, FE = fable-economist (no FC — the conservative
// account was removed by operator amendment before build). Match the name
// too so any future protagonist still lands on the right side of the line.

export type TrackRole = "protagonist" | "reference";

export function trackRole(track: Pick<SolitonTrack, "id" | "name">): TrackRole {
  if (/^F/i.test(track.id)) return "protagonist";
  if (/fable/i.test(track.name)) return "protagonist";
  return "reference";
}

/**
 * Per-track chart/panel presentation. Protagonists get the site's two
 * accents; reference lines stay in inks with distinct dashes so the
 * hierarchy reads even in grayscale. Unknown ids fall back by role.
 */
export type TrackStyle = { color: string; dash?: string };

const KNOWN_STYLES: Record<string, TrackStyle> = {
  FE: { color: "var(--green)" },
  FA: { color: "var(--amber)" },
  A: { color: "var(--ink-dim)", dash: "6 3" },
  C: { color: "var(--ink-dim)", dash: "2 3" },
  CS2: { color: "var(--ink-faint)", dash: "1 4" },
  D: { color: "var(--ink-dim)", dash: "8 3 2 3" },
};

export function trackStyle(track: Pick<SolitonTrack, "id" | "name">): TrackStyle {
  const known = KNOWN_STYLES[track.id];
  if (known) return known;
  if (trackRole(track) === "protagonist") {
    // Second/unexpected protagonist ids alternate green/amber off a cheap hash.
    return { color: /aggr/i.test(track.name) ? "var(--amber)" : "var(--green)" };
  }
  return { color: "var(--ink-faint)", dash: "4 4" };
}

export const SPY_STYLE: TrackStyle = { color: "var(--ink-faint)", dash: "1 2" };

// ── Curves ──────────────────────────────────────────────────────────────────

/** Equity curve → percent return relative to the track's starting capital. */
export function pctSeries(
  curve: CurvePoint[],
  capital: number,
): CurvePoint[] {
  if (!capital || !Number.isFinite(capital)) return [];
  return curve.map(([d, v]) => [d, ((v - capital) / capital) * 100]);
}

/** Raw benchmark closes → percent return from the first close. */
export function benchmarkPctSeries(closes: CurvePoint[]): CurvePoint[] {
  const base = closes[0]?.[1];
  if (!base) return [];
  return closes.map(([d, v]) => [d, ((v - base) / base) * 100]);
}

// ── Trade stats ─────────────────────────────────────────────────────────────

export type TradeStats = {
  n: number;
  wins: number;
  losses: number;
  winRate: number | null; // 0..1, null when no trades
  totalPnl: number;
  expectancy: number | null; // mean $ per trade
};

export function tradeStats(log: ClosedTrade[]): TradeStats {
  // assignment_friction rows are a settlement statistic, not a trade —
  // keep them out of the W/L record (they still show in the trade table).
  const trades = log.filter((t) => t.kind !== "assignment_friction");
  const wins = trades.filter((t) => t.pnl > 0).length;
  const losses = trades.filter((t) => t.pnl < 0).length;
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  return {
    n: trades.length,
    wins,
    losses,
    winRate: trades.length ? wins / trades.length : null,
    totalPnl,
    expectancy: trades.length ? totalPnl / trades.length : null,
  };
}

// ── Decision helpers ────────────────────────────────────────────────────────

/** Most recent record of a kind (decisions arrive most-recent-first). */
export function latestRecord(
  track: SolitonTrack,
  kind: string,
): DecisionRecord | undefined {
  return track.decisions.find((d) => d.record === kind);
}

/** All tracks' decisions merged, most recent first, tagged with their track. */
export type TaggedDecision = { track: SolitonTrack; decision: DecisionRecord };

export function mergedDecisions(bundle: SolitonBundle): TaggedDecision[] {
  const all: TaggedDecision[] = bundle.tracks.flatMap((track) =>
    track.decisions.map((decision) => ({ track, decision })),
  );
  return all.sort((a, b) =>
    (b.decision.timestamp ?? b.decision.as_of ?? "").localeCompare(
      a.decision.timestamp ?? a.decision.as_of ?? "",
    ),
  );
}

/**
 * Link from an opening decision to its closed result. Schema v2 gives an
 * EXACT key: position_key rides on the decision's order summary, the open
 * position, and the closed trade. Fall back to the old fuzzy expiration
 * match for anything without a key — no match, no link.
 */
export function linkedTrade(
  track: SolitonTrack,
  decision: DecisionRecord,
): ClosedTrade | undefined {
  const keys = [decision.order, ...(decision.orders ?? [])]
    .map((o) => o?.position_key)
    .filter((k): k is string => typeof k === "string");
  if (keys.length > 0) {
    const exact = track.trade_log.find(
      (t) => t.position_key && keys.includes(t.position_key),
    );
    if (exact) return exact;
  }
  const exp = decision.order?.expiration;
  if (!exp) return undefined;
  return track.trade_log.find(
    (t) => t.expiration_close === exp || (t.label ?? "").includes(exp),
  );
}

// ── Scoreboard ──────────────────────────────────────────────────────────────
// The one thing the verdict strip has to answer in 60 seconds: is each
// protagonist account up or down, and up or down against SPY, since its own
// launch. Everything null-safe so a day-zero bundle renders "not started yet"
// rather than a fake 0.0%.

export type AccountScore = {
  /** false until the account has ≥2 equity marks (a curve, not a dot). */
  started: boolean;
  /** % return vs the account's starting bankroll; null pre-launch. */
  sinceLaunchPct: number | null;
  /** SPY buy-and-hold % over the SAME window (account launch → last mark). */
  spyPct: number | null;
  /** account − SPY, in percentage points; null until started. */
  vsSpy: number | null;
};

/** Benchmark close on `date`, else the last one before it (day-zero safe). */
function closeOnOrBefore(closes: CurvePoint[], date: string): number | null {
  let best: number | null = null;
  for (const [d, v] of closes) {
    if (d <= date) best = v;
    else break;
  }
  return best;
}

export function accountScore(
  track: SolitonTrack,
  bundle: SolitonBundle,
): AccountScore {
  const curve = track.equity_curve;
  const started = curve.length >= 2;
  const series = pctSeries(curve, track.virtual_capital);
  const sinceLaunchPct = series.length
    ? series[series.length - 1][1]
    : null;

  // SPY measured over the account's own span, so "vs SPY" is apples-to-apples
  // even if an account joins the field later than the benchmark's first close.
  const closes = bundle.benchmark?.closes ?? [];
  const startDate = curve[0]?.[0];
  const endDate = curve[curve.length - 1]?.[0];
  let spyPct: number | null = null;
  if (started && startDate && endDate) {
    const base = closeOnOrBefore(closes, startDate);
    const end = closeOnOrBefore(closes, endDate);
    if (base && end != null) spyPct = ((end - base) / base) * 100;
  }
  const vsSpy =
    started && sinceLaunchPct != null && spyPct != null
      ? sinceLaunchPct - spyPct
      : null;
  return { started, sinceLaunchPct, spyPct, vsSpy };
}

/** "up 2.3 pts on SPY" / "behind SPY by 1.1 pts" / null when not started. */
export function vsSpyPhrase(vsSpy: number | null): string | null {
  if (vsSpy == null) return null;
  if (Math.abs(vsSpy) < 0.05) return "dead even with SPY";
  const pts = Math.abs(vsSpy).toFixed(1);
  return vsSpy > 0 ? `up ${pts} pts on SPY` : `behind SPY by ${pts} pts`;
}

// ── Experiment state ────────────────────────────────────────────────────────

export function protagonists(bundle: SolitonBundle): SolitonTrack[] {
  return bundle.tracks.filter((t) => trackRole(t) === "protagonist");
}

/** Plain-language name for an account, jargon stripped ("FA — fast bets"). */
export function plainAccountName(track: SolitonTrack): string {
  if (/aggr/i.test(track.name) || track.id === "FA") {
    return "the fast-bets account";
  }
  if (/econ/i.test(track.name) || track.id === "FE") {
    return "the thesis account";
  }
  return track.name.split("—")[0]?.trim() || track.id;
}

/** True once any capital-bearing track has ≥2 equity marks (curves move). */
export function hasHistory(bundle: SolitonBundle): boolean {
  return bundle.tracks.some(
    (t) => !t.signals_only && t.equity_curve.length >= 2,
  );
}

// ── Formatting ──────────────────────────────────────────────────────────────

export function fmtMoney(v: number): string {
  const sign = v < 0 ? "−" : "";
  const abs = Math.abs(v);
  return `${sign}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: abs < 1000 ? 2 : 0,
    maximumFractionDigits: abs < 1000 ? 2 : 0,
  })}`;
}

export function fmtSignedMoney(v: number): string {
  return v > 0 ? `+${fmtMoney(v)}` : fmtMoney(v);
}

export function fmtPct(v: number, digits = 1): string {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toFixed(digits)}%`;
}

export function fmtDate(iso: string): string {
  // "2026-07-07" → "Jul 07" ; full ISO timestamps pass through Date.
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
  return `${months[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${fmtDate(iso)} ${String(d.getUTCHours()).padStart(2, "0")}:${String(
    d.getUTCMinutes(),
  ).padStart(2, "0")}Z`;
}

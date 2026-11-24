/**
 * Trading-session arithmetic for the stale warning (pure, no I/O).
 *
 * Rule (EXPORT_SCHEMA.md): if `as_of_session` is more than 2 trading sessions
 * older than the current ET session, warn. NYSE full-day closures are listed
 * explicitly for 2026-2027; outside that range only weekends are skipped,
 * which can only OVER-count sessions (a warning too early, never too late).
 */
export const NYSE_HOLIDAYS: ReadonlySet<string> = new Set([
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25", "2026-06-19",
  "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25",
  "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31", "2027-06-18",
  "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24",
]);
export const HOLIDAYS_COVERED_THROUGH = "2027-12-31";
export const STALE_AFTER_SESSIONS = 2;

export type Staleness = {
  stale: boolean;
  sessionsBehind: number;
  currentSession: string;
  /** true when `now` is past the holiday table, so the count may over-state */
  holidayTableExpired: boolean;
};

/** The date in America/New_York as YYYY-MM-DD. */
export function etDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
function isSession(ymd: string): boolean {
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow !== 0 && dow !== 6 && !NYSE_HOLIDAYS.has(ymd);
}

/** Most recent session on or before `ymd`. */
export function currentSession(ymd: string): string {
  let d = ymd;
  for (let i = 0; i < 14 && !isSession(d); i++) d = addDays(d, -1);
  return d;
}

/** Number of sessions in (from, to]. 0 if from >= to. */
export function sessionsBetween(from: string, to: string): number {
  let n = 0;
  for (let d = addDays(from, 1); d <= to; d = addDays(d, 1)) if (isSession(d)) n++;
  return n;
}

export function assessStaleness(asOfSession: string, now: Date): Staleness {
  const today = etDate(now);
  const cur = currentSession(today);
  const behind = sessionsBetween(asOfSession, cur);
  return {
    stale: behind > STALE_AFTER_SESSIONS,
    sessionsBehind: behind,
    currentSession: cur,
    holidayTableExpired: today > HOLIDAYS_COVERED_THROUGH,
  };
}

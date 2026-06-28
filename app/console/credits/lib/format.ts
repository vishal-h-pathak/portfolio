/**
 * Money / time formatters for the Credits tab — the view boundary.
 *
 * Ported from the tracker's `web/lib/format.ts`. Money arrives as INTEGER
 * cents everywhere upstream; these are the only place it becomes a string.
 */

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function dollarsCompact(cents: number): string {
  return usd0.format(cents / 100);
}

export function percent(p: number, fractionDigits = 0): string {
  return `${p.toFixed(fractionDigits)}%`;
}

export function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "in 5d" / "today" / "3d ago", relative to a fixed `now`. */
export function relativeFromNow(iso: string | null, now: Date): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - now.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days > 0) return `in ${days}d`;
  return `${Math.abs(days)}d ago`;
}

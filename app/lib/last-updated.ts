// Server-only: resolve a project's last-updated date from its GitHub repo.
//
// Reads `pushed_at` from the GitHub REST API, ISR-cached (~30 min) so it
// auto-updates when the owner pushes to a project — no portfolio edit needed.
// The token (if present) is used only for private repos and never reaches the
// client. Public repos resolve tokenless. Never throws — returns null on any
// error so the caller can fall back to the manual `updated` value.
//
// Server-only by construction: it reads `process.env.GITHUB_TOKEN` and is
// imported solely from the server `app/page.tsx`, so the token never reaches
// the client bundle.

export async function getLastUpdated(repo: string): Promise<Date | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers,
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { pushed_at?: unknown };
    if (typeof data.pushed_at !== "string") return null;

    const date = new Date(data.pushed_at);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

// Always `updated Mon YYYY` — same grammar as formatUpdatedFallback below, so
// the bench list reads as one ledger regardless of which projects' GitHub
// fetches resolve (a relative "3d ago" here next to an absolute fallback
// elsewhere in the same list was the bug: two grammars for one field).
export function formatUpdatedLabel(date: Date): string {
  return `updated ${monthYear(date)}`;
}

// Manual fallback: parse a `YYYY-MM` string into `updated Mon YYYY`.
// Returns null if it isn't a well-formed year-month.
export function formatUpdatedFallback(yearMonth: string): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!m) return null;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  return Number.isNaN(date.getTime()) ? null : `updated ${monthYear(date)}`;
}

function monthYear(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

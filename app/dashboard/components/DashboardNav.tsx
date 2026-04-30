"use client";

/**
 * DashboardNav — global nav for the dashboard surface.
 *
 * Mounted on /dashboard, /dashboard/insights, /dashboard/review,
 * /dashboard/review/[job_id]. Replaces each page's bespoke top-of-page
 * header element. The cockpit's "← Review queue" back-link is kept on
 * the cockpit page itself — deep-link breadcrumb context matters there
 * even with a global nav above.
 *
 * Self-fetches its own action-needed count (rows where status is
 * `ready_for_review` or the legacy alias `needs_review`) so callers
 * don't have to thread it through props. Polls every 30s while the
 * tab is visible to keep the badge fresh.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";

const ACTION_REFRESH_MS = 30_000;

type NavItem = {
  href: string;
  label: string;
  isActive: (path: string) => boolean;
  badge?: (n: number) => boolean;
};

const ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    // Active for the bare /dashboard route only — nested routes have
    // their own nav items.
    isActive: (p) => p === "/dashboard",
  },
  {
    href: "/dashboard/review",
    label: "Review queue",
    isActive: (p) => p.startsWith("/dashboard/review"),
    badge: (n) => n > 0,
  },
  {
    href: "/dashboard/insights",
    label: "Insights",
    isActive: (p) => p.startsWith("/dashboard/insights"),
  },
];

export default function DashboardNav({
  rightSlot,
}: {
  /**
   * Optional right-aligned slot. The dashboard route uses it for the
   * browse/swipe view-mode toggle; other routes leave it empty.
   */
  rightSlot?: ReactNode;
}) {
  const path = usePathname() ?? "";
  const [actionCount, setActionCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const refresh = async () => {
      const { count, error } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .in("status", ["ready_for_review", "needs_review"]);
      if (cancelled) return;
      if (error) {
        // Failures here are non-fatal — the nav still renders without
        // the badge, and the next poll will retry.
        return;
      }
      setActionCount(count ?? 0);
    };

    const start = () => {
      if (timer) return;
      void refresh();
      timer = setInterval(() => void refresh(), ACTION_REFRESH_MS);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <nav className="border-b border-neutral-900 bg-black/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 h-12 flex items-center gap-6">
        <Link
          href="/dashboard"
          className="text-xs uppercase tracking-widest text-neutral-400 hover:text-neutral-100 font-mono"
        >
          Job pipeline
        </Link>
        <ul className="flex items-center gap-1 text-sm">
          {ITEMS.map((item) => {
            const active = item.isActive(path);
            const showBadge =
              item.badge !== undefined &&
              actionCount !== null &&
              item.badge(actionCount);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded transition-colors " +
                    (active
                      ? "bg-neutral-900 text-neutral-100 border border-neutral-800"
                      : "text-neutral-500 hover:text-neutral-100 border border-transparent")
                  }
                >
                  <span>{item.label}</span>
                  {showBadge && (
                    <span
                      className={
                        "text-[10px] font-mono px-1.5 py-0.5 rounded border " +
                        (active
                          ? "border-amber-700 bg-amber-900/40 text-amber-200"
                          : "border-amber-800/60 bg-amber-950/40 text-amber-300")
                      }
                      aria-label={`${actionCount} action(s) needed`}
                    >
                      {actionCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="ml-auto flex items-center gap-2">{rightSlot}</div>
      </div>
    </nav>
  );
}

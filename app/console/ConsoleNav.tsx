"use client";

/**
 * ConsoleNav — the single umbrella nav for the gated console, replacing
 * the three separate per-tool chromes as the shared top-level entry. It
 * switches between the tools (Job pipeline, Meridian) and links back to
 * the public site. Each tool keeps its own internal sub-navigation
 * (the job pipeline's DashboardNav, Meridian's wordmark) beneath this.
 *
 * Deliberately NOT sticky: the job-pipeline pages own a sticky
 * DashboardNav at top-0, so a second sticky bar would collide. This bar
 * scrolls with the page and the tool's own nav pins as before.
 *
 * Wrapped in `.internal-surface` so the dashboard token bridge
 * (_internal.css `@theme`) and the marketing-style revert-layer apply,
 * matching the rest of the console.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const TOOLS = [
  { href: "/console/jobs", label: "Job pipeline", match: "/console/jobs" },
  { href: "/console/meridian", label: "Meridian", match: "/console/meridian" },
];

export function ConsoleNav() {
  const path = usePathname() ?? "";

  // The login page is the one console route that renders for the
  // unauthenticated — never expose the tool nav there.
  if (path === "/console/login") return null;

  return (
    <div className="internal-surface">
      <nav className="border-b border-rule bg-bg-raised">
        <div className="mx-auto flex h-12 max-w-6xl items-center gap-5 overflow-x-auto px-4 sm:px-8">
          <Link
            href="/console"
            className="flex shrink-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink transition-colors duration-150 hover:text-green"
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-green motion-safe:animate-pulse"
            />
            Console
          </Link>
          <ul className="flex items-center gap-4">
            {TOOLS.map((tool) => {
              const active = path.startsWith(tool.match);
              return (
                <li key={tool.href} className="shrink-0">
                  <Link
                    href={tool.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      "inline-flex items-baseline border-b py-1 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors duration-150 " +
                      (active
                        ? "border-amber text-ink"
                        : "border-transparent text-ink-faint hover:text-ink")
                    }
                  >
                    {tool.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="ml-auto flex shrink-0 items-center">
            <a
              href="/"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint transition-colors duration-150 hover:text-ink"
            >
              ↗ site
            </a>
          </div>
        </div>
      </nav>
    </div>
  );
}

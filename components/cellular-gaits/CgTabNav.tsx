"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { CG_BASE, CG_TABS } from "./tabs";

/**
 * Concept tab nav. Real links to real routes (deep-linkable); the active tab is
 * derived from the current pathname, not client state. Scrolls horizontally on
 * narrow screens so it stays usable at 375px without overflowing the page.
 */
export function CgTabNav() {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  // The active tab can land off-screen on deep-link/navigation (e.g. jumping
  // straight to "Appendix", the last of 9 tabs) — pull it back into view.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  return (
    <nav className="cg-tabnav" aria-label="Cellular Gaits sections">
      <ul className="cg-tabnav-list">
        {CG_TABS.map((tab) => {
          // Exact match, or any nested route under a group tab (e.g.
          // /behaviors/perturbation keeps "Behaviors" active). CG_BASE itself is
          // a prefix of every route, so it only ever matches exactly.
          const active =
            pathname === tab.href ||
            (tab.href !== CG_BASE && pathname.startsWith(`${tab.href}/`));
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                ref={active ? activeRef : undefined}
                className="cg-tab"
                data-active={active ? "1" : undefined}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CG_TABS } from "./tabs";

/**
 * Concept tab nav. Real links to real routes (deep-linkable); the active tab is
 * derived from the current pathname, not client state. Scrolls horizontally on
 * narrow screens so it stays usable at 375px without overflowing the page.
 */
export function CgTabNav() {
  const pathname = usePathname();
  return (
    <nav className="cg-tabnav" aria-label="Cellular Gaits sections">
      <ul className="cg-tabnav-list">
        {CG_TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
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

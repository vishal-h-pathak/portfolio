"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CG_BASE, CG_TABS } from "./tabs";

/**
 * Explicit up-to-parent control for every Cellular Gaits sub-page, so no
 * page is a dead end that relies on browser-back (theme C). Rendered in the
 * shared shell (layout), it derives its target from the current route:
 *   · a behavior sub-page (e.g. /behaviors/escape) → back up to its hub tab
 *     (Behaviors);
 *   · any other concept tab (e.g. /sensing) → back up to the project frame.
 * The frame page itself (CG_BASE) renders nothing here — the shared
 * ProjectTopbar's "← BACK" already exits to /#bench, and stacking this
 * breadcrumb's own "← Projects" under it duplicated the same affordance
 * twice within ~160px on mobile (W5/#23).
 */

// Pretty leaf label for a route with no tab entry of its own (the behavior
// sub-pages). Falls back to title-casing the final path segment.
function leafLabel(pathname: string): string {
  const tab = CG_TABS.find((t) => t.href === pathname);
  if (tab) return tab.label;
  const seg = pathname.split("/").filter(Boolean).pop() ?? "";
  return seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CgBreadcrumb() {
  const pathname = usePathname();
  if (!pathname || !pathname.startsWith(CG_BASE)) return null;
  // The frame page already has exactly one up-affordance (the shared
  // ProjectTopbar's back link) — don't stack a second one under it.
  if (pathname === CG_BASE) return null;

  // The parent tab of a nested sub-route (e.g. Behaviors for /behaviors/escape).
  const parentTab = CG_TABS.find(
    (t) => t.href !== CG_BASE && pathname.startsWith(`${t.href}/`),
  );

  // A sub-page → up to its hub tab; any other concept tab → up to the frame.
  const up = parentTab
    ? { href: parentTab.href, label: parentTab.label }
    : { href: CG_BASE, label: "Cellular Gaits" };

  const onSubPage = !!parentTab;

  return (
    <nav className="cg-breadcrumb" aria-label="Breadcrumb">
      <Link className="cg-breadcrumb-up" href={up.href}>
        <span aria-hidden="true">←</span> {up.label}
      </Link>
      {onSubPage && (
        <span className="cg-breadcrumb-leaf" aria-current="page">
          <span className="cg-breadcrumb-sep" aria-hidden="true">
            /
          </span>
          {leafLabel(pathname)}
        </span>
      )}
    </nav>
  );
}

export default CgBreadcrumb;

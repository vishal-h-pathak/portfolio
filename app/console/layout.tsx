import "../_internal.css";
import type { ReactNode } from "react";
import { ConsoleNav } from "./ConsoleNav";

/**
 * Console umbrella layout — the gated home for all private tooling
 * (job pipeline, Soliton engine status, agent runbooks). Auth is enforced
 * by middleware.ts (matcher: /console/:path*). This layout only adds the
 * shared ConsoleNav; each tool keeps its own internal layout/sub-nav.
 *
 * It does NOT wrap children in `.internal-surface` globally — a tool may
 * paint its own full-bleed surface (Meridian did) — so each tool's own
 * layout applies the register where it wants it.
 */
export default function ConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <ConsoleNav />
      {children}
    </>
  );
}

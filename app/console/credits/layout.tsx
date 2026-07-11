import "../../_internal.css";
import type { ReactNode } from "react";

/**
 * Credits tab layout — applies the dashboard token bridge / register on
 * the internal surface, mirroring the jobs tab. Auth is enforced upstream
 * by middleware.ts (matcher: /console/:path*); this tab inherits it.
 */
export default function CreditsLayout({ children }: { children: ReactNode }) {
  return <div className="internal-surface">{children}</div>;
}

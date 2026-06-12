import { getBenchActivity } from "@/app/lib/bench-activity";
import { Legend } from "./rail/Legend";
import { NowPlaying } from "./rail/NowPlaying";
import { RecentLedger } from "./rail/RecentLedger";
import { StatusBlock } from "./rail/StatusBlock";

/**
 * Server component. Fetches sanitized jobpipe telemetry once and feeds
 * the status + recent blocks; both degrade gracefully when it's null.
 * Data may be up to 5 minutes stale (page revalidate) — fine for a rail.
 */
export async function WorkshopRail() {
  const activity = await getBenchActivity();

  return (
    <aside className="rail" aria-label="Workshop status">
      <StatusBlock applicationsOut={activity?.totals.applications_out} />
      <NowPlaying />
      <RecentLedger events={activity?.events} />
      <Legend />
    </aside>
  );
}

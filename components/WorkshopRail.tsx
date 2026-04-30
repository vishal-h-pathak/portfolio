import { Legend } from "./rail/Legend";
import { NowPlaying } from "./rail/NowPlaying";
import { RecentLedger } from "./rail/RecentLedger";
import { StatusBlock } from "./rail/StatusBlock";

export function WorkshopRail() {
  return (
    <aside className="rail" aria-label="Workshop status">
      <StatusBlock />
      <NowPlaying />
      <RecentLedger />
      <Legend />
    </aside>
  );
}

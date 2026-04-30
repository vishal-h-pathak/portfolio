/**
 * // now playing — slot for the live Meridian feed.
 *
 * Intentionally a placeholder per README §"Workshop Rail" / §"State Management":
 *   "Wire this to the real Meridian API when it's available; do not fabricate."
 *
 * Designed to accept props later without a structural change.
 */
type MeridianStatus = {
  cycle: number;
  lastDecision: string;
  ticker: string;
  grade: string;
};

export function NowPlaying({ status: _status }: { status?: MeridianStatus }) {
  return (
    <div className="rail-block">
      <h3>
        // now playing <span className="small">slot</span>
      </h3>
      <div className="now-playing">
        <div className="k">MERIDIAN · LIVE FEED</div>
        <div className="body">
          When wired to the Meridian API, this card surfaces the running
          paper-portfolio status — current cycle, last decision, confluence
          grade. Until then it&rsquo;s a slot, not a number.
        </div>
        <div className="meta">to be wired · paper-only, no real money</div>
      </div>
    </div>
  );
}

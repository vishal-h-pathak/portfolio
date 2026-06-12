import type { BenchEvent, BenchEventKind } from "@/app/lib/bench-activity";

/**
 * // recent — the agent/build/deploy event ledger.
 *
 * Wired to live jobpipe telemetry (sanitized aggregates from
 * app/lib/bench-activity.ts, passed down by WorkshopRail). When the
 * fetch fails or returns nothing, falls back to the original "spec"
 * placeholder — per README the slot degrades, it never errors and
 * never fabricates.
 */

const KIND_LABEL: Record<BenchEventKind, string> = {
  hunt: "hunt",
  tailor: "tailor",
  tailor_manual: "manual tailor",
};

export function RecentLedger({ events }: { events?: BenchEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="rail-block">
        <h3>
          // recent <span className="small">slot</span>
        </h3>
        <div className="ledger-item">
          <span className="ts">spec</span>
          <span className="msg">
            Reserved for an event ledger — build hooks, agent runs, deploys.
            Wires up to <strong>meridian</strong> + <strong>jobpipe</strong> +
            git when those endpoints are live. Empty until then on purpose.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rail-block">
      <h3>
        // recent <span className="small">jobpipe</span>
      </h3>
      {events.map((event, i) => (
        <div key={i} className="ledger-item">
          <span className="ts">{event.ago}</span>
          <span className="msg">
            <strong>{KIND_LABEL[event.kind]}</strong> {event.status}
            {event.new_roles
              ? ` · ${event.new_roles} new role${event.new_roles === 1 ? "" : "s"}`
              : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

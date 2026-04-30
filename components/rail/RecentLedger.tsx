/**
 * // recent — slot for the agent/build/deploy event ledger.
 *
 * Per README: "wire to real event sources when available, do not fabricate."
 * Accepts an optional `events` prop so it can be wired without restructuring.
 */
export type RecentEvent = {
  ts: string;
  msgHtml: string;
};

export function RecentLedger({ events }: { events?: RecentEvent[] }) {
  const items: RecentEvent[] = events ?? [
    {
      ts: "spec",
      msgHtml:
        "Reserved for an event ledger — build hooks, agent runs, deploys. Wires up to <strong>meridian</strong> + <strong>jobpipe</strong> + git when those endpoints are live. Empty until then on purpose.",
    },
  ];

  return (
    <div className="rail-block">
      <h3>
        // recent <span className="small">slot</span>
      </h3>
      {items.map((item, i) => (
        <div key={i} className="ledger-item">
          <span className="ts">{item.ts}</span>
          <span
            className="msg"
            dangerouslySetInnerHTML={{ __html: item.msgHtml }}
          />
        </div>
      ))}
    </div>
  );
}

import { getAgentSpend } from "@/app/lib/agent-spend";
import { getFleetStatus } from "@/app/lib/fleet-status";
import { Legend } from "./rail/Legend";

/**
 * Server component. Fetches real, sanitized live signals — the owner's
 * machine fleet (which machines are online + what's running) and rolling
 * 7-day agent spend across the owner's agentic systems — and renders them
 * as factual panels. The rail reads as the swarm (fleet) + what it costs
 * (spend). Each panel degrades to a plain honest line when there's no
 * data; never scaffolding copy. Figures may be up to 5 minutes stale
 * (page revalidate = 300) — fine for a rail.
 */
export async function WorkshopRail() {
  const [fleet, spend] = await Promise.all([getFleetStatus(), getAgentSpend()]);
  const hasFleet = fleet !== null && fleet.machines.length > 0;
  const hasData = spend !== null && spend.total7d > 0;

  return (
    <aside className="rail" aria-label="Workshop status">
      <div className={`rail-block${hasFleet ? "" : " is-empty"}`}>
        <h3>// fleet</h3>
        {hasFleet ? (
          <>
            {fleet.machines.map((m) => (
              <div className="rail-row" key={m.alias}>
                <span>{m.alias}</span>
                <span className={`v${m.state === "online" ? " live" : ""}`}>
                  {m.state}
                  {typeof m.cpu === "number" ? ` · ${m.cpu}% cpu` : ""}
                </span>
              </div>
            ))}
            <div className="rail-row">
              <span>
                {fleet.machines.length} machine
                {fleet.machines.length === 1 ? "" : "s"}
              </span>
              <span className="v">{fleet.runningJobs} running</span>
            </div>
          </>
        ) : (
          <div className="rail-row">
            <span>fleet</span>
            <span className="v">no machines reporting</span>
          </div>
        )}
      </div>
      <div className={`rail-block${hasData ? "" : " is-empty"}`}>
        <h3>
          // model spend <span className="small">7d</span>
        </h3>
        <div className="rail-row">
          <span>rolling total</span>
          <span className="v live">{hasData ? usd(spend.total7d) : "—"}</span>
        </div>
        {hasData &&
          spend.byStage.map((s) => (
            <div className="rail-row" key={s.stage}>
              <span>{s.stage}</span>
              <span className="v">{usd(s.usd)}</span>
            </div>
          ))}
      </div>
      <Legend />
    </aside>
  );
}

function usd(n: number): string {
  return `$${n.toFixed(2)}`;
}

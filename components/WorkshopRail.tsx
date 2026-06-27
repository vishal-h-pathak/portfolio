import { getAgentSpend } from "@/app/lib/agent-spend";
import { Legend } from "./rail/Legend";

/**
 * Server component. Fetches one real, sanitized live signal — rolling
 * 7-day agent spend across the owner's agentic systems — and renders it
 * as a single factual panel. Degrades to a plain "—" when there's no
 * data; never scaffolding copy. Figures may be up to 5 minutes stale
 * (page revalidate = 300) — fine for a rail.
 */
export async function WorkshopRail() {
  const spend = await getAgentSpend();
  const hasData = spend !== null && spend.total7d > 0;

  return (
    <aside className="rail" aria-label="Workshop status">
      <div className="rail-block">
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

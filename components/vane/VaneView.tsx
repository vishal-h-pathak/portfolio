import type { VaneBundle, VaneResult, Week } from "@/app/lib/vane-export";
import type { Staleness } from "@/app/lib/vane-sessions";
import { EquityChart } from "./EquityChart";
import { fmtTs, num, pct, tone, usd } from "./format";

/**
 * Presentational root for /projects/vane. Takes the reader's result verbatim,
 * so tests can inject any outcome. There is deliberately no branch that renders
 * data without a validated bundle.
 */
export function VaneView({ result }: { result: VaneResult }) {
  return (
    <>
      <section>
        <p className="plate-kicker">B-01 · VANE — a public paper-trading experiment</p>
        <h1 className="vane-title">A rules-based portfolio, measured against SPY from Day 0</h1>
      </section>
      {result.status === "ok" ? (
        <Live bundle={result.bundle} staleness={result.staleness} />
      ) : result.status === "empty" ? (
        <EmptyState />
      ) : (
        <ErrorState result={result} />
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="vane-notice vane-notice-wait" role="status" data-vane-state="empty">
      <strong>No data yet.</strong> The engine has not published its first export. Nothing on this
      page is a sample or a placeholder: when the first cycle completes, the equity curve, positions
      and trade log appear here.
    </div>
  );
}

function ErrorState({ result }: { result: Extract<VaneResult, { status: "error" }> }) {
  return (
    <div className="vane-notice vane-notice-error" role="alert" data-vane-state="error" data-vane-error-kind={result.kind}>
      <strong>Data unavailable.</strong> {result.message} No figures are shown rather than risk
      showing figures that are wrong.
      {result.details?.length ? (
        <ul className="vane-errlist">
          {result.details.slice(0, 8).map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function StaleBanner({ s, asOf }: { s: Staleness; asOf: string }) {
  if (!s.stale) return null;
  return (
    <div className="vane-notice vane-notice-stale" role="alert" data-vane-state="stale">
      <strong>Stale data.</strong> The newest export is for the {asOf} session, {s.sessionsBehind} trading
      sessions behind the current one ({s.currentSession}). The numbers below are not current.
      {s.holidayTableExpired ? " (Holiday calendar has expired; the count may overstate.)" : ""}
    </div>
  );
}

function Live({ bundle: b, staleness }: { bundle: VaneBundle; staleness: Staleness }) {
  const s = b.summary;
  const cycleBad = b.last_cycle.outcome !== "ok" || b.last_cycle.error;
  const byTranche = new Map<number, VaneBundle["positions"]>();
  for (const p of b.positions) byTranche.set(p.tranche, [...(byTranche.get(p.tranche) ?? []), p]);
  const tranches = [...byTranche.keys()].sort((a, c) => a - c);

  return (
    <div data-vane-state={staleness.stale ? "live-stale" : "live"}>
      <StaleBanner s={staleness} asOf={b.as_of_session} />
      {cycleBad ? (
        <div className="vane-notice vane-notice-error" role="alert">
          <strong>Last cycle did not finish cleanly:</strong> {b.last_cycle.outcome}
          {b.last_cycle.error ? ` — ${b.last_cycle.error}` : ""}
        </div>
      ) : null}

      <div className="vane-asof">
        <span>AS OF {b.as_of_session} SESSION</span>
        <span>LAST CYCLE {fmtTs(b.last_cycle.finished_at ?? b.last_cycle.started_at)} · {b.last_cycle.outcome.toUpperCase()}</span>
        <span>EXPORTED {fmtTs(b.exported_at)}</span>
        <span>CONFIG {b.config_id}</span>
      </div>

      <section className="vane-tiles" aria-label="Summary">
        <Tile k="Equity" v={usd(s.equity)} sub={`Day 0 ${usd(b.day0.equity)} · ${b.day0.session}`} />
        <Tile k="VANE return" v={pct(s.total_return)} cls={tone(s.total_return)} />
        <Tile k="SPY total return" v={pct(s.spy_total_return)} cls={tone(s.spy_total_return)} />
        <Tile k="Excess return" v={pct(s.excess_return)} cls={tone(s.excess_return)} sub="VANE minus SPY" />
        <Tile k="Drawdown" v={pct(s.drawdown)} cls={tone(s.drawdown)} sub={`peak ${usd(s.peak_equity)}`} />
        <Tile k="Regime" v={s.regime === "risk_on" ? "Risk on" : "Risk off"} sub={s.degrossed ? "degrossed" : "fully invested per rules"} />
      </section>

      <section className="vane-section">
        <h2 className="vane-section-head">Equity curve vs SPY total return</h2>
        <EquityChart curve={b.equity_curve} />
      </section>

      <section className="vane-section">
        <h2 className="vane-section-head">Positions by tranche</h2>
        {tranches.length === 0 ? (
          <p className="vane-dim">No open positions.</p>
        ) : (
          tranches.map((t) => (
            <div key={t} className="vane-tranche">
              <h3 className="vane-tranche-head">
                Tranche {t} · {usd(byTranche.get(t)!.reduce((a, p) => a + p.market_value, 0))}
              </h3>
              <div className="vane-scroll">
                <table className="vane-table">
                  <thead>
                    <tr><th>Symbol</th><th>Qty</th><th>Avg entry</th><th>Mark</th><th>Value</th><th>P/L</th><th>Entered</th></tr>
                  </thead>
                  <tbody>
                    {byTranche.get(t)!.map((p) => {
                      const pl = p.market_value - p.avg_entry * p.qty;
                      return (
                        <tr key={`${p.symbol}-${p.entered_session}`}>
                          <td>{p.symbol}</td>
                          <td>{num(p.qty, 4)}</td>
                          <td>{usd(p.avg_entry, 2)}</td>
                          <td>{usd(p.mark, 2)}</td>
                          <td>{usd(p.market_value)}</td>
                          <td className={tone(pl)}>{usd(pl)}</td>
                          <td>{p.entered_session}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
        <p className="vane-dim">
          Cash {usd(b.cash)} · {b.tbill.symbol} {num(b.tbill.qty, 4)} sh {usd(b.tbill.market_value)}
        </p>
      </section>

      <section className="vane-section">
        <h2 className="vane-section-head">Weekly activity requirement</h2>
        <WeekStrip weeks={b.weeks} />
      </section>

      <section className="vane-section">
        <h2 className="vane-section-head">Trade log (newest first, {b.trades.length} shown)</h2>
        {b.trades.length === 0 ? (
          <p className="vane-dim">No orders yet.</p>
        ) : (
          <div className="vane-scroll">
            <table className="vane-table">
              <thead>
                <tr><th>Session</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Fill</th><th>Tr.</th><th>Status</th><th>Filled at</th><th /></tr>
              </thead>
              <tbody>
                {b.trades.map((t) => (
                  <tr key={t.client_order_id}>
                    <td>{t.session}</td>
                    <td>{t.symbol}</td>
                    <td>{t.side.toUpperCase()}</td>
                    <td>{num(t.qty, 4)}</td>
                    <td>{t.fill_price === null ? "—" : usd(t.fill_price, 2)}</td>
                    <td>{t.tranche}</td>
                    <td>{t.status}</td>
                    <td>{fmtTs(t.filled_at)}</td>
                    <td>{t.floor_trade ? <span className="vane-flag">FLOOR TRADE</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="vane-dim">A floor trade is an order placed only to meet the week&rsquo;s minimum, not because the signal asked for it.</p>
      </section>

      <section className="vane-section">
        <h2 className="vane-section-head">The strategy, in plain language</h2>
        <div className="vane-prose">
          {b.strategy_text.split(/\n{2,}/).map((para) => (
            <p key={para}>{para}</p>
          ))}
        </div>
      </section>

      <section className="vane-section">
        <h2 className="vane-section-head">Research verdict</h2>
        <p>
          <span className={`vane-evidence vane-evidence-${b.research.evidence_label}`}>
            EVIDENCE: {b.research.evidence_label}
          </span>
        </p>
        <div className="vane-prose">
          {b.research.verdict.split(/\n{2,}/).map((para) => (
            <p key={para}>{para}</p>
          ))}
        </div>
        {b.research.report_url ? (
          <p><a href={b.research.report_url} target="_blank" rel="noopener noreferrer">Full research report →</a></p>
        ) : null}
      </section>

      {b.disclosures.length ? (
        <section className="vane-section">
          <h2 className="vane-section-head">Disclosures</h2>
          <ul className="vane-disclosures">
            {b.disclosures.map((d) => (
              <li key={`${d.date}-${d.text}`}><span className="vane-dim">{d.date}</span> {d.text}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Tile({ k, v, sub, cls }: { k: string; v: string; sub?: string; cls?: string }) {
  return (
    <div className="vane-tile">
      <div className="vane-tile-k">{k}</div>
      <div className={`vane-tile-v ${cls ?? ""}`}>{v}</div>
      {sub ? <div className="vane-tile-sub">{sub}</div> : null}
    </div>
  );
}

function WeekStrip({ weeks }: { weeks: Week[] }) {
  if (weeks.length === 0) return <p className="vane-dim">No weeks recorded yet.</p>;
  return (
    <ol className="vane-weeks">
      {weeks.map((w) => {
        const state = w.met ? "met" : w.complete ? "missed" : "open";
        return (
          <li key={w.week_start} className={`vane-week vane-week-${state}`}>
            <div className="vane-week-date">{w.week_start}</div>
            <div className="vane-week-count">{w.filled}<span> / {w.required}</span></div>
            <div className="vane-week-sub">
              filled / required · {w.sessions} sessions
              {w.floor_trades ? ` · ${w.floor_trades} floor` : ""}
            </div>
            <div className="vane-week-state">{state === "met" ? "MET" : state === "missed" ? "MISSED" : "IN PROGRESS"}</div>
          </li>
        );
      })}
    </ol>
  );
}

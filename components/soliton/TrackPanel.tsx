import type {
  OpenPosition,
  SolitonTrack,
} from "@/app/lib/soliton-export";
import {
  fmtDate,
  fmtMoney,
  fmtPct,
  fmtSignedMoney,
  latestRecord,
  tradeStats,
  trackRole,
  trackStyle,
} from "./derive";

/**
 * One panel per track. Rather than three bespoke panels, blocks compose
 * off whatever the track's data actually contains — a track with
 * gate_evaluation records gets the IV-rank dial, one with state_print
 * records gets the regime block, every capital track gets equity + the
 * win/loss record. That keeps unknown future tracks (the Fable accounts)
 * rendering correctly the day they appear in the bundle.
 *
 * evidence_label and halt_reason render verbatim — the honesty is the
 * design (brief §7.5).
 */

export function TrackPanel({ track }: { track: SolitonTrack }) {
  const style = trackStyle(track);
  const protagonist = trackRole(track) === "protagonist";
  const gate = latestRecord(track, "gate_evaluation");
  const statePrint = latestRecord(track, "state_print");
  const kills = track.decisions.filter((d) => d.record === "kill").slice(0, 4);
  const stats = tradeStats(track.trade_log);
  const lastEquity = track.equity_curve[track.equity_curve.length - 1];

  return (
    <article
      className={"sol-panel" + (protagonist ? " sol-panel-hi" : "")}
      style={{ borderTopColor: style.color }}
    >
      <header className="sol-panel-head">
        <div className="sol-panel-id" style={{ color: style.color }}>
          {track.id}
        </div>
        <h3 className="sol-panel-name">{track.name}</h3>
        <p className="sol-evidence">{track.evidence_label}</p>
        <div className="sol-panel-status">
          <span
            className={
              track.status === "armed" ? "sol-status-armed" : "sol-status-halted"
            }
          >
            {track.status}
          </span>
          <span className="sol-dim"> · {track.symbol}</span>
          {track.signals_only && (
            <span className="sol-dim"> · signals only, no capital</span>
          )}
        </div>
        {track.status === "halted" && track.halt_reason && (
          <p className="sol-halt-reason sol-verbatim">{track.halt_reason}</p>
        )}
      </header>

      {!track.signals_only && lastEquity && (
        <div className="sol-panel-block">
          <div className="sol-kv">
            <span className="sol-k">paper equity</span>
            <span className="sol-v">
              {fmtMoney(lastEquity[1])}{" "}
              <span
                className={
                  lastEquity[1] >= track.virtual_capital ? "sol-pos" : "sol-neg"
                }
              >
                (
                {fmtPct(
                  ((lastEquity[1] - track.virtual_capital) /
                    track.virtual_capital) *
                    100,
                )}
                )
              </span>
            </span>
          </div>
          <div className="sol-kv">
            <span className="sol-k">record</span>
            <span className="sol-v">
              {stats.n === 0 ? (
                <span className="sol-dim">no closed trades yet</span>
              ) : (
                <>
                  {stats.wins}W–{stats.losses}L
                  {stats.winRate != null && (
                    <> · {(stats.winRate * 100).toFixed(0)}%</>
                  )}
                  {" · "}
                  <span className={stats.totalPnl >= 0 ? "sol-pos" : "sol-neg"}>
                    {fmtSignedMoney(stats.totalPnl)}
                  </span>
                  {stats.expectancy != null && (
                    <span className="sol-dim">
                      {" "}
                      ({fmtSignedMoney(stats.expectancy)}/trade)
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {gate?.iv_rank != null && (
        <div className="sol-panel-block">
          <IvDial ivRank={gate.iv_rank} gate={gate.gate ?? null} />
        </div>
      )}

      {statePrint && (
        <div className="sol-panel-block">
          <div className="sol-kv">
            <span className="sol-k">regime</span>
            <span className="sol-v">
              {statePrint.state ?? statePrint.raw_state ?? "—"}
              {statePrint.transition && statePrint.prev_state && (
                <span className="sol-transition"> ← {statePrint.prev_state}</span>
              )}
            </span>
          </div>
          {statePrint.dials && (
            <div className="sol-dials">
              <Dial label="ts" value={statePrint.dials.ts} />
              <Dial label="d200" value={statePrint.dials.d200} />
              <Dial label="lppls" value={statePrint.dials.lppls} />
            </div>
          )}
        </div>
      )}

      {track.open_positions.length > 0 && (
        <div className="sol-panel-block">
          <div className="sol-k">open</div>
          <ul className="sol-positions">
            {track.open_positions.map((p, i) => (
              <li key={i}>{describePosition(p)}</li>
            ))}
          </ul>
        </div>
      )}

      {track.trade_log.length > 0 && (
        <div className="sol-panel-block">
          <div className="sol-k">last closed</div>
          <ul className="sol-trades">
            {track.trade_log.slice(0, 5).map((t, i) => (
              <li key={i}>
                <span className="sol-dim">{fmtDate(t.closed)}</span>{" "}
                {t.kind === "assignment_friction"
                  ? `assignment friction · ${t.symbol}`
                  : `${t.kind} · ${t.symbol}`}{" "}
                <span className={t.pnl >= 0 ? "sol-pos" : "sol-neg"}>
                  {fmtSignedMoney(t.pnl)}
                </span>
                {t.reason && <span className="sol-dim"> — {t.reason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {kills.length > 0 && (
        <div className="sol-panel-block">
          <div className="sol-k">alarm history</div>
          <ul className="sol-alarms">
            {kills.map((k, i) => (
              <li key={i}>
                <span className="sol-dim">{k.as_of && fmtDate(k.as_of)}</span>{" "}
                <span className="sol-verbatim">{k.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

/** Horizontal IV-rank gauge with the entry-gate threshold marked. */
function IvDial({ ivRank, gate }: { ivRank: number; gate: number | null }) {
  const W = 240;
  const H = 34;
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const xAt = (v: number) => (clamp(v) / 100) * W;
  const open = gate != null && ivRank >= gate;
  return (
    <div>
      <div className="sol-kv">
        <span className="sol-k">IV rank</span>
        <span className="sol-v">
          {ivRank.toFixed(1)}
          {gate != null && (
            <span className="sol-dim">
              {" "}
              / gate {gate.toFixed(0)} — {open ? "selling territory" : "below gate"}
            </span>
          )}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="sol-ivdial"
        role="img"
        aria-label={`IV rank ${ivRank.toFixed(1)} of 100${
          gate != null ? `, entry gate at ${gate.toFixed(0)}` : ""
        }`}
      >
        <rect x={0} y={12} width={W} height={8} rx={2} fill="var(--rule-soft)" />
        <rect
          x={0}
          y={12}
          width={xAt(ivRank)}
          height={8}
          rx={2}
          fill={open ? "var(--green-dim)" : "var(--rule)"}
        />
        <line
          x1={xAt(ivRank)}
          x2={xAt(ivRank)}
          y1={8}
          y2={24}
          stroke={open ? "var(--green)" : "var(--ink-dim)"}
          strokeWidth={2}
        />
        {gate != null && (
          <>
            <line
              x1={xAt(gate)}
              x2={xAt(gate)}
              y1={10}
              y2={22}
              stroke="var(--amber)"
              strokeWidth={1.5}
              strokeDasharray="2 2"
            />
            <text x={xAt(gate)} y={32} textAnchor="middle" className="sol-race-tick">
              gate
            </text>
          </>
        )}
        <text x={0} y={7} className="sol-race-tick">
          0
        </text>
        <text x={W} y={7} textAnchor="end" className="sol-race-tick">
          100
        </text>
      </svg>
    </div>
  );
}

/** One dynamics dial lamp: lit when it holds evidence, ∅ when null. */
function Dial({ label, value }: { label: string; value?: number | null }) {
  const lit = value != null;
  return (
    <span className={"sol-dial" + (lit ? " sol-dial-lit" : "")}>
      <span className="sol-dial-lamp" aria-hidden="true" />
      {label} {lit ? Number(value).toFixed(2) : "∅"}
    </span>
  );
}

function describePosition(p: OpenPosition): string {
  if (p.kind === "spread" && p.legs) {
    const exp = p.legs[0]?.expiration;
    const strikes = p.legs.map((l) => l.strike).join("/");
    const mark =
      p.last_mark != null
        ? ` · mark ${p.last_mark}${p.mark_stale ? " (stale)" : ""}`
        : "";
    return `${p.qty ?? 1}× ${p.symbol} spread ${strikes}${
      exp ? ` exp ${exp}` : ""
    } · credit ${p.entry_credit ?? "—"}${mark}`;
  }
  if (p.kind === "equity") {
    return `${p.shares ?? "—"} ${p.symbol} @ ${p.avg_cost ?? "—"}`;
  }
  if (p.kind === "long_option") {
    return `${p.qty ?? 1}× ${p.symbol} ${p.option_type ?? ""} ${p.strike ?? ""}${
      p.expiration ? ` exp ${p.expiration}` : ""
    } · debit ${p.entry_debit ?? "—"}`;
  }
  return `${p.kind} · ${p.symbol}`;
}

import type {
  DecisionRecord,
  SolitonBundle,
  SolitonTrack,
} from "@/app/lib/soliton-export";
import {
  fmtDate,
  fmtDateTime,
  fmtSignedMoney,
  linkedTrade,
  mergedDecisions,
  trackRole,
  trackStyle,
} from "./derive";

/**
 * The decision log — every day's journal reasoning records, verbatim,
 * grouped by session date, most recent first. Reads like a lab notebook:
 * one entry per record, the machine's own words (reason / rationale
 * strings ride untouched), and the closed result linked when the schema
 * lets us find it.
 *
 * Known record kinds render structured (gate_evaluation, state_print,
 * kill, skip_decide); unknown kinds — the Fable accounts will add some —
 * fall back to decision/reason/rationale so nothing gets dropped.
 */

const MAX_ENTRIES = 40;

export function DecisionLog({ bundle }: { bundle: SolitonBundle }) {
  const merged = mergedDecisions(bundle).slice(0, MAX_ENTRIES);
  if (merged.length === 0) {
    return (
      <p className="sol-dim">
        No journal records yet — the log fills in as sessions run.
      </p>
    );
  }

  // Group by session date (as_of), preserving most-recent-first order.
  const groups: { date: string; entries: typeof merged }[] = [];
  for (const e of merged) {
    const date = e.decision.as_of ?? (e.decision.timestamp ?? "").slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.entries.push(e);
    else groups.push({ date, entries: [e] });
  }

  return (
    <ol className="sol-log">
      {groups.map((g) => (
        <li key={g.date} className="sol-log-day">
          <div className="sol-log-date">{fmtDate(g.date)}</div>
          <ol className="sol-log-entries">
            {g.entries.map((e, i) => (
              <Entry
                key={`${e.track.id}-${e.decision.timestamp ?? i}`}
                track={e.track}
                d={e.decision}
              />
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}

function Entry({ track, d }: { track: SolitonTrack; d: DecisionRecord }) {
  const style = trackStyle(track);
  const protagonist = trackRole(track) === "protagonist";
  return (
    <li
      className={"sol-entry" + (protagonist ? " sol-entry-hi" : "")}
      style={{ borderLeftColor: style.color }}
    >
      <div className="sol-entry-head">
        <span className="sol-entry-track" style={{ color: style.color }}>
          {track.id}
        </span>
        <span className="sol-entry-kind">{d.record}</span>
        {d.timestamp && (
          <time className="sol-entry-time">{fmtDateTime(d.timestamp)}</time>
        )}
      </div>
      <EntryBody track={track} d={d} />
    </li>
  );
}

function EntryBody({ track, d }: { track: SolitonTrack; d: DecisionRecord }) {
  switch (d.record) {
    case "gate_evaluation":
      return <GateEvaluation track={track} d={d} />;
    case "state_print":
      return <StatePrint d={d} />;
    case "kill":
      return (
        <p className="sol-entry-body">
          <strong className="sol-halt">halted</strong> —{" "}
          <span className="sol-verbatim">{d.reason}</span>
        </p>
      );
    case "skip_decide":
      return (
        <p className="sol-entry-body sol-dim">
          session skipped — <span className="sol-verbatim">{d.reason}</span>
        </p>
      );
    default:
      return <GenericRecord d={d} />;
  }
}

function GateEvaluation({
  track,
  d,
}: {
  track: SolitonTrack;
  d: DecisionRecord;
}) {
  const result = linkedTrade(track, d);
  return (
    <div className="sol-entry-body">
      <p>
        IV rank{" "}
        <strong>{d.iv_rank != null ? d.iv_rank.toFixed(1) : "—"}</strong> vs
        gate {d.gate != null ? d.gate.toFixed(1) : "—"}
        {typeof d.n_open === "number" && <> · {d.n_open} open</>} →{" "}
        <strong>{d.decision ?? "—"}</strong>
      </p>
      {d.reason && <p className="sol-verbatim">“{d.reason}”</p>}
      {d.order && <OrderLine order={d.order} />}
      {result && (
        <p className="sol-entry-result">
          → closed {fmtDate(result.closed)}:{" "}
          <strong className={result.pnl >= 0 ? "sol-pos" : "sol-neg"}>
            {fmtSignedMoney(result.pnl)}
          </strong>
          {result.reason && <span className="sol-dim"> ({result.reason})</span>}
        </p>
      )}
    </div>
  );
}

function StatePrint({ d }: { d: DecisionRecord }) {
  const dial = (v: number | null | undefined) =>
    v == null ? "∅" : Number(v).toFixed(2);
  return (
    <div className="sol-entry-body">
      <p>
        state <strong>{d.state ?? d.raw_state ?? "—"}</strong>
        {d.transition && d.prev_state && (
          <span className="sol-transition"> (was {d.prev_state})</span>
        )}{" "}
        → <strong>{d.decision ?? "—"}</strong>
      </p>
      {d.dials && (
        <p className="sol-dials-line">
          dials: ts {dial(d.dials.ts)} · d200 {dial(d.dials.d200)} · lppls{" "}
          {dial(d.dials.lppls)} <span className="sol-dim">(∅ = no evidence)</span>
        </p>
      )}
      {d.reason && <p className="sol-verbatim">“{d.reason}”</p>}
    </div>
  );
}

/**
 * Unknown record kind (future tracks). Render the model's own words when
 * present — rationale is the field the Fable accounts are expected to
 * carry — plus whatever decision/reason exists.
 */
function GenericRecord({ d }: { d: DecisionRecord }) {
  return (
    <div className="sol-entry-body">
      {d.decision && (
        <p>
          → <strong>{d.decision}</strong>
        </p>
      )}
      {d.rationale && <blockquote className="sol-rationale">{d.rationale}</blockquote>}
      {d.reason && !d.rationale && (
        <p className="sol-verbatim">“{d.reason}”</p>
      )}
      {!d.decision && !d.rationale && !d.reason && (
        <p className="sol-dim">({d.record} record — no public fields)</p>
      )}
      {d.order && <OrderLine order={d.order} />}
    </div>
  );
}

function OrderLine({
  order,
}: {
  order: NonNullable<DecisionRecord["order"]>;
}) {
  const strikes = Array.isArray(order.strikes)
    ? order.strikes.map((s) => Number(s)).join("/")
    : null;
  return (
    <p className="sol-order">
      order: {order.expiration && <>exp {order.expiration}</>}
      {strikes && <> · strikes {strikes}</>}
      {order.qty != null && <> · {order.qty}×</>}
      {order.limit_credit != null && <> · limit credit ${order.limit_credit}</>}
      {order.modeled_credit_mid != null && (
        <span className="sol-dim"> (modeled mid ${order.modeled_credit_mid})</span>
      )}
    </p>
  );
}

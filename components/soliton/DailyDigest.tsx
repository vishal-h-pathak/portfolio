import type { SolitonBundle, SolitonTrack } from "@/app/lib/soliton-export";
import { fmtDate, fmtMoney, fmtPct, fmtSignedMoney } from "./derive";
import {
  digestDays,
  englishList,
  faProposedOrder,
  fmtStructure,
  orderSymbols,
  orderTheses,
  rationaleExcerpt,
  type DigestDay,
  type FableDay,
  type ReferenceDay,
} from "./digest";

/**
 * The daily digest — the experiment's record retold in plain language, one
 * entry per cycle, newest first. Deterministic template prose over the
 * export bundle: every number is a bundle field, every excerpt links to
 * the verbatim record in the decision log below. No LLM writes this — the
 * model's own words appear only inside quotation marks.
 */

export function DailyDigest({ bundle }: { bundle: SolitonBundle }) {
  const days = digestDays(bundle);
  const fa = bundle.tracks.find((t) => t.id === "FA");
  const fe = bundle.tracks.find((t) => t.id === "FE");

  return (
    <>
      <DigestIntro fa={fa} fe={fe} />
      {days.length === 0 ? (
        <p className="sol-dim" style={{ marginTop: 20 }}>
          No cycles yet — the digest starts writing itself the day the Fable
          accounts log their first session.
        </p>
      ) : (
        <ol className="sol-digest">
          {days.map((day) => (
            <DigestEntry key={day.date} day={day} />
          ))}
        </ol>
      )}
    </>
  );
}

/**
 * The "explain it to a visitor" block. Voice per docs/STRATEGIES_EXPLAINED
 * in the engine repo; bankroll figures read from the bundle's caps so the
 * prose can't drift from the config.
 */
function DigestIntro({
  fa,
  fe,
}: {
  fa: SolitonTrack | undefined;
  fe: SolitonTrack | undefined;
}) {
  const faBank = fa?.caps?.bankroll_usd;
  const feBank = fe?.caps?.bankroll_usd;
  return (
    <div className="sol-digest-intro">
      <p>
        How to read this: two paper accounts, one Fable API call each per
        session. <strong>FA — fable-aggressive</strong> — buys short-dated
        call and put spreads on SPY or QQQ off the macro calendar
        {faBank != null && (
          <>
            , from a {fmtMoney(faBank)} ring-fenced bankroll with per-punt
            caps and loss stops enforced by code
          </>
        )}
        . <strong>FE — fable-economist</strong> — keeps a running thesis
        journal on the AI economy and buys the leverage points it finds
        (long-only equities{feBank != null && <>, {fmtMoney(feBank)} bankroll</>}
        ). The model decides; the code builds every order, checks it against
        the caps, and refuses anything outside them — refusals are published
        too.
      </p>
      <p>
        Both accounts run under a <strong>daily-trade mandate</strong>: every
        session, each must take at least one position action. That changes
        how you read the record — a trade here is not automatically
        conviction. The model flags trades it took only to satisfy the
        mandate and the digest labels them; safety halts beat the mandate,
        so a stopped account simply doesn&rsquo;t trade.
      </p>
      <p>
        What would count as success was defined before launch: beat the
        mechanical control and SPY buy-and-hold over 100+ logged trades with
        every cap respected. One green day proves nothing. The record below
        is the product — forced trades, refusals, and all.
      </p>
    </div>
  );
}

function DigestEntry({ day }: { day: DigestDay }) {
  return (
    <li className="sol-digest-day">
      <div className="sol-digest-date">
        Day {day.dayNumber} — {fmtDate(day.date)}
      </div>
      <div className="sol-digest-body">
        {day.fa ? <FaLine f={day.fa} /> : <p>FA logged no session.</p>}
        {day.fa && <ExcerptLine f={day.fa} />}
        {day.fe ? <FeLine f={day.fe} /> : <p>FE logged no session.</p>}
        {day.fe && <ExcerptLine f={day.fe} />}
        <p className="sol-digest-ref">
          <RefLine gate={day.gate} /> <SpyLine pct={day.spyPct} />
        </p>
      </div>
    </li>
  );
}

// ── Sentence templates ──────────────────────────────────────────────────────

/** "it's up $120 on the day and up $340 since launch" (or first-session). */
function pnlClause(f: FableDay): string {
  const since =
    f.sinceLaunchPnl == null
      ? null
      : f.sinceLaunchPnl === 0
        ? "flat since launch"
        : `${f.sinceLaunchPnl > 0 ? "up" : "down"} ${fmtMoney(
            Math.abs(f.sinceLaunchPnl),
          )} since launch`;
  if (f.dayPnl == null) {
    return since ? `${since} — first session on the books` : "first session on the books";
  }
  const dayPart =
    f.dayPnl === 0 ? "flat on the day" : `${fmtSignedMoney(f.dayPnl)} on the day`;
  return since ? `${dayPart}, ${since}` : dayPart;
}

function MandateFlag({ f }: { f: FableDay }) {
  if (f.record.mandate_forced) {
    return <span className="sol-flag sol-flag-forced">to satisfy the mandate</span>;
  }
  return <span className="sol-flag">voluntarily</span>;
}

function FaLine({ f }: { f: FableDay }) {
  const d = f.record;
  const outcome = d.validation?.outcome ?? "";
  const order = faProposedOrder(d);
  const what = order ? (
    <>
      a {fmtStructure(order.structure)} on{" "}
      <strong>{order.underlying ?? order.symbol ?? "—"}</strong>
      {order.risk_budget_usd != null && (
        <> ({fmtMoney(order.risk_budget_usd)} at risk)</>
      )}
    </>
  ) : null;

  if ((outcome === "accepted" || outcome === "accepted_partial") && (d.orders?.length ?? 0) > 0) {
    return (
      <p>
        <strong>FA</strong> bought {what}, <MandateFlag f={f} />;{" "}
        {pnlClause(f)}.
      </p>
    );
  }
  if (outcome === "all_orders_invalid") {
    const problem = d.validation?.problems?.[0];
    return (
      <p>
        <strong>FA</strong> reached for {what ?? "a trade"},{" "}
        <MandateFlag f={f} /> — but the caps code bounced it
        {problem && (
          <>
            : <span className="sol-verbatim">“{problem}”</span>
          </>
        )}
        . No position, so the mandate went unmet; {pnlClause(f)}.
      </p>
    );
  }
  if (outcome === "stand_aside_mandate_violation") {
    return (
      <p>
        <strong>FA</strong> stood aside — a mandate violation, logged as
        such; {pnlClause(f)}.
      </p>
    );
  }
  return (
    <p>
      <strong>FA</strong>&rsquo;s session ended{" "}
      <span className="sol-verbatim">{outcome || "with no public orders"}</span>;{" "}
      {pnlClause(f)}.
    </p>
  );
}

function FeLine({ f }: { f: FableDay }) {
  const d = f.record;
  const buys = orderSymbols(d, "buy");
  const sells = orderSymbols(d, "sell");
  const theses = orderTheses(d);
  const nProblems = d.validation?.problems?.length ?? 0;
  const nUpdates = d.thesis_updates?.length ?? 0;

  if (buys.length === 0 && sells.length === 0) {
    return (
      <p>
        <strong>FE</strong>{" "}
        {nUpdates > 0
          ? `held its book and worked the journal (${nUpdates} thesis update${
              nUpdates === 1 ? "" : "s"
            })`
          : "held its book"}
        ; {pnlClause(f)}.
      </p>
    );
  }
  return (
    <p>
      <strong>FE</strong>{" "}
      {buys.length > 0 && (
        <>
          opened <strong>{englishList(buys)}</strong>
        </>
      )}
      {buys.length > 0 && sells.length > 0 && " and "}
      {sells.length > 0 && (
        <>
          trimmed <strong>{englishList(sells)}</strong>
        </>
      )}
      {theses.length > 0 && (
        <>
          {" "}
          on its {englishList(theses.map((t) => `‘${t}’`))}{" "}
          {theses.length === 1 ? "thesis" : "theses"}
        </>
      )}
      , <MandateFlag f={f} />
      {nProblems > 0 && (
        <>
          {" "}
          ({nProblems} order{nProblems === 1 ? "" : "s"}{" "}
          didn&rsquo;t clear the caps)
        </>
      )}
      ; {pnlClause(f)}.
    </p>
  );
}

function ExcerptLine({ f }: { f: FableDay }) {
  const excerpt = rationaleExcerpt(f.record);
  if (!excerpt) return null;
  return (
    <p className="sol-digest-excerpt">
      <span className="sol-verbatim">“{excerpt}”</span>{" "}
      <a href={`#${f.anchor}`}>→ full decision record</a>
    </p>
  );
}

function RefLine({ gate }: { gate: ReferenceDay | null }) {
  if (!gate) return <>The mechanical control logged nothing.</>;
  const label = gate.track.id === "A" ? "Track A" : gate.track.name;
  if (gate.haltReason) {
    return (
      <>
        {label} sat the session out (
        <span className="sol-verbatim">{gate.haltReason.slice(0, 80)}</span>
        ).
      </>
    );
  }
  const d = gate.record;
  if (!d) return <>{label} logged nothing.</>;
  const iv = d.iv_rank != null ? d.iv_rank.toFixed(1) : "—";
  const gv = d.gate != null ? d.gate.toFixed(1) : "—";
  if (d.decision === "no_trade") {
    const below = d.iv_rank != null && d.gate != null && d.iv_rank < d.gate;
    return (
      <>
        {label} stayed flat (IV rank {iv},{" "}
        {below ? `below its ${gv} gate` : `vs its ${gv} gate`}).
      </>
    );
  }
  return (
    <>
      {label} fired: {fmtStructure(d.decision)} (IV rank {iv}, above its {gv}{" "}
      gate).
    </>
  );
}

function SpyLine({ pct }: { pct: number | null }) {
  if (pct == null) return <>SPY: first close on the record.</>;
  return <>SPY {pct === 0 ? "flat" : fmtPct(pct)}.</>;
}

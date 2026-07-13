import type { Metadata } from "next";
import { getSolitonExport } from "@/app/lib/soliton-export";
import {
  fmtDate,
  fmtDateTime,
  hasHistory,
  protagonists,
  SPY_STYLE,
  trackRole,
  trackStyle,
  type TrackStyle,
} from "@/components/soliton/derive";
import { RaceChart } from "@/components/soliton/RaceChart";
import { DailyDigest } from "@/components/soliton/DailyDigest";
import { DecisionLog } from "@/components/soliton/DecisionLog";
import { TrackPanel } from "@/components/soliton/TrackPanel";

export const metadata: Metadata = {
  title: "Soliton — can the most advanced available model trade?",
  description:
    "A live paper-trading experiment: two accounts run by a frontier model, raced in public against mechanical controls and SPY buy-and-hold. Every decision logged verbatim, evidence labeled honestly per track.",
};

// ISR, matching the homepage rail: the engine exports once per session,
// so 5-minute staleness is far fresher than the data itself.
export const revalidate = 300;

export default async function SolitonPage() {
  const { bundle, source } = await getSolitonExport();
  const fable = protagonists(bundle);
  const live = hasHistory(bundle);

  return (
    <>
      {/* ── masthead ──────────────────────────────────────────────────── */}
      <section>
        <p className="sol-kicker">B-01 · Soliton — a live paper-trading experiment</p>
        <h1 className="sol-title">
          Can the most advanced available model trade?
        </h1>
        <div className="sol-lede">
          <p>
            This plate used to be{" "}
            <a href="/projects/meridian">MERIDIAN</a>{" "}— five specialist LLMs
            deliberating over filings and news sentiment. It produced
            sophisticated reasoning and, in two months, exactly one trade. The
            honest review: an analysis engine with no defined edge. SOLITON is
            the rebuild — the predecessor&rsquo;s console is{" "}
            <a href="/projects/meridian">preserved as an archive</a>. Every
            strategy here is a mechanical, pre-registered rule set — same
            inputs, same trade — backtested before it touches even paper
            money, and run in public.
          </p>
          <p>
            The experiment sitting on top: <strong>two paper accounts are run
            by Fable</strong>, the most advanced Claude model available over an
            API, both under a daily-trade mandate.{" "}
            <strong>Fable-aggressive (FA)</strong> buys short-dated convexity
            off the macro calendar, inside caps enforced by code, not prompt.{" "}
            <strong>Fable-economist (FE)</strong> keeps a running thesis
            journal on the AI economy — with web search as its eyes — and buys
            the structural leverage points it finds. Everything else on this
            page is a reference line: the mechanical control, the
            dynamical-state overlay, SPY buy-and-hold.
          </p>
          <p style={{ color: "var(--ink-faint)" }}>
            Success was defined before launch: beat the controls over 100+
            logged trades with every cap respected — not &ldquo;up in week
            one.&rdquo; Paper money throughout.
          </p>
          <p className="sol-design-cta">
            <a href="/projects/soliton/design">
              → THE DESIGN STORY — every decision in the rebuild, and why
            </a>
          </p>
        </div>

        {(!live || fable.length === 0) && (
          <aside className="sol-prelaunch">
            <strong>PRE-LAUNCH</strong> — as of {fmtDate(bundle.as_of)}
            {fable.length === 0 ? (
              <>
                {" "}
                the protagonists aren&rsquo;t on the field yet: the Fable
                accounts join with the next engine phase. The reference tracks
                below are already cycling and logging — every record shown is
                real engine output.
              </>
            ) : (
              <>
                {" "}
                every account is at day zero. The curves draw themselves from
                here.
              </>
            )}
          </aside>
        )}
      </section>

      {/* ── the race ──────────────────────────────────────────────────── */}
      <section className="sol-section" aria-labelledby="sol-race-head">
        <h2 className="sol-section-head" id="sol-race-head">
          The race — % return since inception, paper accounts
        </h2>
        <RaceChart bundle={bundle} />
        <div className="sol-legend">
          {bundle.tracks
            .filter((t) => !t.signals_only)
            .map((t) => (
              <LegendRow
                key={t.id}
                id={t.id}
                name={t.name}
                label={t.evidence_label}
                style={trackStyle(t)}
                emphasis={trackRole(t) === "protagonist"}
              />
            ))}
          <LegendRow
            id="SPY"
            name={`${bundle.benchmark.symbol} buy-and-hold`}
            label="the do-nothing baseline every track has to justify itself against"
            style={SPY_STYLE}
            emphasis={false}
          />
        </div>
        <p className="sol-asof">
          as of {bundle.as_of} · exported {fmtDateTime(bundle.generated_at)} ·{" "}
          {source === "live"
            ? "live export"
            : "checked-in sample bundle (pre-launch)"}
        </p>
      </section>

      {/* ── daily digest ──────────────────────────────────────────────── */}
      <section className="sol-section" aria-labelledby="sol-digest-head">
        <h2 className="sol-section-head" id="sol-digest-head">
          The daily digest — the record, day by day
        </h2>
        <DailyDigest bundle={bundle} />
      </section>

      {/* ── decision log ──────────────────────────────────────────────── */}
      <section className="sol-section" aria-labelledby="sol-log-head">
        <h2 className="sol-section-head" id="sol-log-head">
          Decision log — every session, verbatim
        </h2>
        <p className="sol-lede" style={{ marginTop: 0, marginBottom: 24 }}>
          The engine journals every decision it makes — and every session it
          refuses to trade, with the reason. The Fable accounts&rsquo;
          one-paragraph rationales appear here word for word, next to the
          orders the code actually built and every cap check they failed.
          Nothing is edited after the fact.
        </p>
        <DecisionLog bundle={bundle} />
      </section>

      {/* ── track panels ──────────────────────────────────────────────── */}
      <section className="sol-section" aria-labelledby="sol-tracks-head">
        <h2 className="sol-section-head" id="sol-tracks-head">
          The tracks
        </h2>
        <div className="sol-panels">
          {bundle.tracks.map((t) => (
            <TrackPanel key={t.id} track={t} />
          ))}
        </div>
      </section>

      {/* ── methodology ───────────────────────────────────────────────── */}
      <section className="sol-section" aria-labelledby="sol-method-head">
        <h2 className="sol-section-head" id="sol-method-head">
          Methodology — what&rsquo;s proven, what isn&rsquo;t
        </h2>

        <div className="sol-verdicts">
          <p>
            <strong>The backtests did not find an edge — and publishing that
            is the point.</strong>{" "}
            The premium-selling family was pre-registered and tested twice:
            first on synthetic implied-vol chains (no edge demonstrated either
            way), then re-run on real 2016–2026 option chains (what edge
            existed was consumed by friction — spreads, slippage, assignment).
          </p>
          <p>
            The tracks launched anyway, as a public forward test, with the
            evidence status printed verbatim on every panel above. If a line
            goes up, that&rsquo;s data, not vindication.
          </p>
        </div>

        <div className="sol-method">
          <div>
            <h3>Paper money</h3>
            <p>
              Every dollar on this page is a virtual sub-ledger: each track
              runs $100k of paper capital against real market data. No real
              money moves. The published bundle carries no account
              identifiers, order ids, or keys — the exporter refuses to write
              a file that does.
            </p>
          </div>
          <div>
            <h3>Cost model</h3>
            <p>
              Fills are modeled against real end-of-day chains with
              commissions and slippage charged on every leg. Assignment
              friction — the gap between modeled settlement and what physical
              settlement would have cost — is logged as a first-class
              statistic in the trade logs, because that&rsquo;s where paper
              results quietly diverge from reality.
            </p>
          </div>
          <div>
            <h3>Pre-registration</h3>
            <p>
              Entry rules, parameter grids, exits, and kill criteria are
              frozen in versioned specs before the data runs, and the kill
              criteria are code, not judgment — a track that trips one halts
              itself and says so on its panel. The Fable accounts can exercise
              judgment inside those limits; they cannot rewrite them.
            </p>
          </div>
          <div>
            <h3>The record</h3>
            <p>
              The engine, the backtests, and the verdicts live in the source
              repo — private, since it&rsquo;s a live trading system —
              negative results included. This page renders the engine&rsquo;s
              own export bundle verbatim — same file, same labels. The public
              artifact is{" "}
              <a href="/projects/soliton/design">the design story</a>: the
              MERIDIAN lesson, the data saga, the three verdicts, why each
              track exists.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function LegendRow({
  id,
  name,
  label,
  style,
  emphasis,
}: {
  id: string;
  name: string;
  label: string;
  style: TrackStyle;
  emphasis: boolean;
}) {
  return (
    <div className="sol-legend-row">
      <svg
        className="sol-legend-swatch"
        width="34"
        height="6"
        viewBox="0 0 34 6"
        aria-hidden="true"
      >
        <line
          x1="0"
          x2="34"
          y1="3"
          y2="3"
          stroke={style.color}
          strokeWidth={emphasis ? 2.4 : 1.4}
          strokeDasharray={style.dash}
        />
      </svg>
      <span className="sol-legend-id">{id}</span>
      <span>
        {name} — <span className="sol-legend-label">{label}</span>
      </span>
    </div>
  );
}

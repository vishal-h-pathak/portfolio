import type { Metadata } from "next";
import { getSolitonExport } from "@/app/lib/soliton-export";
import {
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
import { VerdictStrip } from "@/components/soliton/VerdictStrip";

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
        <p className="plate-kicker">B-01 · Soliton — a live paper-trading experiment</p>
        <h1 className="sol-title">
          Can the most advanced available model trade?
        </h1>

        {/* verdict strip — answers the 60-second questions before the prose */}
        <VerdictStrip bundle={bundle} source={source} />

        <div className="sol-lede">
          <p>
            <strong>The experiment:</strong> two paper accounts are run by{" "}
            <strong>Fable</strong>, the most advanced Claude model available over
            an API, both under a <em>daily-trade mandate</em> (each must act at
            least once a session — so a trade here is not automatically
            conviction).{" "}
            <strong>Fable-aggressive (FA)</strong> makes short-dated options bets{" "}
            <span className="sol-gloss">
              (cheap bets that pay off big if the market lurches around scheduled
              events like a CPI print or a Fed meeting)
            </span>{" "}
            inside caps enforced by code, not prompt.{" "}
            <strong>Fable-economist (FE)</strong> keeps a written thesis journal
            on the AI economy — with web search as its eyes — and buys the
            companies it argues are the leverage points. Everything else on this
            page is a reference line to beat: a mechanical control strategy, a
            market-state overlay, and SPY buy-and-hold.
          </p>
          <p>
            {!live && fable.length > 0 ? (
              <>Every account is at day zero; the curves draw themselves from
              here. </>
            ) : null}
            <strong>Where it came from:</strong> this plate used to be{" "}
            <a href="/projects/meridian">MERIDIAN</a> — five specialist LLMs
            deliberating over filings and news sentiment. It produced
            sophisticated reasoning and, in two months, exactly one trade: an
            analysis engine with no defined edge. SOLITON is the rebuild
            (MERIDIAN is <a href="/projects/meridian">kept as an archive</a>).
            Every strategy here is a mechanical, pre-registered rule set,
            backtested before it touches even paper money, and run in public.
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
      </section>

      {/* ── daily digest (the hero: the record in plain language) ──────── */}
      <section className="sol-section" aria-labelledby="sol-digest-head">
        <h2 className="sol-section-head" id="sol-digest-head">
          The record — day by day, in plain language
        </h2>
        <PlainLanguageKey />
        <DailyDigest bundle={bundle} />
      </section>

      {/* ── the race (the same story as a chart) ───────────────────────── */}
      <section className="sol-section" aria-labelledby="sol-race-head">
        <h2 className="sol-section-head" id="sol-race-head">
          The race — the same accounts as one chart, % return since launch
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

      {/* ── track panels (progressive disclosure — the deep view) ──────── */}
      <section className="sol-section" aria-labelledby="sol-tracks-head">
        <h2 className="sol-section-head" id="sol-tracks-head">
          Under the hood — every track&rsquo;s live panel
        </h2>
        <p className="sol-lede" style={{ marginTop: 0, marginBottom: 16 }}>
          One panel per track: paper equity, its win/loss record, open positions,
          and — kept in plain sight — the honest evidence label and any safety
          halt. The two Fable accounts are the experiment; the rest are the
          reference lines they&rsquo;re measured against.
        </p>
        <details className="sol-detail sol-tracks-detail">
          <summary>
            Open the {bundle.tracks.length} track panels (equity · records ·
            positions · alarms)
          </summary>
          <div className="sol-detail-body">
            <div className="sol-panels">
              {bundle.tracks.map((t) => (
                <TrackPanel key={t.id} track={t} />
              ))}
            </div>
          </div>
        </details>
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

/**
 * The plain-language key — the honest-but-jargon-heavy labels this page
 * insists on keeping, each translated once. Collapsed by default so it never
 * competes with the record; there for the visitor who hits a term cold.
 */
function PlainLanguageKey() {
  const terms: [string, string][] = [
    ["paper money", "virtual $100k (or a smaller ring-fenced bankroll) traded against real prices — no real money moves."],
    ["daily-trade mandate", "each Fable account must take at least one action every session, so some trades are obligation, not conviction — those are flagged."],
    ["mandate-forced", "the model itself flagged a trade as taken only to satisfy that rule."],
    ["IV rank (0–100)", "how expensive options insurance is right now versus the past year — high means pricey."],
    ["put spread / iron condor", "defined-risk options bets: you know the most you can lose up front."],
    ["evidence label", "each track wears its honest status: control = a yardstick, not a bet; negative / unproven = the backtest found no edge; shadow = tracked for signal only, no money."],
    ["SPY buy-and-hold", "just holding the S&P 500 — the do-nothing baseline every strategy has to beat."],
  ];
  return (
    <details className="sol-detail sol-key">
      <summary>Plain-language key — what the labels on this page mean</summary>
      <div className="sol-detail-body">
        <dl className="sol-key-dl">
          {terms.map(([t, d]) => (
            <div key={t} className="sol-key-row">
              <dt>{t}</dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
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

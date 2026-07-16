import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Soliton — why it's built this way",
  description:
    "The design story of the SOLITON trading experiment: the MERIDIAN lesson, the honesty machinery, the data saga, three pre-registered negative verdicts, and why each track exists. Every number traces to a phase report.",
};

// Fully static — the live page owns the data plumbing; this page is the
// written record of the design decisions and the measurements that forced
// them. Content is curated from the (private) engine repo's decision brief
// and phase reports; nothing here fetches anything.
export const dynamic = "force-static";

export default function SolitonDesignPage() {
  return (
    <>
      {/* ── masthead ──────────────────────────────────────────────────── */}
      <section>
        <p className="plate-kicker">B-01 · Soliton — the design story</p>
        <h1 className="sol-title">Why it&rsquo;s built this way</h1>
        <div className="sol-lede">
          <p>
            <a href="/projects/soliton">The live page</a>{" "}shows the record.
            This page is the reasoning behind it — every major decision in the
            rebuild, what forced it, and the actual numbers. It reads in
            order, because the design really was a sequence of arguments, and
            most of them were settled by a measurement rather than a
            preference. Where a claim has numbers behind it, they&rsquo;re in
            the expandable blocks; every figure comes from a phase report in
            the engine repo.
          </p>
        </div>
      </section>

      {/* ── 1 · the predecessor ───────────────────────────────────────── */}
      <section className="sol-section sol-story" aria-labelledby="d-meridian">
        <h2 className="sol-section-head" id="d-meridian">
          1 · The predecessor, and the lesson
        </h2>
        <p>
          SOLITON exists because of an honest review of what came before it.{" "}
          <a href="/projects/meridian">MERIDIAN</a>{" "}was a ~22,000-line options
          system: five specialist LLMs and a panel-of-judges deliberating over
          SEC filings, Form 4s, congressional trades, and news sentiment. It
          produced genuinely sophisticated reasoning and, in about two months
          of paper trading, <strong>exactly one trade</strong>{" "}(NVDA, May 6,
          medium confidence). Everything else was a HOLD — and reading the
          logs, most of those HOLDs weren&rsquo;t discipline. They were
          cascading pipeline failures: one specialist returns a fallback, the
          fail-closed protocol vetoes the cycle, and the system spends
          $0.60&ndash;0.70 of LLM calls to decide nothing. It mostly vetoed
          itself.
        </p>
        <p>
          The review&rsquo;s conclusion: MERIDIAN was an analysis engine, not
          a trading system. Nowhere in 22K lines was there a falsifiable rule
          that said <em>when</em>{" "}to enter, <em>what structure</em>{" "}to trade,
          or <em>why it should make money</em>. Betting on narrative
          interpretation — the Iran-war/semiconductor framing — meant there
          was no edge to test, only vibes with infrastructure. That gap, not
          any single bug, is what the rebuild had to close. The console is{" "}
          <a href="/projects/meridian">preserved as an archive</a>, because
          the lesson is worth keeping visible.
        </p>
        <details className="sol-detail">
          <summary>What was salvaged, what was dead weight</summary>
          <div className="sol-detail-body">
            <p>
              About a quarter of the repo survived the review: the broker
              client, the Black-Scholes and historical-volatility math, an
              LPPL bubble-model implementation (which became a seed of Track
              C), the logging schema, and the scheduler/notifier plumbing.
              The five-specialist pipeline, the geopolitical synthesizer, the
              reaction predictor, and most of the ten ingestion sources were
              dead weight — good engineering pointed at the wrong problem.
              The rebuild was greenfield with salvage imports; MERIDIAN was
              frozen on a legacy branch rather than fought with in place.
            </p>
          </div>
        </details>
      </section>

      {/* ── 2 · professional ──────────────────────────────────────────── */}
      <section className="sol-section sol-story" aria-labelledby="d-prof">
        <h2 className="sol-section-head" id="d-prof">
          2 · What &ldquo;professional&rdquo; turned out to mean
        </h2>
        <p>
          The redesign started with a definition. A professional strategy is
          a <strong>falsifiable rule set with a known statistical edge</strong>,
          and it has five ingredients: a hypothesis for <em>why</em>{" "}money is
          made (ideally structural, not predictive); exact mechanical rules a
          computer can execute identically every time; a backtest over 5&ndash;10
          years — including 2020 and 2022 — proving positive expectancy after
          commissions and slippage; a promotion ladder from backtest to paper
          to small real capital with pre-committed kill criteria; and ongoing
          measurement that live results stay consistent with the backtest.
          MERIDIAN had (attempted) the fifth ingredient&rsquo;s infrastructure
          and none of the first four.
        </p>
        <p>
          Which is why the first half of this build was an honesty machine,
          not a trader. Before any strategy question could be asked, the
          harness had to make two kinds of self-deception structurally hard:
          looking at the future, and moving the goalposts. The no-lookahead
          guarantee is architectural — strategies only ever see a view object
          whose every accessor is capped at &ldquo;today&rdquo;, and the test
          suite drives a deliberately cheating strategy through a real run to
          prove the fence holds. Pre-registration is procedural — every
          parameter grid, fold schedule, selection rule, and pass/fail gate is
          committed as executable code <em>before</em>{" "}the sweep runs, with
          the fail branches (what ships, what gets reported) decided in
          advance too. Post-hoc tuning is how retail quants fool themselves:
          run enough variations and something always &ldquo;works&rdquo;,
          and the only defense is deciding what counts as success before you
          look.
        </p>
        <details className="sol-detail">
          <summary>How the registration mechanics actually work</summary>
          <div className="sol-detail-body">
            <p>
              A registration is a module whose docstring and constants{" "}
              <em>are</em>{" "}the protocol: the grid, the in-sample/out-of-sample
              fold table (six folds, with 2020&ndash;21 and 2022&ndash;23
              deliberately out-of-sample and a final untouched holdout),
              selection on pooled in-sample expectancy with a plateau
              requirement (a cell must be positive <em>and</em>{" "}most of its
              parameter-space neighbors positive — a guard against lone
              overfit peaks), and gates evaluated only on frozen parameters.
              Later registrations import the referee from the first one
              rather than copying it, so the rules can&rsquo;t drift between
              phases. When a verdict lands, no gate is relaxed, no cell is
              added, and the report says exactly which stage failed.
            </p>
          </div>
        </details>
      </section>

      {/* ── 3 · the data saga ─────────────────────────────────────────── */}
      <section className="sol-section sol-story" aria-labelledby="d-data">
        <h2 className="sol-section-head" id="d-data">
          3 · The data saga
        </h2>
        <p>
          Honest backtests of options strategies need historical option
          chains, and real chains are the expensive part. The build started
          at $0: synthetic chains — Black-Scholes prices over the VIX level —
          with the bias against real quotes <em>measured</em>{" "}rather than
          assumed. The first measurement, on the single legs the strategies
          would sell, looked reassuring: the flat surface underpriced them by
          about 11%, meaning synthetic backtests would understate the credit
          collected. Conservative. Safe to proceed.
        </p>
        <p>
          Then the same measurement was done at the <em>spread</em>{" "}level —
          the structure actually traded — and the sign flipped.
          A credit spread is a short leg minus a long leg, and the flat
          surface distorts both: the measured net-credit overstatement ran
          from <strong>+3.5% in the 2020 crash to +96% in calm 2021</strong>,
          overstated in ten out of ten matched spreads, median +27%. Synthetic
          credits weren&rsquo;t conservative at all — they were optimistic,
          and worst exactly when premium sellers trade least. That one
          measurement produced the credit-haircut band the first bake-off ran
          under, and later killed what briefly looked like a winner: the best
          synthetic cells flipped from failing to passing <em>inside</em>{" "}the
          haircut&rsquo;s uncertainty band, which meant the instrument
          couldn&rsquo;t resolve the question at all.
        </p>
        <p>
          The escalation was itself pre-registered: if a verdict flips inside
          the band, buy real data. It flipped, so — after a genuinely
          exhaustive vendor hunt with a $100 cap — the real store turned out
          to cost <strong>$0.00</strong>: a free vendor archive of end-of-day
          SPY chains 2010&ndash;2023 and QQQ 2012&ndash;2023,{" "}
          <strong>30.1 million rows</strong>{" "}with real bid/ask, gap-filled
          2024→now from a second free tier, and cross-validated against two
          independent captures agreeing to about three cents of mid.
        </p>
        <p>
          One more forced correction came late. The price cache was
          dividend-adjusted; real chain strikes are actual dollars — by 2010
          the two differ ~25% (SPY 82.50 adjusted vs 109.58 actual on the
          same day). Delta-based strike selection had masked it for three
          phases; a later track&rsquo;s ATM-by-price rule surfaced it
          immediately. The fix re-ran the whole closed phase on corrected
          data. The verdict didn&rsquo;t change — but the numbers did, in
          both directions, and the correction revealed that the
          best-looking cells were exactly the ones with the worst crash
          tails. Every escalation in this section was forced by a
          measurement; none of it was in the original plan.
        </p>
        <details className="sol-detail">
          <summary>The bias measurement, by regime</summary>
          <div className="sol-detail-body">
            <p>
              Identical spread legs priced synthetically vs against real
              quotes (short strike chosen by the real deltas, ~30 days out),
              signed net-credit bias (synthetic − real) / real:
            </p>
            <table className="sol-table">
              <thead>
                <tr>
                  <th>date (regime)</th>
                  <th>VIX</th>
                  <th>bias</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>2020-03-18 (crash)</td>
                  <td>76</td>
                  <td>+3.5%, +17%</td>
                </tr>
                <tr>
                  <td>2021-06-15 (calm)</td>
                  <td>17</td>
                  <td>+42%, +91%, +96%</td>
                </tr>
                <tr>
                  <td>2022-06-15 (bear)</td>
                  <td>30</td>
                  <td>+17%, +17%, +19%</td>
                </tr>
                <tr>
                  <td>2025-01-15 (recent)</td>
                  <td>19</td>
                  <td>+35%, +44%</td>
                </tr>
              </tbody>
            </table>
            <p>
              Mean +38%, median +27%, understated in 0/10 cases. The
              mechanism: the VIX sits above true at-the-money implied vol (it
              embeds the skew premium), overpricing the short leg, while the
              missing smile underprices the far-out-of-the-money long leg —
              both effects inflate the modeled net credit, most in calm
              regimes.
            </p>
          </div>
        </details>
      </section>

      {/* ── 4 · three verdicts ────────────────────────────────────────── */}
      <section className="sol-section sol-story" aria-labelledby="d-verdicts">
        <h2 className="sol-section-head" id="d-verdicts">
          4 · Three verdicts, all honest
        </h2>
        <p>
          The premium-selling family — the insurance-company trade, selling
          expensive index options and collecting the gap between implied and
          realized volatility — went through three pre-registered tests. All
          three returned <strong>no edge demonstrated</strong>, each for a
          different and more instructive reason. These negative results are
          the credibility spine of the whole project: they&rsquo;re what the
          launch labels on the live page are made of.
        </p>
        <p>
          <strong>Verdict one — the instrument can&rsquo;t resolve it.</strong>{" "}
          The first bake-off ran 216 pre-registered parameter cells on
          synthetic chains: zero cells had positive pooled expectancy,
          in-sample or out. But the diagnostic sweep showed the best cells
          flipping from clear-fail to clear-pass inside the haircut band
          (flip point around 0.89 of modeled credit) — the synthetic-data
          uncertainty was bigger than the question. Per the pre-registered
          escalation rule, that fired the real-data purchase.
        </p>
        <p>
          <strong>Verdict two — friction eats thin edges.</strong>{" "}The
          identical protocol re-run on real 2010&ndash;2023 chains with real
          bid/ask: zero of 216 again, same failure stage. The autopsy is the
          part worth keeping: at frictionless mid-price fills the best cell
          shows a hair-thin gross edge (+$11/trade, profit factor 1.06), and
          at any realistic slippage the edge is gone (−$29/trade at the
          registered fill assumption). The variance risk premium is real; at
          30&ndash;45 days out and retail size, the market charges you the
          whole premium to collect it.
        </p>
        <p>
          <strong>Verdict three — every champion dies at the same gate.</strong>{" "}
          One registered redesign was allowed, aimed directly at the
          edge-to-friction ratio: wider structures, longer tenor, extreme-IV
          entries, hold-to-expiry. For the first time, selection succeeded —
          20 of 128 cells positive, plateau-supported champions in both
          regime arms. The champion (a QQQ iron condor, entered only above
          the 85th IV-rank percentile, held to expiration) passed the
          expectancy gate at +$313/trade out-of-sample, survived paying the
          full half-spread, cleared the trade-count floor — and failed
          exactly one gate: <strong>crash-stress liquidity</strong>, which
          re-prices every fill at 2.2× quoted widths through the 2020 and
          2022 folds. PF 0.974 against a required 1.00, a margin of about
          $16/trade over 17 stressed trades. The pre-commitment did its job:
          a genuinely marginal result got reported as a fail instead of
          argued into a pass. After the units correction it wasn&rsquo;t even
          marginal (stress PF 0.580) — and every alternative champion on the
          corrected data fails the same gate. The pattern is the finding:{" "}
          <em>the profitable-looking cells are profitable because they carry
          crash tails, and the one gate that asks about crisis-grade
          liquidity is the one none of them clear.</em>
        </p>
        <details className="sol-detail">
          <summary>The champion&rsquo;s gate table, before and after the units correction</summary>
          <div className="sol-detail-body">
            <table className="sol-table">
              <thead>
                <tr>
                  <th>gate</th>
                  <th>as computed</th>
                  <th>corrected</th>
                  <th>required</th>
                  <th>result</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>profit factor @ registered slippage</td>
                  <td>1.82</td>
                  <td>1.56</td>
                  <td>≥ 1.15</td>
                  <td>pass</td>
                </tr>
                <tr>
                  <td>expectancy @ registered slippage</td>
                  <td>+$313</td>
                  <td>+$245</td>
                  <td>&gt; 0</td>
                  <td>pass</td>
                </tr>
                <tr>
                  <td>profit factor paying full half-spread</td>
                  <td>1.72</td>
                  <td>1.48</td>
                  <td>≥ 1.00</td>
                  <td>pass</td>
                </tr>
                <tr>
                  <td>pooled out-of-sample trades</td>
                  <td>87</td>
                  <td>87</td>
                  <td>≥ 80</td>
                  <td>pass</td>
                </tr>
                <tr>
                  <td>crash stress (2.2× widths, 2020+2022 folds)</td>
                  <td>0.974</td>
                  <td>0.580</td>
                  <td>≥ 1.00</td>
                  <td>
                    <strong>FAIL</strong>
                  </td>
                </tr>
              </tbody>
            </table>
            <p>
              The corrected 2020 fold alone goes from −$1/trade to
              −$1,046/trade: the units bug had been compressing the rally
              levels the condor&rsquo;s short call settled against. The
              correction roughly doubled the grid&rsquo;s positive territory
              (put-spread hold cells had been suppressed by fabricated
              losses) — and every one of those newly-positive cells fails
              the same stress gate, several much harder.
            </p>
          </div>
        </details>
      </section>

      {/* ── 5 · the tracks ────────────────────────────────────────────── */}
      <section className="sol-section sol-story" aria-labelledby="d-tracks">
        <h2 className="sol-section-head" id="d-tracks">
          5 · The tracks, and why each exists
        </h2>
        <p>
          <strong>Track A — the control.</strong>{" "}The failed champion
          launched anyway, wearing its verdict:{" "}
          <em>evidence: negative — launched as public control</em>. That
          isn&rsquo;t stubbornness. The forward test extends exactly the
          regime where the cell&rsquo;s profits lived (the recent, crash-free
          fold), a mechanical line is the reference the LLM accounts have to
          beat, and the pre-registered fail branch said in advance that the
          best cell ships as a labeled control. It trades rarely by
          construction — the 85th-percentile IV gate opened about six times a
          year historically — so &ldquo;waiting for entry conditions&rdquo;
          on the live page is the strategy working, not idling.
        </p>
        <p>
          <strong>Track C — the criticality thesis.</strong>{" "}The personality
          piece: treat the index as the observable of a nonlinear dynamical
          system and classify its <em>state</em>{" "}instead of predicting its
          direction. It&rsquo;s the same mathematics — critical slowing down,
          early-warning signals, fractal scaling — I&rsquo;ve worked with on
          the neuroscience side, where the question is whether brains sit
          near criticality; here the question is whether markets lose
          resilience before they break. The honest part is which instruments
          survived validation. Rolling Hurst exponents hug 0.5 on daily index
          bars (the trending regimes the literature promises don&rsquo;t
          show up at this timescale); permutation entropy is a near-null
          (18 years of daily returns are ordinally almost indistinguishable
          from noise); the early-warning battery pointed <em>down</em>{" "}at
          both testable market peaks — COVID was an exogenous shock, which is
          precisely what the theory says it cannot anticipate. What survived:
          the LPPLS bubble-signature indicator — rare, late, and real, firing
          hardest two weeks before the February 2018 &ldquo;Volmageddon&rdquo;
          break, its only strong signal in 18 years — and the boring stress
          dials. The deployed playbook uses what survived, and its backtest
          verdict is honest too: both risk gates passed out-of-sample
          (drawdowns cut to ~0.7× buy-and-hold, better risk-adjusted return,
          robust to doubled costs), but at ~1.2 regime round-trips a year it
          couldn&rsquo;t reach the 30-round-trip statistical floor. It runs
          labeled <em>unproven</em>, and the years-long forward test is the
          only honest way to finish the sentence.
        </p>
        <p>
          <strong>Track D — the instrumented gamble.</strong>{" "}A friend
          trades short-dated options on conviction; this track is that trade
          made falsifiable, split into three buckets by testability.
          Scheduled macro events (FOMC/CPI/NFP) are backtestable — the dates
          are public history — and the registered test produced the
          program&rsquo;s only per-gates winner: buy an at-the-money SPY call
          two sessions before each jobs report, +$240/trade out-of-sample
          across 147 trades. The honest reading, from the report&rsquo;s own
          decomposition: that&rsquo;s the macro-announcement risk premium,
          not a mispricing — calls and puts mirror each other, placebo
          Fridays lose, the median trade loses $4 and the mean is carried by
          a handful of four-figure gap wins — and it&rsquo;s regime-fragile,
          negative in both recent folds including the entire 2024&ndash;26
          holdout. It runs paper-only, and no capital touches it without a
          second registration passing a recency gate. Earnings plays and
          unscheduled-headline plays can&rsquo;t be backtested honestly at
          all, so they run forward-only with the record as the product. One
          clean negative fell out for free: <em>no</em>{" "}event class
          underprices the move — buying straddles into announcements loses
          everywhere, worst at CPI.
        </p>
        <p>
          <strong>The headline — the Fable hypothesis.</strong>{" "}Everything
          above is a reference line for the actual experiment:{" "}
          <strong>can the most advanced available model trade short-term
          options well?</strong>{" "}Two paper accounts are run by Fable, the
          frontier Claude model. <strong>FA</strong>{" "}is an aggressive
          convexity punter: a $2,000 ring-fenced bankroll, short-dated long
          options off the macro calendar, hard caps of 10% per punt and two
          concurrent positions. <strong>FE</strong>{" "}is a thesis-driven
          AI-economy auditor: a $10,000 bankroll, a persistent thesis journal,
          web search as its eyes, long-only equities, 15% per name. Both are
          under a <strong>daily-trade mandate</strong> — at least one position
          action per session — which needs disclosing because it changes how
          you read the record: the mandate forces a record to exist instead
          of letting the model hide in stand-asides, every forced trade is
          flagged <em>mandate_forced</em>{" "}and separable in the stats, and if
          the forced ratio ever climbs toward 1.0, the mandate is the
          strategy and the log will say so. Safety halts always beat the
          mandate.
        </p>
        <p>
          The containment is code, not prompt. The model never constructs an
          order: it returns strict JSON through a forced tool call, and the
          engine validates every coordinate against the day&rsquo;s actual
          menu — listed strikes, listed expirations, bankroll, caps,
          holdings — then builds the order itself. Anything invalid is
          dropped and the reason published verbatim. Bankrolls, per-trade
          caps, concurrency limits, and daily/weekly loss stops are
          engine-side kill criteria, the same machinery the mechanical
          tracks use. On day one the caps got their first scalp: FA&rsquo;s
          opening decision — a defensible short-dated QQQ put spread — was
          bounced by its own per-punt cap ($180 budgeted, ~$268 for one
          contract, $200 ceiling), logged as{" "}
          <em>all_orders_invalid</em>{" "}with the model&rsquo;s full rationale
          preserved. The containment working on the first trade it saw is
          exactly the kind of evidence a prompt can&rsquo;t provide.
        </p>
        <details className="sol-detail">
          <summary>How the roster got here (the decisions, in order)</summary>
          <div className="sol-detail-body">
            <p>
              The original design was an A/B experiment: a mechanical
              baseline and one LLM strategist choosing from the same playbook
              menu, measuring whether frontier judgment adds alpha over rules
              it may deviate from. Two days later the frame flipped: the
              LLM-trader question <em>is</em>{" "}the experiment, everything
              mechanical is a reference line. Two days after that, the
              menu-picker account (&ldquo;Fable-conservative&rdquo;) was cut
              for cost and simplicity — Track A already serves as the
              same-menu mechanical control — and the roster settled at FA +
              FE. Each amendment is dated in the decision brief, and the
              prompts the accounts run on are registered immutable: any
              change is a new version, a changelog entry, and a note on the
              live page, because it&rsquo;s a new experiment arm.
            </p>
          </div>
        </details>
      </section>

      {/* ── 6 · what would change our minds ───────────────────────────── */}
      <section className="sol-section sol-story" aria-labelledby="d-minds">
        <h2 className="sol-section-head" id="d-minds">
          6 · What would change our minds
        </h2>
        <p>
          Success was defined before launch, and so was failure. The Fable
          accounts succeed if they beat their controls — SPY buy-and-hold and
          the mechanical Track A — over <strong>100+ logged trades</strong>{" "}
          with every cap respected throughout. Not &ldquo;up in week
          one&rdquo;; a lucky month proves nothing and the record is built to
          say so. Real money has its own pre-committed ladder: nothing trades
          a real dollar until a track has 100+ logged paper trades, a record
          that beats its controls, and — for the mechanical strategies — a
          passed registration of its own. Then it starts at about $2K,
          defined-risk structures only, with kill criteria committed in
          advance. The kill criteria are code: a track that trips one halts
          itself and says so publicly, and re-arming is a deliberate human
          act.
        </p>
        <p>
          Two registrations are already queued, one per open question.{" "}
          <strong>S4</strong>{" "}asks the only question the premium-selling
          verdicts left open: can a crisis-liquidity defense — an entry-day
          fill-quality gate, a stress-conditional width or size rule — pass
          the one gate every champion failed, on the corrected data, with the
          old champion as its registered control? <strong>D2</strong>{" "}is the
          prerequisite for any capital on the NFP-call result: a recency
          gate and a drift-control arm, because a 2016&ndash;2021 phenomenon
          that lost money for the last four and a half years should have to
          prove it still exists. Both get the full discipline: prompt,
          registration commit, sweep, report — in that order.
        </p>
        <p>
          The disclosure extends to infrastructure. When the Fable calls got
          a second transport — the same registered prompts, byte-identical
          down to their checksums, billed through a subscription CLI instead
          of the metered API — the change went into the changelog, a
          methodology note on the live page, and a per-decision{" "}
          <em>llm_backend</em>{" "}field in the public export, so anyone can see
          which transport served which decision. The model itself will sunset
          mid-July; the successor is a documented config flip, disclosed the
          same way, not a silent swap. If even the plumbing changes are
          logged, a quiet strategy change has nowhere to hide — which is the
          point.
        </p>
      </section>

      {/* ── 7 · colophon ──────────────────────────────────────────────── */}
      <section className="sol-section sol-story" aria-labelledby="d-colophon">
        <h2 className="sol-section-head" id="d-colophon">
          7 · Colophon
        </h2>
        <p className="sol-colophon">
          The build itself ran on the same discipline as the strategies. Each
          phase was a written prompt executed by a frontier-model coding
          session in its own git worktree; registrations were committed
          before results existed; sessions commit but never push — a human
          reviews and merges; and every phase ends in a report, which is
          where every number on this page comes from. The negative verdicts
          survived because the process made them cheaper to publish than to
          hide. That was the design.
        </p>
      </section>
    </>
  );
}

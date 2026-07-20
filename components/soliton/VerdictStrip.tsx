import type { SolitonBundle, SolitonTrack } from "@/app/lib/soliton-export";
import {
  accountScore,
  fmtDate,
  fmtPct,
  hasHistory,
  plainAccountName,
  protagonists,
  vsSpyPhrase,
} from "./derive";
import { latestSessionSummary } from "./digest";

/**
 * The verdict strip — the first thing on the page, above the lede. Its whole
 * job is to answer the five 60-second questions before a visitor reads a word
 * of prose: what is this (one plain sentence), is the record LIVE or a sample
 * (a chip you can't miss), how is each account doing vs SPY since launch (an
 * up/down number), and what happened in the latest session (one plain line).
 *
 * Server-rendered from the same bundle as everything else; honest by
 * construction — day-zero renders "no scoreboard yet," never a fake 0.0%, and
 * the sample/live state is stated outright, not buried under the chart.
 *
 * `source` distinguishes a real live export from the checked-in pre-launch
 * fixture — the single most important trust signal, so it leads.
 */
export function VerdictStrip({
  bundle,
  source,
}: {
  bundle: SolitonBundle;
  source: "live" | "sample";
}) {
  const fable = protagonists(bundle);
  const started = hasHistory(bundle);
  const latest = latestSessionSummary(bundle);
  const isSample = source !== "live";

  return (
    <section className="sol-verdict" aria-label="At a glance">
      <div className="sol-verdict-top">
        <span
          className={
            "sol-verdict-state " +
            (isSample ? "sol-verdict-state-sample" : "sol-verdict-state-live")
          }
        >
          {isSample ? "SAMPLE PREVIEW" : "LIVE"}
        </span>
        <span className="sol-verdict-asof">
          {started ? "as of" : "day zero ·"} {fmtDate(bundle.as_of)} · paper
          money
        </span>
      </div>

      <p className="sol-verdict-what">
        A frontier AI model (Claude&rsquo;s most advanced) runs two paper-trading
        accounts in public — one making fast options bets, one investing off a
        written thesis on the AI economy. This strip is the scoreboard; the plain
        record is right below.
      </p>

      {isSample && (
        <p className="sol-verdict-note">
          You&rsquo;re seeing the checked-in <strong>sample</strong> bundle, not a
          live feed — a real dry-run session, shown so the page renders before the
          engine is streaming. When it&rsquo;s live this chip turns green and the
          numbers move.
        </p>
      )}

      {fable.length > 0 && (
        <div className="sol-verdict-cards">
          {fable.map((t) => (
            <AccountCard key={t.id} track={t} bundle={bundle} started={started} />
          ))}
        </div>
      )}

      {latest ? (
        <p className="sol-verdict-latest">
          <span className="sol-verdict-latest-k">latest session</span> {latest}{" "}
          <a href="#sol-digest-head">↓ read the day-by-day record</a>
        </p>
      ) : (
        <p className="sol-verdict-latest sol-dim">
          No sessions logged yet — the record starts the day the accounts take
          their first action.
        </p>
      )}
    </section>
  );
}

function AccountCard({
  track,
  bundle,
  started,
}: {
  track: SolitonTrack;
  bundle: SolitonBundle;
  started: boolean;
}) {
  const score = accountScore(track, bundle);
  const vs = vsSpyPhrase(score.vsSpy);
  const up = (score.sinceLaunchPct ?? 0) >= 0;

  return (
    <div className="sol-verdict-card">
      <div className="sol-verdict-card-head">
        <span className="sol-verdict-card-id">{track.id}</span>
        <span className="sol-verdict-card-name">{plainAccountName(track)}</span>
      </div>
      {started && score.sinceLaunchPct != null ? (
        <>
          <div
            className={
              "sol-verdict-num " + (up ? "sol-pos" : "sol-neg")
            }
          >
            {fmtPct(score.sinceLaunchPct)}
            <span className="sol-verdict-num-sub">since launch</span>
          </div>
          {vs && (
            <div
              className={
                "sol-verdict-vs " +
                ((score.vsSpy ?? 0) >= 0 ? "sol-pos" : "sol-neg")
              }
            >
              {vs}
            </div>
          )}
        </>
      ) : (
        <div className="sol-verdict-num sol-dim">
          —<span className="sol-verdict-num-sub">day zero, no result yet</span>
        </div>
      )}
    </div>
  );
}

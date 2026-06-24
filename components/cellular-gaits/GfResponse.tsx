"use client";

/**
 * <GfResponse> — the Giant-Fiber response curve as an on-page instrument
 * (The Embodied Fly, rec #9).
 *
 * Plots the real brain-only sweep from `public/cellular-gaits/data-eb/gf_response.json`:
 * bilateral Poisson drive of LC4 = LPLC2 (Hz) → mean DNp01 (Giant Fiber) firing
 * rate, routed through the live FlyWire v783 wiring. The curve rises and
 * saturates near 200 Hz. A toggle swaps in the `silenced` variant (LC4/LPLC2
 * knocked out → flat 0) — the on-page proof that the Giant Fiber only fires
 * *through* these inputs. The `channels_at_150hz` block shows the sub-additive
 * size+velocity summation (LPLC2 160 > LC4 109, both 184.5 ≪ 269).
 *
 * recharts (matching the site's other answered-result charts), client component.
 * Every number is read from the JSON passed in — nothing is hardcoded, so a
 * re-export of the bundle flows straight through.
 *
 * Honest caveat carried inline (rec #10): this is the *brain-only* circuit
 * response, NOT "the fly escapes at N Hz of looming". The isolated GF saturates;
 * it is not a calibrated threshold (WP-D §6).
 */

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const GREEN = "#6FE39A"; // the live response
const AMBER = "#E89B3D"; // the channel readout
const SUB = "#8C8B83";
const FAINT = "#7E7A6D";
const RULE = "rgba(232,230,223,0.13)";

export type GfResponseData = {
  description?: string;
  units?: { input_hz?: string; dnp01_hz?: string };
  method?: string;
  duration_s?: number;
  response: { input_hz: number[]; dnp01_hz: number[] };
  silenced: { input_hz: number[]; dnp01_hz: number[] };
  channels_at_150hz: {
    LC4_only: number;
    LPLC2_only: number;
    both: number;
    summation?: string;
  };
};

type Pt = { input: number; live: number; silenced: number };

function zip(a: number[], b: number[]): { input: number; hz: number }[] {
  return a.map((input, i) => ({ input, hz: b[i] ?? 0 }));
}

export function GfResponse({ data }: { data: GfResponseData }) {
  const [silenced, setSilenced] = useState(false);

  // Join the response + silenced arrays on the shared input-Hz grid.
  const series = useMemo<Pt[]>(() => {
    const resp = zip(data.response.input_hz, data.response.dnp01_hz);
    const sil = zip(data.silenced.input_hz, data.silenced.dnp01_hz);
    return resp.map((r, i) => ({
      input: r.input,
      live: r.hz,
      silenced: sil[i]?.hz ?? 0,
    }));
  }, [data]);

  const peak = Math.max(...data.response.dnp01_hz);
  const ch = data.channels_at_150hz;
  const channelSum = ch.LC4_only + ch.LPLC2_only;

  return (
    <figure className="cg-chart cg-gf-fig">
      <div className="cg-gf-head">
        <span className="cg-pg-badge" style={{ color: silenced ? SUB : GREEN }}>
          {silenced ? "silenced · LC4/LPLC2 knocked out" : "live · brain-only sweep"}
        </span>
        <button
          type="button"
          className="cg-pg-btn"
          data-active={silenced ? "1" : undefined}
          aria-pressed={silenced}
          onClick={() => setSilenced((s) => !s)}
        >
          {silenced ? "restore the inputs" : "silence LC4 / LPLC2"}
        </button>
      </div>

      <div className="cg-gf-chart" role="img"
        aria-label={`Giant Fiber response curve. Driving LC4 and LPLC2 with bilateral Poisson input from 0 to 200 hertz makes the mean DNp01 firing rate rise from 0 and saturate near ${peak} hertz. ${silenced ? "With LC4 and LPLC2 silenced the response is flat at 0 at every input — the Giant Fiber only fires through these inputs." : "Toggle the silencing button to knock out LC4 and LPLC2 and watch the response collapse to 0."}`}
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={series} margin={{ top: 12, right: 18, bottom: 28, left: 6 }}>
            <CartesianGrid stroke={RULE} strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="input"
              type="number"
              domain={[0, 200]}
              ticks={[0, 50, 100, 150, 200]}
              stroke={SUB}
              tick={{ fill: SUB, fontSize: 11, fontFamily: "var(--mono)" }}
              tickLine={{ stroke: SUB }}
              label={{
                value: "LC4 / LPLC2 DRIVE · Hz",
                position: "bottom",
                offset: 12,
                fill: FAINT,
                fontSize: 11,
                letterSpacing: "0.1em",
                fontFamily: "var(--mono)",
              }}
            />
            <YAxis
              domain={[0, 220]}
              ticks={[0, 50, 100, 150, 200]}
              stroke={SUB}
              tick={{ fill: SUB, fontSize: 11, fontFamily: "var(--mono)" }}
              tickLine={{ stroke: SUB }}
              label={{
                value: "DNp01 · Hz",
                angle: -90,
                position: "insideLeft",
                offset: 16,
                fill: GREEN,
                fontSize: 11,
                letterSpacing: "0.08em",
                fontFamily: "var(--mono)",
                style: { textAnchor: "middle" },
              }}
            />
            <Tooltip
              cursor={{ stroke: RULE }}
              contentStyle={{
                background: "#101012",
                border: "1px solid rgba(232,230,223,0.18)",
                borderRadius: 6,
                fontFamily: "var(--mono)",
                fontSize: 12,
              }}
              labelStyle={{ color: SUB }}
              formatter={(v) => [`${v} Hz`, silenced ? "DNp01 (silenced)" : "DNp01"]}
              labelFormatter={(l) => `${l} Hz drive`}
            />
            {/* the live response — dimmed when silenced is showing */}
            <Line
              type="monotone"
              dataKey="live"
              stroke={GREEN}
              strokeWidth={silenced ? 1 : 2.2}
              strokeOpacity={silenced ? 0.25 : 1}
              strokeDasharray={silenced ? "4 4" : undefined}
              dot={silenced ? false : { r: 3, fill: "#0B0B0C", stroke: GREEN, strokeWidth: 1.5 }}
              isAnimationActive={false}
            />
            {/* the silenced variant — only drawn when toggled on */}
            {silenced && (
              <Line
                type="monotone"
                dataKey="silenced"
                stroke={SUB}
                strokeWidth={2.2}
                dot={{ r: 3, fill: "#0B0B0C", stroke: SUB, strokeWidth: 1.5 }}
                isAnimationActive={false}
              />
            )}
            <ReferenceLine
              y={peak}
              stroke={GREEN}
              strokeDasharray="2 4"
              strokeOpacity={0.5}
              // position "top" lifts the label clear above the dashed line so the
              // line no longer strikes through the annotation text.
              label={{ value: `saturates ≈ ${peak} Hz`, position: "top", fill: GREEN, fontSize: 10.5, fontFamily: "var(--mono)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* the sub-additive channel readout at 150 Hz */}
      <div className="cg-gf-channels" aria-label={`Channel summation at 150 hertz drive: LC4 alone ${ch.LC4_only} hertz, LPLC2 alone ${ch.LPLC2_only} hertz, both together ${ch.both} hertz — strongly sub-additive, since ${ch.LC4_only} plus ${ch.LPLC2_only} equals ${channelSum}, far above ${ch.both}.`}>
        <p className="cg-gf-channels-h">size + velocity summation · at 150 Hz drive</p>
        <div className="cg-gf-bars">
          <ChannelBar label="LC4 only" sub="velocity" value={ch.LC4_only} max={channelSum} color={AMBER} />
          <ChannelBar label="LPLC2 only" sub="size" value={ch.LPLC2_only} max={channelSum} color={AMBER} />
          <ChannelBar label="both" sub="together" value={ch.both} max={channelSum} color={GREEN} />
        </div>
        <p className="cg-gf-channels-note">
          sub-additive: <strong>{ch.LC4_only} + {ch.LPLC2_only} = {channelSum}</strong> ≫{" "}
          <strong>{ch.both}</strong>. The Giant Fiber sums size and velocity with
          diminishing returns — it does not just add them.
        </p>
      </div>

      <figcaption className="cg-chart-cap">
        Brain-only escape-circuit response — bilateral Poisson drive of LC4 = LPLC2
        through the real <strong>FlyWire v783</strong> wiring, mean DNp01 (Giant
        Fiber) rate per point ({data.duration_s ?? 1}s window, no body). The curve{" "}
        <strong>rises and saturates near {peak} Hz</strong>; silence LC4/LPLC2 and
        it goes flat at 0 — the GF fires <em>only</em> through these inputs.{" "}
        <strong>This is the brain-only circuit response, not an escape threshold</strong>{" "}
        — the isolated Giant Fiber saturates (no whole-brain inhibition), so don&apos;t
        read it as &ldquo;the fly escapes at N Hz of looming&rdquo;.
      </figcaption>
    </figure>
  );
}

function ChannelBar({
  label,
  sub,
  value,
  max,
  color,
}: {
  label: string;
  sub: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="cg-gf-bar">
      <div className="cg-gf-bar-label">
        <span style={{ color }}>{label}</span>
        <span className="cg-gf-bar-sub">{sub}</span>
      </div>
      <div className="cg-gf-bar-track">
        <div className="cg-gf-bar-fill" style={{ width: `${pct}%`, background: color }} />
        <span className="cg-gf-bar-val">{value} Hz</span>
      </div>
    </div>
  );
}

export default GfResponse;

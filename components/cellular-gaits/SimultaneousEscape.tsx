"use client";

/**
 * <SimultaneousEscape> — the fly and its brain, at the same instant (R2-WP4b).
 *
 * Eon's "simultaneous brain emulation" view, told honestly: the bird's-eye
 * escape clip (the real body in its world) runs side-by-side with the
 * <ConnectomeCloud> (the real escape circuit at FlyWire positions, lit by the
 * activity we computed), on ONE shared clock. Pick a condition; play or scrub;
 * the clip and the cloud start, run, and end together — you watch the threat in
 * the fly's world drive the circuit which drives the bolt, all at once.
 *
 * Sync: the <video> is the master clock. A rAF reads its normalised playback
 * progress (currentTime / duration) → the cloud's window index (0…74). The
 * clip is 4 s; the brain trace is ~1.2 s of sim time — different absolute
 * timebases — so we map by *progress*, not ms. They co-progress; exact
 * ms-alignment isn't claimed. Scrubbing sets both the video time and the window.
 * The shared timeline is annotated with threat onset and the escape pivot
 * (threat_onset_step / summary.pivot_t_s), so "threat appears → circuit fires →
 * fly pivots" is legible on one pass.
 *
 * Data plumbing mirrors <EmbodiedConditions>: positions + the three traces are
 * client-fetched from `/cellular-gaits/data-eb/` once; nothing is hardcoded.
 * Degrades gracefully: a failed clip falls back to the cloud alone, a failed
 * WebGL context to the clip alone; honours prefers-reduced-motion (no autoplay,
 * parked on the lit peak window). Mobile stacks the two panels.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConnectomeCloud, type Brain, type Positions } from "./ConnectomeCloud";
import type { ConditionMeta } from "./EmbodiedConditions";

const BASE = "/cellular-gaits/data-eb";
const GREEN = "#6FE39A";
const SUB = "#8C8B83";

type Trace = {
  condition: string;
  threat_onset_step: number;
  control_dt_s: number;
  summary: { pivot_t_s: number | null };
  brain: Brain;
};

function prefersReduced() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function SimultaneousEscape({
  conditions,
  backdropUrl,
}: {
  conditions: ConditionMeta[];
  backdropUrl?: string;
}) {
  const [positions, setPositions] = useState<Positions | null>(null);
  const [traces, setTraces] = useState<Record<string, Trace> | null>(null);
  const [dataError, setDataError] = useState(false);
  const [clipError, setClipError] = useState(false);

  const [condKey, setCondKey] = useState(conditions[0]?.key ?? "left_threat");
  const [windowIndex, setWindowIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const windowIndexRef = useRef(0);
  windowIndexRef.current = windowIndex;

  const cond = conditions.find((c) => c.key === condKey) ?? conditions[0];
  const trace = traces?.[condKey] ?? null;
  const brain = trace?.brain ?? null;
  const nWindows = brain?.t_s.length ?? 0;
  const ready = !!positions && !!traces;

  // ── normalisers, derived from all loaded runs (not hardcoded) ──
  const { hzRef, gfRef } = useMemo(() => {
    if (!traces) return { hzRef: 1, gfRef: 1 };
    let hz = 0;
    let gf = 0;
    for (const c of conditions) {
      const b = traces[c.key]?.brain;
      if (!b) continue;
      hz = Math.max(hz, ...b.hz_L, ...b.hz_R);
      gf = Math.max(gf, ...b.dnp01_L, ...b.dnp01_R);
    }
    return { hzRef: hz > 0 ? hz : 1, gfRef: gf > 0 ? gf : 1 };
  }, [traces, conditions]);

  // the most-active window for this condition (static default under reduced motion)
  const peakWindow = useMemo(() => {
    if (!brain) return 0;
    let best = 0;
    let bestV = -1;
    for (let i = 0; i < brain.dnp01_mean.length; i++) {
      const v = brain.dnp01_mean[i] ?? 0;
      if (v > bestV) {
        bestV = v;
        best = i;
      }
    }
    return bestV > 0 ? best : 0;
  }, [brain]);

  // timeline event marks (fraction of the trace timeline → % along the scrubber)
  const { onsetFrac, pivotFrac } = useMemo(() => {
    if (!brain || !trace || nWindows < 2) return { onsetFrac: null, pivotFrac: null };
    const tMax = brain.t_s[nWindows - 1] || 1;
    const onsetT = trace.threat_onset_step >= 0 ? trace.threat_onset_step * trace.control_dt_s : null;
    const pivotT = trace.summary.pivot_t_s;
    return {
      onsetFrac: onsetT != null ? Math.min(1, Math.max(0, onsetT / tMax)) : null,
      pivotFrac: pivotT != null ? Math.min(1, Math.max(0, pivotT / tMax)) : null,
    };
  }, [brain, trace, nWindows]);

  // ── fetch positions + all three traces once ──
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${BASE}/positions.json`).then((r) => {
        if (!r.ok) throw new Error(`positions: ${r.status}`);
        return r.json() as Promise<Positions>;
      }),
      Promise.all(
        conditions.map((c) =>
          fetch(`${BASE}/${c.trace}`).then((r) => {
            if (!r.ok) throw new Error(`${c.trace}: ${r.status}`);
            return r.json() as Promise<Trace>;
          }),
        ),
      ),
    ])
      .then(([pos, arr]) => {
        if (cancelled) return;
        const map: Record<string, Trace> = {};
        conditions.forEach((c, i) => (map[c.key] = arr[i]));
        setPositions(pos);
        setTraces(map);
      })
      .catch(() => !cancelled && setDataError(true));
    return () => {
      cancelled = true;
    };
  }, [conditions]);

  // when data lands or the condition changes: seat the clock (start, or the lit
  // peak when motion is reduced) and set playback intent
  useEffect(() => {
    if (!ready) return;
    const reduced = prefersReduced();
    setWindowIndex(reduced ? peakWindow : 0);
    setPlaying(!reduced);
    setClipError(false);
  }, [condKey, ready, peakWindow]);

  // ── master clock: while playing, the video drives the cloud window ──
  useEffect(() => {
    if (!ready || !playing || nWindows === 0) return;
    const v = videoRef.current;
    if (v) void v.play().catch(() => {});
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const vid = videoRef.current;
      if (!vid || !vid.duration) return;
      const p = vid.currentTime / vid.duration;
      const w = Math.min(nWindows - 1, Math.round(p * (nWindows - 1)));
      if (w !== windowIndexRef.current) setWindowIndex(w);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      const vid = videoRef.current;
      if (vid) vid.pause();
    };
  }, [ready, playing, nWindows, condKey]);

  // while paused (scrub / reduced motion), keep the clip frame on the window
  useEffect(() => {
    if (playing) return;
    const v = videoRef.current;
    if (v && v.duration && nWindows > 1) {
      v.currentTime = (windowIndex / (nWindows - 1)) * v.duration;
    }
  }, [windowIndex, playing, nWindows]);

  const onScrub = useCallback((v: number) => {
    setPlaying(false);
    setWindowIndex(v);
  }, []);

  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (v && v.duration && !playing && nWindows > 1) {
      v.currentTime = (windowIndexRef.current / (nWindows - 1)) * v.duration;
    }
  }, [playing, nWindows]);

  // current-window readouts
  const tNow = brain ? brain.t_s[windowIndex] ?? 0 : 0;
  const gfL = brain ? Math.round(brain.dnp01_L[windowIndex] ?? 0) : 0;
  const gfR = brain ? Math.round(brain.dnp01_R[windowIndex] ?? 0) : 0;
  const firing = gfL > 0 || gfR > 0;

  const pct = (f: number) => `${(f * 100).toFixed(1)}%`;

  return (
    <div className="cg-se">
      <div className="cg-se-head">
        <span className="cg-se-eyebrow">the fly + its brain · one shared clock · pick a condition</span>
        <div className="cg-se-conds" role="group" aria-label="Choose a condition">
          {conditions.map((c) => (
            <button
              key={c.key}
              type="button"
              className="cg-pg-btn"
              data-active={c.key === condKey ? "1" : undefined}
              aria-pressed={c.key === condKey}
              onClick={() => setCondKey(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {dataError ? (
        <p className="cg-se-status cg-se-status-err">the escape data failed to load.</p>
      ) : (
        <>
          <div className="cg-se-panels">
            {/* LEFT — the fly in its world */}
            <figure className="cg-se-panel">
              <figcaption className="cg-se-panel-cap">
                <span className="cg-se-panel-t">the fly · its world</span>
                <span className="cg-se-panel-s">bird&apos;s-eye · world-fixed camera</span>
              </figcaption>
              <div className="cg-se-flywrap">
                {clipError ? (
                  <p className="cg-se-status cg-se-status-err">clip unavailable — the brain still runs →</p>
                ) : (
                  <video
                    key={condKey}
                    ref={videoRef}
                    className="cg-se-clip"
                    src={`${BASE}/${cond?.clip ?? ""}`}
                    muted
                    loop
                    playsInline
                    preload="auto"
                    onLoadedMetadata={onLoadedMetadata}
                    onError={() => setClipError(true)}
                    aria-label={`Bird's-eye escape clip: ${cond?.label} — ${cond?.outcome}.`}
                  />
                )}
              </div>
            </figure>

            {/* RIGHT — its brain */}
            <figure className="cg-se-panel">
              <figcaption className="cg-se-panel-cap">
                <span className="cg-se-panel-t">its brain · the real circuit</span>
                <span className="cg-se-panel-s">316 neurons · FlyWire {positions?.flywire_release ?? "v783"} positions</span>
              </figcaption>
              <ConnectomeCloud
                positions={positions}
                brain={brain}
                windowIndex={windowIndex}
                hzRef={hzRef}
                gfRef={gfRef}
                backdropUrl={backdropUrl}
              />
            </figure>
          </div>

          {/* SHARED timeline — one control drives both panels */}
          <div className="cg-se-timeline">
            <button
              type="button"
              className="cg-pg-btn cg-se-play"
              aria-pressed={playing}
              disabled={!ready || nWindows === 0}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? "❚❚ pause" : "▶ play"}
            </button>
            <div className="cg-se-track">
              <input
                className="cg-se-scrub"
                type="range"
                min={0}
                max={Math.max(0, nWindows - 1)}
                value={Math.min(windowIndex, Math.max(0, nWindows - 1))}
                disabled={!ready || nWindows === 0}
                aria-label="Scrub the escape — drives the clip and the brain together"
                onChange={(e) => onScrub(Number(e.target.value))}
              />
              {/* event marks: threat onset + escape pivot */}
              {onsetFrac != null && (
                <span className="cg-se-mark cg-se-mark-onset" style={{ left: pct(onsetFrac) }} aria-hidden="true">
                  <span className="cg-se-mark-tick" />
                  <span className="cg-se-mark-lab">threat onset</span>
                </span>
              )}
              {pivotFrac != null && (
                <span className="cg-se-mark cg-se-mark-pivot" style={{ left: pct(pivotFrac) }} aria-hidden="true">
                  <span className="cg-se-mark-tick" />
                  <span className="cg-se-mark-lab">pivot</span>
                </span>
              )}
            </div>
            <span className="cg-se-readout" aria-hidden="true">
              t = {tNow.toFixed(2)}s
            </span>
          </div>

          {/* the live Giant-Fiber readout (the asymmetry, this instant) */}
          <div className="cg-se-asym" aria-hidden="true" data-firing={firing ? "1" : undefined}>
            <span className="cg-se-asym-lab">Giant Fiber now</span>
            <span className="cg-se-asym-cell">
              L <strong style={{ color: gfL > 0 ? GREEN : SUB }}>{gfL}</strong> Hz
            </span>
            <span className="cg-se-asym-cell" data-strong={gfR > gfL ? "1" : undefined}>
              R <strong style={{ color: gfR > 0 ? "#F8D26B" : SUB }}>{gfR}</strong> Hz
            </span>
          </div>

          {/* a11y: the panels are decorative; this carries the live state */}
          <p className="cg-sr-only" role="status" aria-live="polite">
            {ready
              ? `${cond?.label}. Time ${tNow.toFixed(2)} seconds. Left Giant Fiber ${gfL} hertz, right ${gfR} hertz.`
              : "loading"}
          </p>
        </>
      )}

      <p className="cg-se-cap">
        Eon&apos;s &ldquo;simultaneous&rdquo; view, told straight: the <strong>real body</strong> in its
        world on the left, the <strong>real escape circuit</strong> on the right, on one clock. The
        threat appears, the threat-side <strong>LC4/LPLC2 warm to amber</strong>, the{" "}
        <strong>Giant Fiber blooms gold</strong>, and the fly <strong>{cond?.outcome ?? "responds"}</strong>{" "}
        — same instant, the marks calling threat onset and the escape pivot. Baseline stays dark: no loom,
        the Giant Fiber is silent, the fly just walks. The cloud is lit by the{" "}
        <strong>actual LIF activity we computed</strong> (per-window <code>hz_L/R</code> and{" "}
        <code>dnp01_L/R</code>), not predicted glow; the clip is 4 s and the brain trace ~1.2 s of sim
        time, so they co-progress by playback, not by the millisecond.
      </p>
      <p className="cg-se-honest">
        316 real FlyWire {positions?.coordinate_frame ?? "FAFB-v14.1"} positions · only the computed
        circuit neurons light up · the dim grey volume behind them is a 40k-point full-brain backdrop in
        the same FlyWire frame — <strong>resting brain, positions only, not computed activity</strong>.
        Drag the brain to orbit.
      </p>
    </div>
  );
}

export default SimultaneousEscape;

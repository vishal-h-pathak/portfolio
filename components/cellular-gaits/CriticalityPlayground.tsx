"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { C, H, W, N, idx, initState, step, norm, type Controller } from "@/lib/nca";

/**
 * Live criticality playground.
 *
 * Runs the *real* evolved 660-param NCA controller in-browser (exact forward
 * pass mirroring src/cellular_gaits/nca.py) and lets you turn a `gain` knob
 * that scales the pre-activation of tanh — moving the system along the
 * order → edge-of-chaos → chaos axis.
 *
 * Three trajectories run at once:
 *   A      — the controller's state (the 4 channel heatmaps).
 *   B      — a twin started ε away from A, renormalized each tick. Its
 *            divergence rate is the poor-man's Lyapunov exponent λ.
 *   Bfree  — a second twin that diverges freely (no renorm), reset
 *            periodically. Drives the "sensitivity" heatmap: stays dark in
 *            the ordered regime, ignites in the chaotic regime.
 *
 * Teaching point baked in: the state-change rate stays pinned near max across
 * almost the whole gain range (the controller is a saturated rhythm), so it
 * CANNOT locate the edge. Only λ flips sign as you cross it.
 */

const EPS = 1e-3; // perturbation magnitude for the Lyapunov twin
const WARMUP = 12; // ticks discarded before averaging
const TICK_MS = 60; // ~16 ticks/sec
const FREE_RESET = 48; // ticks between free-twin resets
const FREE_CAP = 1.0; // color scale ceiling for the sensitivity map

// blue → ink → red, matching CACanvas
function divergingRdBu(v: number): string {
  const t = Math.max(-1, Math.min(1, v));
  if (t >= 0) {
    const r = Math.round(232 + (239 - 232) * t);
    const g = Math.round(230 + (68 - 230) * t);
    const b = Math.round(223 + (68 - 223) * t);
    return `rgb(${r},${g},${b})`;
  }
  const a = -t;
  const r = Math.round(232 + (96 - 232) * a);
  const g = Math.round(230 + (165 - 230) * a);
  const b = Math.round(223 + (250 - 223) * a);
  return `rgb(${r},${g},${b})`;
}

// bg → amber, for the sensitivity map
function ampColor(t: number): string {
  const a = Math.max(0, Math.min(1, t));
  const r = Math.round(11 + (232 - 11) * a);
  const g = Math.round(11 + (155 - 11) * a);
  const b = Math.round(12 + (61 - 12) * a);
  return `rgb(${r},${g},${b})`;
}

const CHANNEL_LABELS = ["ch0 · motor", "ch1", "ch2", "ch3"];

type Regime = { label: string; color: string };
function regimeFor(lambda: number): Regime {
  if (lambda < -0.04) return { label: "ordered · limit cycle", color: "#6FE39A" };
  if (lambda > 0.04) return { label: "chaotic", color: "#E36F6F" };
  return { label: "edge of chaos", color: "#E89B3D" };
}

const PRESETS: { label: string; gain: number }[] = [
  { label: "ordered", gain: 0.6 },
  { label: "native (1.0)", gain: 1.0 },
  { label: "edge ≈1.3", gain: 1.3 },
  { label: "chaos", gain: 2.2 },
];

export function CriticalityPlayground({
  src = "/cellular-gaits/controller_best.json",
}: {
  src?: string;
}) {
  const gridRef = useRef<HTMLCanvasElement | null>(null);
  const senseRef = useRef<HTMLCanvasElement | null>(null);
  const sparkRef = useRef<HTMLCanvasElement | null>(null);

  const ctrlRef = useRef<Controller | null>(null);
  const A = useRef<Float32Array>(initState(1));
  const B = useRef<Float32Array>(initState(1));
  const Bfree = useRef<Float32Array>(initState(1));
  const gainRef = useRef(1.0);
  const lyapSum = useRef(0);
  const lyapN = useRef(0);
  const tickRef = useRef(0);
  const freeTick = useRef(0);
  const crEMA = useRef(0);
  const sparkHist = useRef<number[]>([]);
  const motorRef = useRef<[number, number][]>([]);

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(true);
  const [gain, setGain] = useState(1.0);
  const [readout, setReadout] = useState({ lambda: 0, cr: 0, tick: 0 });
  const [bestFit, setBestFit] = useState<number | null>(null);

  const resetTwins = useCallback(() => {
    const a = A.current;
    const b = a.slice();
    b[idx(0, 4, 4)] += EPS;
    B.current = b;
    Bfree.current = b.slice();
    lyapSum.current = 0;
    lyapN.current = 0;
    tickRef.current = 0;
    freeTick.current = 0;
    sparkHist.current = [];
  }, []);

  const reseed = useCallback(() => {
    A.current = initState((Math.random() * 1e9) | 0);
    resetTwins();
  }, [resetTwins]);

  // Load weights once.
  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
        return r.json();
      })
      .then((d: Controller) => {
        if (cancelled) return;
        ctrlRef.current = d;
        motorRef.current = d.motor_cells ?? [];
        setBestFit(d.meta?.best_fit_mm ?? null);
        A.current = initState(7);
        resetTwins();
        setLoaded(true);
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [src, resetTwins]);

  // keep gainRef in sync; reset metrics when gain changes (λ depends on gain)
  useEffect(() => {
    gainRef.current = gain;
    resetTwins();
  }, [gain, resetTwins]);

  const advance = useCallback(() => {
    const ctrl = ctrlRef.current;
    if (!ctrl) return;
    const g = gainRef.current;
    const a0 = A.current;
    const a1 = step(a0, ctrl, g);
    const b1 = step(B.current, ctrl, g);

    // state-change rate (RMS per cell)
    let cr = 0;
    for (let i = 0; i < N; i++) {
      const d = a1[i] - a0[i];
      cr += d * d;
    }
    cr = Math.sqrt(cr / N);
    crEMA.current = crEMA.current === 0 ? cr : crEMA.current * 0.85 + cr * 0.15;

    // Lyapunov via renormalized twin
    const d = norm(b1, a1) || 1e-12;
    const inst = Math.log(d / EPS);
    if (tickRef.current > WARMUP) {
      lyapSum.current += inst;
      lyapN.current += 1;
      sparkHist.current.push(inst);
      if (sparkHist.current.length > 140) sparkHist.current.shift();
    }
    const scale = EPS / d;
    const b1r = new Float32Array(N);
    for (let i = 0; i < N; i++) b1r[i] = a1[i] + (b1[i] - a1[i]) * scale;

    // free twin for the sensitivity heatmap
    let bf = step(Bfree.current, ctrl, g);
    freeTick.current += 1;
    if (freeTick.current >= FREE_RESET || norm(bf, a1) > Math.sqrt(N) * 0.5) {
      bf = a1.slice();
      bf[idx(0, 4, 4)] += EPS;
      freeTick.current = 0;
    }

    A.current = a1;
    B.current = b1r;
    Bfree.current = bf;
    tickRef.current += 1;
  }, []);

  const draw = useCallback(() => {
    const ctrl = ctrlRef.current;
    const grid = gridRef.current;
    const sense = senseRef.current;
    const spark = sparkRef.current;
    if (!ctrl || !grid || !sense || !spark) return;
    const dpr = window.devicePixelRatio || 1;

    // --- 4 channel heatmaps (2×2) ---
    const gSize = 300;
    if (grid.width !== gSize * dpr) {
      grid.width = gSize * dpr;
      grid.height = gSize * dpr;
      grid.style.width = `${gSize}px`;
      grid.style.height = `${gSize}px`;
    }
    const gx = grid.getContext("2d")!;
    gx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gx.clearRect(0, 0, gSize, gSize);
    gx.fillStyle = "#0B0B0C";
    gx.fillRect(0, 0, gSize, gSize);
    const gap = 5;
    const sub = (gSize - gap) / 2;
    const cw = sub / W;
    const ch = sub / H;
    const a = A.current;
    for (let ci = 0; ci < C; ci++) {
      const ox = (ci % 2) * (sub + gap);
      const oy = Math.floor(ci / 2) * (sub + gap);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          gx.fillStyle = divergingRdBu(a[idx(ci, y, x)]);
          gx.fillRect(ox + x * cw, oy + y * ch, cw + 0.5, ch + 0.5);
        }
      }
      if (ci === 0) {
        gx.strokeStyle = "rgba(232, 155, 61, 0.5)";
        gx.lineWidth = 1;
        for (const [r, c] of motorRef.current) {
          if (r >= H || c >= W) continue;
          gx.strokeRect(ox + c * cw + 0.5, oy + r * ch + 0.5, cw - 1, ch - 1);
        }
      }
      gx.strokeStyle = "rgba(232, 230, 223, 0.16)";
      gx.lineWidth = 1;
      gx.strokeRect(ox + 0.5, oy + 0.5, sub - 1, sub - 1);
      gx.fillStyle = "rgba(232, 230, 223, 0.82)";
      gx.font = "9.5px ui-monospace, Menlo, monospace";
      gx.textBaseline = "top";
      gx.fillText(CHANNEL_LABELS[ci], ox + 4, oy + 4);
    }

    // --- sensitivity heatmap (free-twin |A − Bfree|, summed over channels) ---
    const sSize = 142;
    if (sense.width !== sSize * dpr) {
      sense.width = sSize * dpr;
      sense.height = sSize * dpr;
      sense.style.width = `${sSize}px`;
      sense.style.height = `${sSize}px`;
    }
    const sx = sense.getContext("2d")!;
    sx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sx.fillStyle = "#0B0B0C";
    sx.fillRect(0, 0, sSize, sSize);
    const bf = Bfree.current;
    const scw = sSize / W;
    const sch = sSize / H;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let mag = 0;
        for (let ci = 0; ci < C; ci++) {
          const dd = a[idx(ci, y, x)] - bf[idx(ci, y, x)];
          mag += dd * dd;
        }
        mag = Math.sqrt(mag);
        sx.fillStyle = ampColor(mag / FREE_CAP);
        sx.fillRect(x * scw, y * sch, scw + 0.5, sch + 0.5);
      }
    }
    sx.strokeStyle = "rgba(232, 230, 223, 0.16)";
    sx.strokeRect(0.5, 0.5, sSize - 1, sSize - 1);

    // --- spark: instantaneous log(d/ε) with running-mean λ line ---
    const spW = 300;
    const spH = 66;
    if (spark.width !== spW * dpr) {
      spark.width = spW * dpr;
      spark.height = spH * dpr;
      spark.style.width = `${spW}px`;
      spark.style.height = `${spH}px`;
    }
    const px = spark.getContext("2d")!;
    px.setTransform(dpr, 0, 0, dpr, 0, 0);
    px.clearRect(0, 0, spW, spH);
    const hist = sparkHist.current;
    const ymax = 1.2;
    const toY = (v: number) => spH / 2 - (Math.max(-ymax, Math.min(ymax, v)) / ymax) * (spH / 2 - 4);
    px.strokeStyle = "rgba(232, 230, 223, 0.22)";
    px.lineWidth = 1;
    px.beginPath();
    px.moveTo(0, spH / 2);
    px.lineTo(spW, spH / 2);
    px.stroke();
    if (hist.length > 1) {
      px.strokeStyle = "rgba(232, 230, 223, 0.55)";
      px.lineWidth = 1;
      px.beginPath();
      for (let i = 0; i < hist.length; i++) {
        const xx = (i / (hist.length - 1)) * spW;
        const yy = toY(hist[i]);
        i === 0 ? px.moveTo(xx, yy) : px.lineTo(xx, yy);
      }
      px.stroke();
    }
    const lam = lyapN.current > 0 ? lyapSum.current / lyapN.current : 0;
    const reg = regimeFor(lam);
    px.strokeStyle = reg.color;
    px.lineWidth = 1.5;
    px.beginPath();
    px.moveTo(0, toY(lam));
    px.lineTo(spW, toY(lam));
    px.stroke();
  }, []);

  // animation loop
  useEffect(() => {
    if (!loaded) return;
    let raf = 0;
    let last = 0;
    let frame = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (running && now - last >= TICK_MS) {
        last = now;
        advance();
        draw();
        frame++;
        if (frame % 3 === 0) {
          const lam = lyapN.current > 0 ? lyapSum.current / lyapN.current : 0;
          setReadout({ lambda: lam, cr: crEMA.current, tick: tickRef.current });
        }
      }
      if (!running) draw();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [loaded, running, advance, draw]);

  const stepOnce = useCallback(() => {
    advance();
    draw();
    const lam = lyapN.current > 0 ? lyapSum.current / lyapN.current : 0;
    setReadout({ lambda: lam, cr: crEMA.current, tick: tickRef.current });
  }, [advance, draw]);

  if (error) {
    return (
      <div className="cg-player-err">
        could not load controller: <span>{error}</span>
      </div>
    );
  }

  const reg = regimeFor(readout.lambda);

  return (
    <div className="cg-pg">
      <div className="cg-pg-stage">
        <canvas
          ref={gridRef}
          className="cg-pg-grid"
          role="img"
          aria-label="Four-channel cellular automaton state; channel 0 motor cells outlined in amber"
        />
        <div className="cg-pg-cap">
          4 channels · 8×8 · real evolved rule
          {bestFit != null ? ` · ${bestFit.toFixed(1)} mm/3s` : ""}
        </div>
      </div>

      <div className="cg-pg-side">
        <div className="cg-pg-badge" style={{ borderColor: reg.color, color: reg.color }}>
          {reg.label}
        </div>

        <div className="cg-pg-metrics">
          <div className="cg-pg-metric">
            <span className="cg-pg-metric-k">λ · lyapunov</span>
            <span className="cg-pg-metric-v" style={{ color: reg.color }}>
              {readout.lambda >= 0 ? "+" : ""}
              {readout.lambda.toFixed(3)}
            </span>
            <span className="cg-pg-metric-u">nats / tick</span>
            <span className="cg-pg-metric-hint" style={{ color: reg.color }}>
              flips sign at the edge → locates it
            </span>
          </div>
          <div className="cg-pg-metric">
            <span className="cg-pg-metric-k">state-change</span>
            <span className="cg-pg-metric-v">{readout.cr.toFixed(2)}</span>
            <span className="cg-pg-metric-u">rms / cell</span>
            <span className="cg-pg-metric-hint">stays pinned → can&apos;t find the edge</span>
          </div>
        </div>

        <div className="cg-pg-sense">
          <canvas ref={senseRef} className="cg-pg-sense-canvas" role="img" aria-label="Sensitivity map: how a tiny perturbation spreads" />
          <span className="cg-pg-cap">sensitivity · ε spread</span>
        </div>

        <canvas ref={sparkRef} className="cg-pg-spark" role="img" aria-label="Instantaneous divergence with running-mean lambda line" />
        <div className="cg-pg-cap">log(d/ε) per tick · colored line = mean λ</div>
      </div>

      <div className="cg-pg-controls">
        <div className="cg-pg-slider-row">
          <label htmlFor="cg-gain">gain</label>
          <input
            id="cg-gain"
            type="range"
            min={0}
            max={3}
            step={0.01}
            value={gain}
            onChange={(e) => setGain(parseFloat(e.target.value))}
          />
          <span className="cg-pg-gain-val">{gain.toFixed(2)}</span>
        </div>
        <div className="cg-pg-presets">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              className="cg-pg-btn"
              data-active={Math.abs(gain - p.gain) < 0.001 ? "1" : undefined}
              onClick={() => setGain(p.gain)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="cg-pg-btnrow">
          <button className="cg-pg-btn" onClick={() => setRunning((r) => !r)}>
            {running ? "pause" : "play"}
          </button>
          <button className="cg-pg-btn" onClick={stepOnce} disabled={running}>
            step
          </button>
          <button className="cg-pg-btn" onClick={reseed}>
            reseed
          </button>
          <button className="cg-pg-btn" onClick={resetTwins}>
            reset λ
          </button>
        </div>
        <p className="cg-pg-do">
          Drag the gain past ~1.3 and watch λ cross zero while the change-rate
          barely moves. (λ needs a few seconds to settle after each change.)
        </p>
      </div>
    </div>
  );
}

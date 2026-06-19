"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Toy CMA-ES — an *illustrative* in-browser run of the real algorithm on a 2-D
 * toy fitness landscape. This is NOT the fly run: the real optimizer scores
 * 660-parameter candidates against a contact-rich MuJoCo rollout that can't run
 * in the browser (see <EvolutionCurve/> for those precomputed numbers). Here the
 * "fitness" is a closed-form tilted quadratic valley so you can watch the
 * mechanism: the sampling distribution (mean + covariance ellipse) rotates to
 * align with the valley, then contracts onto the optimum.
 *
 * The algorithm itself is a faithful 2-D port of CMA-ES (Hansen's purecmaes):
 * weighted recombination, rank-one + rank-μ covariance update, and cumulative
 * step-size adaptation. Only the dimensionality and the objective are toys.
 */

// ── toy landscape ──────────────────────────────────────────────────────────
// Tilted, ill-conditioned quadratic — the canonical CMA-ES demo. A long narrow
// valley rotated off-axis: covariance has to *rotate* to align with it, then σ
// shrinks monotonically onto the single optimum. (Rosenbrock looks flashier but
// grows σ to round its curved valley, which muddies the "σ shrinks" story.)
const XMIN = -2,
  XMAX = 2,
  YMIN = -2,
  YMAX = 2;
const OPT_X = 0.5,
  OPT_Y = 0.4,
  THETA = 0.61, // valley tilt (~35°)
  COND = 18; // condition number — how narrow the valley is
const CT = Math.cos(THETA),
  ST = Math.sin(THETA);
function landscape(x: number, y: number): number {
  const dx = x - OPT_X;
  const dy = y - OPT_Y;
  const u = CT * dx + ST * dy; // along the valley (cheap)
  const v = -ST * dx + CT * dy; // across it (steep)
  return 0.5 * (u * u + COND * v * v);
}

// ── deterministic RNG so "reset" replays the same run ───────────────────────
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = 0x5eed1234;

// ── 2×2 symmetric eigendecomposition ───────────────────────────────────────
type Vec = [number, number];
type Eig = { v: [Vec, Vec]; d: [number, number] }; // d = eigenvalues (variances)
function eig2(a: number, b: number, c: number): Eig {
  if (Math.abs(b) < 1e-14) {
    return a >= c ? { v: [[1, 0], [0, 1]], d: [a, c] } : { v: [[0, 1], [1, 0]], d: [c, a] };
  }
  const tr = a + c;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - (a * c - b * b)));
  const l1 = tr / 2 + disc;
  const l2 = tr / 2 - disc;
  let vx = b,
    vy = l1 - a;
  const n = Math.hypot(vx, vy) || 1;
  vx /= n;
  vy /= n;
  return { v: [[vx, vy], [-vy, vx]], d: [l1, l2] };
}

// ── CMA-ES state ────────────────────────────────────────────────────────────
type CmaState = {
  rng: () => number;
  gauss: () => number;
  N: number;
  lambda: number;
  mu: number;
  weights: number[];
  mueff: number;
  cc: number;
  cs: number;
  c1: number;
  cmu: number;
  damps: number;
  chiN: number;
  mean: Vec;
  sigma: number;
  C: [number, number, number]; // [a, b, c] of [[a,b],[b,c]]
  eig: Eig; // current eig of C (sqrt-eigvals used for sampling/draw)
  pc: Vec;
  ps: Vec;
  counteval: number;
  gen: number;
  best: { f: number; x: Vec } | null;
  samples: { x: Vec; f: number; sel: boolean }[];
};

const LAMBDA = 12;

function gaussianFrom(rng: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let u = 0,
      v = 0,
      s = 0;
    do {
      u = rng() * 2 - 1;
      v = rng() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const m = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * m;
    return u * m;
  };
}

function initCma(): CmaState {
  const rng = mulberry32(SEED);
  const gauss = gaussianFrom(rng);
  const N = 2;
  const lambda = LAMBDA;
  const muReal = lambda / 2;
  const rawW = [];
  for (let i = 1; i <= Math.floor(muReal); i++) rawW.push(Math.log(muReal + 0.5) - Math.log(i));
  const mu = rawW.length;
  const sumW = rawW.reduce((p, x) => p + x, 0);
  const weights = rawW.map((w) => w / sumW);
  const mueff = 1 / weights.reduce((p, w) => p + w * w, 0);
  const cc = (4 + mueff / N) / (N + 4 + (2 * mueff) / N);
  const cs = (mueff + 2) / (N + mueff + 5);
  const c1 = 2 / ((N + 1.3) ** 2 + mueff);
  const cmu = Math.min(1 - c1, (2 * (mueff - 2 + 1 / mueff)) / ((N + 2) ** 2 + mueff));
  const damps = 1 + 2 * Math.max(0, Math.sqrt((mueff - 1) / (N + 1)) - 1) + cs;
  const chiN = Math.sqrt(N) * (1 - 1 / (4 * N) + 1 / (21 * N * N));
  return {
    rng,
    gauss,
    N,
    lambda,
    mu,
    weights,
    mueff,
    cc,
    cs,
    c1,
    cmu,
    damps,
    chiN,
    mean: [-1.3, 1.5],
    sigma: 0.5,
    C: [1, 0, 1],
    eig: eig2(1, 0, 1),
    pc: [0, 0],
    ps: [0, 0],
    counteval: 0,
    gen: 0,
    best: null,
    samples: [],
  };
}

function stepGen(s: CmaState): void {
  const { v, d } = s.eig;
  const sd0 = Math.sqrt(Math.max(d[0], 1e-20));
  const sd1 = Math.sqrt(Math.max(d[1], 1e-20));
  // sample λ candidates: x = mean + σ · B·(√D ∘ z)
  const draws: { x: Vec; z: Vec; f: number }[] = [];
  for (let k = 0; k < s.lambda; k++) {
    const z: Vec = [s.gauss(), s.gauss()];
    const yx = v[0][0] * (sd0 * z[0]) + v[1][0] * (sd1 * z[1]);
    const yy = v[0][1] * (sd0 * z[0]) + v[1][1] * (sd1 * z[1]);
    const x: Vec = [s.mean[0] + s.sigma * yx, s.mean[1] + s.sigma * yy];
    draws.push({ x, z, f: landscape(x[0], x[1]) });
  }
  draws.sort((p, q) => p.f - q.f);
  s.counteval += s.lambda;
  s.gen += 1;

  const xold = s.mean;
  const newMean: Vec = [0, 0];
  const zmean: Vec = [0, 0];
  for (let i = 0; i < s.mu; i++) {
    const w = s.weights[i];
    newMean[0] += w * draws[i].x[0];
    newMean[1] += w * draws[i].x[1];
    zmean[0] += w * draws[i].z[0];
    zmean[1] += w * draws[i].z[1];
  }
  s.mean = newMean;

  // ps = (1-cs)ps + √(cs(2-cs)μeff) · B·zmean   (= invsqrtC·(mean-xold)/σ)
  const bzx = v[0][0] * zmean[0] + v[1][0] * zmean[1];
  const bzy = v[0][1] * zmean[0] + v[1][1] * zmean[1];
  const csFac = Math.sqrt(s.cs * (2 - s.cs) * s.mueff);
  s.ps = [(1 - s.cs) * s.ps[0] + csFac * bzx, (1 - s.cs) * s.ps[1] + csFac * bzy];
  const psNorm = Math.hypot(s.ps[0], s.ps[1]);

  const hsig =
    psNorm / Math.sqrt(1 - (1 - s.cs) ** (2 * (s.counteval / s.lambda))) / s.chiN <
    1.4 + 2 / (s.N + 1)
      ? 1
      : 0;

  // pc = (1-cc)pc + hsig·√(cc(2-cc)μeff)·(mean-xold)/σ
  const ccFac = hsig * Math.sqrt(s.cc * (2 - s.cc) * s.mueff);
  const dmx = (s.mean[0] - xold[0]) / s.sigma;
  const dmy = (s.mean[1] - xold[1]) / s.sigma;
  s.pc = [(1 - s.cc) * s.pc[0] + ccFac * dmx, (1 - s.cc) * s.pc[1] + ccFac * dmy];

  // covariance: (1-c1-cmu)C + c1(pc pcᵀ + (1-hsig)cc(2-cc)C) + cmu·Σ w_i y_i y_iᵀ
  let Ca = s.C[0],
    Cb = s.C[1],
    Cc = s.C[2];
  const c1a = s.c1;
  const cmuFac = s.cmu;
  const decay = (1 - c1a - cmuFac) + c1a * (1 - hsig) * s.cc * (2 - s.cc);
  let na = decay * Ca,
    nb = decay * Cb,
    nc = decay * Cc;
  // rank-one
  na += c1a * s.pc[0] * s.pc[0];
  nb += c1a * s.pc[0] * s.pc[1];
  nc += c1a * s.pc[1] * s.pc[1];
  // rank-μ from selected y_i = (x_i - xold)/σ
  for (let i = 0; i < s.mu; i++) {
    const w = s.weights[i];
    const yx = (draws[i].x[0] - xold[0]) / s.sigma;
    const yy = (draws[i].x[1] - xold[1]) / s.sigma;
    na += cmuFac * w * yx * yx;
    nb += cmuFac * w * yx * yy;
    nc += cmuFac * w * yy * yy;
  }
  Ca = na;
  Cb = nb;
  Cc = nc;
  s.C = [Ca, Cb, Cc];

  // step-size
  s.sigma *= Math.exp((s.cs / s.damps) * (psNorm / s.chiN - 1));

  // re-decompose
  s.eig = eig2(Ca, Cb, Cc);

  // bookkeeping for the view
  s.samples = draws.map((dd, i) => ({ x: dd.x, f: dd.f, sel: i < s.mu }));
  const champ = draws[0];
  if (!s.best || champ.f < s.best.f) s.best = { f: champ.f, x: champ.x };
}

// ── component ───────────────────────────────────────────────────────────────
const SIZE = 280;
const CONVERGED = 4e-3;

export function ToyCmaEs() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const heatRef = useRef<HTMLCanvasElement | null>(null); // offscreen cached landscape
  const stateRef = useRef<CmaState | null>(null);
  const [running, setRunning] = useState(false);
  const [, force] = useState(0);

  // px mapping (landscape → CSS pixels)
  const px = (x: number) => ((x - XMIN) / (XMAX - XMIN)) * SIZE;
  const py = (y: number) => (1 - (y - YMIN) / (YMAX - YMIN)) * SIZE;

  // build the cached landscape heatmap once (client only)
  const buildHeat = useCallback(() => {
    const off = document.createElement("canvas");
    off.width = SIZE;
    off.height = SIZE;
    const ctx = off.getContext("2d")!;
    const img = ctx.createImageData(SIZE, SIZE);
    let fmax = 0;
    const grid = new Float32Array(SIZE * SIZE);
    for (let j = 0; j < SIZE; j++) {
      const yv = YMIN + (1 - j / (SIZE - 1)) * (YMAX - YMIN);
      for (let i = 0; i < SIZE; i++) {
        const xv = XMIN + (i / (SIZE - 1)) * (XMAX - XMIN);
        const f = Math.log(1 + landscape(xv, yv));
        grid[j * SIZE + i] = f;
        if (f > fmax) fmax = f;
      }
    }
    for (let p = 0; p < grid.length; p++) {
      // bright (green) in the valley, fading to background up the walls
      const t = Math.pow(1 - grid[p] / fmax, 1.6);
      const k = t * 0.82;
      img.data[p * 4] = Math.round(11 + (111 - 11) * k);
      img.data[p * 4 + 1] = Math.round(11 + (227 - 11) * k);
      img.data[p * 4 + 2] = Math.round(12 + (154 - 12) * k);
      img.data[p * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    heatRef.current = off;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const heat = heatRef.current;
    const s = stateRef.current;
    if (!canvas || !heat || !s) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== SIZE * dpr) {
      canvas.width = SIZE * dpr;
      canvas.height = SIZE * dpr;
    }
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(heat, 0, 0, SIZE, SIZE);

    // global optimum marker
    ctx.strokeStyle = "rgba(232,230,223,0.5)";
    ctx.lineWidth = 1;
    const ox = px(OPT_X),
      oy = py(OPT_Y);
    ctx.beginPath();
    ctx.moveTo(ox - 4, oy);
    ctx.lineTo(ox + 4, oy);
    ctx.moveTo(ox, oy - 4);
    ctx.lineTo(ox, oy + 4);
    ctx.stroke();

    // samples
    for (const sm of s.samples) {
      ctx.beginPath();
      ctx.arc(px(sm.x[0]), py(sm.x[1]), sm.sel ? 2.6 : 1.8, 0, Math.PI * 2);
      ctx.fillStyle = sm.sel ? "rgba(111,227,154,0.95)" : "rgba(232,230,223,0.4)";
      ctx.fill();
    }

    // covariance ellipses (1σ solid, 2σ faint) — axes = σ·√eigval along eigvecs
    const { v, d } = s.eig;
    const sd0 = Math.sqrt(Math.max(d[0], 0)) * s.sigma;
    const sd1 = Math.sqrt(Math.max(d[1], 0)) * s.sigma;
    const drawEllipse = (k: number, stroke: string, width: number) => {
      ctx.beginPath();
      for (let a = 0; a <= 64; a++) {
        const th = (a / 64) * Math.PI * 2;
        const ux = Math.cos(th) * sd0 * k;
        const uy = Math.sin(th) * sd1 * k;
        const lx = s.mean[0] + v[0][0] * ux + v[1][0] * uy;
        const ly = s.mean[1] + v[0][1] * ux + v[1][1] * uy;
        const X = px(lx),
          Y = py(ly);
        a === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
      }
      ctx.closePath();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
    };
    drawEllipse(2, "rgba(232,155,61,0.35)", 1);
    drawEllipse(1, "rgba(232,155,61,0.95)", 1.5);

    // mean marker (amber +)
    const mx = px(s.mean[0]),
      my = py(s.mean[1]);
    ctx.strokeStyle = "#E89B3D";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mx - 5, my);
    ctx.lineTo(mx + 5, my);
    ctx.moveTo(mx, my - 5);
    ctx.lineTo(mx, my + 5);
    ctx.stroke();
  }, []);

  // init once
  useEffect(() => {
    buildHeat();
    stateRef.current = initCma();
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advance = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    stepGen(s);
    draw();
    if (s.sigma < CONVERGED) setRunning(false);
    force((n) => n + 1);
  }, [draw]);

  // play loop
  useEffect(() => {
    if (!running) return;
    const id = setInterval(advance, 650);
    return () => clearInterval(id);
  }, [running, advance]);

  const reset = useCallback(() => {
    setRunning(false);
    stateRef.current = initCma();
    draw();
    force((n) => n + 1);
  }, [draw]);

  const s = stateRef.current;
  const converged = !!s && s.sigma < CONVERGED;

  return (
    <div className="cg-opt-toy">
      <div className="cg-opt-stage">
        <canvas
          ref={canvasRef}
          className="cg-opt-canvas"
          role="img"
          aria-label="Toy CMA-ES: sampling cloud and covariance ellipse aligning with a tilted 2-D quadratic valley and contracting onto the optimum."
        />
        <span className="cg-pg-cap">
          tilted quadratic valley · σ√D ellipse = search distribution · ✛ = optimum
        </span>
      </div>

      <div className="cg-opt-side">
        <div className="cg-pg-badge" style={badgeStyle(converged)}>
          {converged ? "converged" : running ? "running" : "paused"}
        </div>

        <div className="cg-opt-readouts">
          <div className="cg-pg-metric">
            <span className="cg-pg-metric-k">generation</span>
            <span className="cg-pg-metric-v">{s?.gen ?? 0}</span>
            <span className="cg-pg-metric-u">{LAMBDA} samples / gen</span>
          </div>
          <div className="cg-pg-metric">
            <span className="cg-pg-metric-k">step-size</span>
            <span className="cg-pg-metric-v">{(s?.sigma ?? 0).toFixed(3)}</span>
            <span className="cg-pg-metric-u">σ — shrinks as it homes in</span>
          </div>
          <div className="cg-pg-metric">
            <span className="cg-pg-metric-k">best f</span>
            <span className="cg-pg-metric-v" style={{ color: "var(--green)" }}>
              {s?.best ? s.best.f.toFixed(2) : "—"}
            </span>
            <span className="cg-pg-metric-u">minimizing · 0 is perfect</span>
          </div>
        </div>

        <div className="cg-pg-btnrow">
          <button className="cg-pg-btn" onClick={() => setRunning((r) => !r)} disabled={converged}>
            {running ? "pause" : "play"}
          </button>
          <button className="cg-pg-btn" onClick={advance} disabled={running || converged}>
            step
          </button>
          <button className="cg-pg-btn" onClick={reset}>
            reset
          </button>
        </div>

        <p className="cg-pg-do">
          Watch the green covariance ellipse rotate to align with the tilted
          valley, then contract as the mean (✛ amber) settles on the optimum.
          That covariance-shaping is what lets CMA-ES find a search direction
          with no gradient — only candidate scores. Same algorithm runs the fly;
          there it shapes a 660-dimensional ellipsoid instead of this 2-D one.
        </p>
      </div>
    </div>
  );
}

function badgeStyle(converged: boolean): React.CSSProperties {
  const c = converged ? "var(--green)" : "var(--amber)";
  return { borderColor: c, color: c };
}

#!/usr/bin/env node
/**
 * Faithfulness check for the in-browser NCA forward pass.
 *
 * Loads the exported controller (public/cellular-gaits/controller_best.json)
 * and runs the exact same forward pass the CriticalityPlayground component runs
 * in the browser, then asserts it reproduces reference values computed from the
 * source-of-truth PyTorch model (src/cellular_gaits/nca.py).
 *
 * Two assertions:
 *   1. Deterministic init s_c(y,x) = 0.1*sin(0.7x + 0.3y + c), gain 1.0, the
 *      channel-0 value at (y=3, x=4) over 6 ticks follows the saturated
 *      period-2 sequence [-0.857568, 1, -1, 1, -1, 1] to <= 1e-4.
 *   2. The poor-man's Lyapunov exponent λ is negative at gain 1.0 (ordered)
 *      and positive at gain 1.5 (chaotic) — the sign flips across the edge —
 *      while the state-change rate stays pinned in ~1.8–1.97 across the sweep.
 *
 * Run: node scripts/verify-controller.mjs
 * Exits non-zero on any mismatch so this can gate CI / catch silent drift.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "public", "cellular-gaits", "controller_best.json");

const C = 4;
const H = 8;
const W = 8;
const HID = 16;
const N = C * H * W; // 256
const EPS = 1e-3;
const WARMUP = 12;

const idx = (c, y, x) => c * 64 + y * 8 + x;

const ctrl = JSON.parse(readFileSync(SRC, "utf8"));

// Forward pass — byte-for-byte the same arithmetic as components/cellular-gaits/
// CriticalityPlayground.tsx `step`: conv1 (4->16, 3x3, zero-pad 1) cross-
// correlation, tanh(gain * pre-activation), conv2 (16->4, 1x1), clamp to [-1,1].
function step(s, gain) {
  const { conv1_w, conv1_b, conv2_w, conv2_b } = ctrl;
  const out = new Float64Array(N);
  const hvec = new Float64Array(HID);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      for (let o = 0; o < HID; o++) {
        let acc = conv1_b[o];
        const wo = conv1_w[o];
        for (let i = 0; i < C; i++) {
          const wi = wo[i];
          for (let ky = 0; ky < 3; ky++) {
            const yy = y + ky - 1;
            if (yy < 0 || yy >= H) continue;
            const wik = wi[ky];
            for (let kx = 0; kx < 3; kx++) {
              const xx = x + kx - 1;
              if (xx < 0 || xx >= W) continue;
              acc += wik[kx] * s[i * 64 + yy * 8 + xx];
            }
          }
        }
        hvec[o] = Math.tanh(gain * acc);
      }
      for (let o = 0; o < C; o++) {
        let acc = conv2_b[o];
        const w2 = conv2_w[o];
        for (let i = 0; i < HID; i++) acc += w2[i] * hvec[i];
        out[o * 64 + y * 8 + x] = acc < -1 ? -1 : acc > 1 ? 1 : acc;
      }
    }
  }
  return out;
}

function norm(a, b) {
  let s = 0;
  for (let i = 0; i < N; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

// mulberry32 — deterministic RNG so the sweep is reproducible run to run.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const failures = [];
function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures.push(name);
}

// ---- Assertion 1: deterministic period-2 sequence ----
{
  let s = new Float64Array(N);
  for (let c = 0; c < C; c++)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        s[idx(c, y, x)] = 0.1 * Math.sin(0.7 * x + 0.3 * y + c);

  const expected = [-0.857568, 1.0, -1.0, 1.0, -1.0, 1.0];
  const got = [];
  for (let t = 0; t < 6; t++) {
    s = step(s, 1.0);
    got.push(s[idx(0, 3, 4)]);
  }
  let maxErr = 0;
  for (let t = 0; t < 6; t++) maxErr = Math.max(maxErr, Math.abs(got[t] - expected[t]));
  check(
    "ch0(3,4) period-2 sequence matches reference to <=1e-4",
    maxErr <= 1e-4,
    `maxErr=${maxErr.toExponential(2)} got=[${got.map((v) => v.toFixed(6)).join(", ")}]`
  );
}

// ---- Assertion 2: λ sign flip + pinned change-rate across the sweep ----
function metrics(gain, ticks = 120) {
  const rng = mulberry32(12345);
  let st = new Float64Array(N);
  for (let i = 0; i < N; i++) st[i] = (rng() * 2 - 1) * 0.1;
  let tw = st.slice();
  tw[idx(0, 4, 4)] += EPS;

  let lyapSum = 0;
  let lyapN = 0;
  let crSum = 0;
  let crN = 0;
  for (let t = 0; t < ticks; t++) {
    const n0 = step(st, gain);
    const nt = step(tw, gain);
    let cr = 0;
    for (let i = 0; i < N; i++) {
      const d = n0[i] - st[i];
      cr += d * d;
    }
    cr = Math.sqrt(cr / N);
    const d = norm(nt, n0) || 1e-12;
    if (t > WARMUP) {
      lyapSum += Math.log(d / EPS);
      lyapN += 1;
      crSum += cr;
      crN += 1;
    }
    const scale = EPS / d;
    const twr = new Float64Array(N);
    for (let i = 0; i < N; i++) twr[i] = n0[i] + (nt[i] - n0[i]) * scale;
    st = n0;
    tw = twr;
  }
  return { lambda: lyapSum / lyapN, cr: crSum / crN };
}

{
  const sweep = [0.05, 0.5, 1.0, 1.3, 1.5, 2.0, 4.0].map((g) => ({ g, ...metrics(g) }));
  console.log("\n  gain   change-rate   λ (nats/tick)");
  for (const r of sweep)
    console.log(
      `  ${r.g.toFixed(2).padStart(4)}   ${r.cr.toFixed(4).padStart(10)}   ${(r.lambda >= 0 ? "+" : "") + r.lambda.toFixed(4)}`
    );
  console.log("");

  const g10 = sweep.find((r) => r.g === 1.0);
  const g15 = sweep.find((r) => r.g === 1.5);
  check("λ < 0 at native gain 1.0 (ordered)", g10.lambda < 0, `λ=${g10.lambda.toFixed(4)}`);
  check("λ > 0 at gain 1.5 (chaotic)", g15.lambda > 0, `λ=${g15.lambda.toFixed(4)}`);
  check("λ sign flips across the edge (1.0 → 1.5)", g10.lambda < 0 && g15.lambda > 0);

  const active = sweep.filter((r) => r.g >= 0.5); // gain 0.05 is a frozen fixed point
  const crMin = Math.min(...active.map((r) => r.cr));
  const crMax = Math.max(...active.map((r) => r.cr));
  check(
    "state-change rate stays pinned in ~1.8–1.97 across gain 0.5–4 (can't find the edge)",
    crMin >= 1.8 && crMax <= 1.97,
    `range=[${crMin.toFixed(3)}, ${crMax.toFixed(3)}]`
  );
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) FAILED.`);
  process.exit(1);
}
console.log("\nAll faithfulness checks passed.");

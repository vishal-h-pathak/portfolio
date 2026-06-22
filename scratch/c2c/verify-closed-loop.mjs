#!/usr/bin/env node
/**
 * Scratch faithfulness check for the in-browser CLOSED-LOOP forward pass
 * (mirrors lib/nca.ts stepClosedLoop / makeClosedLoopController).
 *
 * No Python reference value exists for the closed loop, so this pins the wiring
 * we control: shapes, finiteness/clamp, determinism, and that the sensor
 * channels actually influence the output (the whole point of closing the loop).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const CL = JSON.parse(
  readFileSync(join(ROOT, "public/cellular-gaits/data-c2/closed_loop_controller.json"), "utf8"),
);
const V1 = JSON.parse(
  readFileSync(join(ROOT, "public/cellular-gaits/controller_best.json"), "utf8"),
);

const C = 4, H = 8, W = 8, HID = 16, CL_IN = 6, N = C * 64;
const conv1_w = CL.weights["conv1.weight"];
const conv1_b = CL.weights["conv1.bias"];
const conv2_w = CL.weights["conv2.weight"].map((o) => o.map((i) => i[0][0]));
const conv2_b = CL.weights["conv2.bias"];
const cells = V1.motor_cells;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function initState(seed) {
  const rng = mulberry32(seed);
  const s = new Float64Array(N);
  for (let i = 0; i < N; i++) s[i] = (rng() * 2 - 1) * 0.1;
  return s;
}
function step(s, sens0, sens1, gain) {
  const out = new Float64Array(N);
  const hvec = new Float64Array(HID);
  const planes = [];
  for (let i = 0; i < CL_IN; i++)
    planes.push(i < C ? s.subarray(i * 64, i * 64 + 64) : i === C ? sens0 : sens1);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      for (let o = 0; o < HID; o++) {
        let acc = conv1_b[o];
        const wo = conv1_w[o];
        for (let i = 0; i < CL_IN; i++) {
          const wi = wo[i], plane = planes[i];
          for (let ky = 0; ky < 3; ky++) {
            const yy = y + ky - 1; if (yy < 0 || yy >= H) continue;
            const wik = wi[ky];
            for (let kx = 0; kx < 3; kx++) {
              const xx = x + kx - 1; if (xx < 0 || xx >= W) continue;
              acc += wik[kx] * plane[yy * 8 + xx];
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
  return out;
}
const dims = (a) => { const d = []; let c = a; while (Array.isArray(c)) { d.push(c.length); c = c[0]; } return d.join("x"); };

const fails = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
  if (!ok) fails.push(name);
};

check("conv1.weight is 16x6x3x3", dims(conv1_w) === "16x6x3x3", dims(conv1_w));
check("conv2.weight is 4x16x1x1", dims(CL.weights["conv2.weight"]) === "4x16x1x1", dims(CL.weights["conv2.weight"]));
check("sensors: 42 joint angles @ ch4, 6 contacts @ ch5",
  CL.sensors.channels[0].count === 42 && CL.sensors.channels[0].input_channel_index === 4 &&
  CL.sensors.channels[1].count === 6 && CL.sensors.channels[1].input_channel_index === 5);
check("motor_cells has 42 entries", cells.length === 42);

// Run a rollout with live-ish proprioception; assert finite + clamped.
// Returns {first, last}: motor readout after the 1st and the 30th tick.
function rollout(seed, withSensors) {
  let s = initState(seed);
  const rng = mulberry32(seed + 1);
  const sens0 = new Float64Array(64), sens1 = new Float64Array(64);
  let first = null, last = null;
  for (let t = 0; t < 30; t++) {
    sens0.fill(0); sens1.fill(0);
    if (withSensors) {
      for (let i = 0; i < 42; i++) {
        const [r, c] = cells[i];
        let v = (rng() * 2 - 1) * 2.0 / 3.14; // angles ~[-2,2] rad, normalized
        v = v < -1 ? -1 : v > 1 ? 1 : v;
        sens0[r * 8 + c] = v;
      }
      for (let leg = 0; leg < 6; leg++) sens1[7 * 8 + leg] = rng() < 0.5 ? 1 : 0;
    }
    s = step(s, sens0, sens1, CL.meta.gain ?? 1.0);
    const m = cells.map(([r, c]) => s[r * 8 + c]);
    if (t === 0) first = m;
    last = m;
  }
  return { first, last };
}

const live = rollout(7, true);
check("all motor outputs finite", live.last.every(Number.isFinite));
check("all motor outputs in [-1,1]", live.last.every((v) => v >= -1 && v <= 1));

// Determinism: same seed + same sensor stream → identical motors.
const a = rollout(123, true), b = rollout(123, true);
check("deterministic (same seed → identical motors)", a.last.every((v, i) => v === b.last[i]));

// Sensors must be wired into conv1: feeding live proprioception vs zeroed must
// change the very next motor output. (The state then reconverges to the
// strongly-contracting attractor under random noise — λ<0, see verify-controller
// — so the *behavioral* win needs structured real proprioception over a full
// physics rollout; that's what C2-A's metrics + the recorded clips show.)
const zero = rollout(7, false);
let maxDiff = 0;
for (let i = 0; i < 42; i++) maxDiff = Math.max(maxDiff, Math.abs(live.first[i] - zero.first[i]));
check("sensor channels feed conv1 (live vs zeroed differ at tick 1)", maxDiff > 1e-3, `maxΔ=${maxDiff.toExponential(2)}`);

if (fails.length) { console.error(`\n${fails.length} check(s) FAILED.`); process.exit(1); }
console.log("\nAll closed-loop wiring checks passed.");

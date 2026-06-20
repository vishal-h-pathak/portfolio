/**
 * Shared in-browser NCA controller — the *real* evolved 660-param rule.
 *
 * This is the single source of truth for the forward pass that both the
 * `CriticalityPlayground` (the controller tab) and `FlyStage` (the live fly)
 * run. The arithmetic is byte-for-byte the PyTorch model in
 * `src/cellular_gaits/nca.py`, and is independently pinned by
 * `scripts/verify-controller.mjs` against reference values.
 *
 * Rule (per tick):
 *   h   = tanh(gain * (conv1(s) + b1))     // 4→16, 3×3, zero-pad 1
 *   out = clamp(conv2(h) + b2, -1, 1)      // 16→4, 1×1
 *
 * The 8×8×4 state's channel 0 is the motor field; 42 designated cells (the
 * `motor_cells` map, a 7×6 sub-grid) are read out as the 42 leg actuator
 * targets in [-1, 1], in actuator-index == control order.
 */

export const C = 4;
export const H = 8;
export const W = 8;
export const HID = 16;
export const N = C * H * W; // 256

/** Flat index into the 8×8×4 state, channel-major. */
export const idx = (c: number, y: number, x: number) => c * 64 + y * 8 + x;

export type Controller = {
  meta: { best_fit_mm: number };
  conv1_w: number[][][][]; // [16][4][3][3]
  conv1_b: number[]; // [16]
  conv2_w: number[][]; // [4][16]
  conv2_b: number[]; // [4]
  /** [row, col] in channel 0 for each of the 42 actuators, in control order. */
  motor_cells: [number, number][];
};

/** Deterministic RNG so seeded rollouts are reproducible run to run. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random initial state ~ uniform(-0.1, 0.1). */
export function initState(seed: number): Float32Array {
  const rng = mulberry32(seed);
  const s = new Float32Array(N);
  for (let i = 0; i < N; i++) s[i] = (rng() * 2 - 1) * 0.1;
  return s;
}

/** One NCA tick. `gain` scales the pre-activation of tanh (1.0 = native). */
export function step(s: Float32Array, ctrl: Controller, gain: number): Float32Array {
  const { conv1_w, conv1_b, conv2_w, conv2_b } = ctrl;
  const out = new Float32Array(N);
  const hvec = new Float32Array(HID);
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

/** Euclidean distance between two states. */
export function norm(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < N; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

/**
 * Read the 42 motor targets (channel-0 cells, in [-1, 1]) out of a state, in
 * actuator-index == control order. Matches `manifest.json` actuator order.
 */
export function motorTargets(
  state: Float32Array,
  motorCells: [number, number][],
  out: Float32Array = new Float32Array(42),
): Float32Array {
  for (let i = 0; i < motorCells.length; i++) {
    const [row, col] = motorCells[i];
    out[i] = state[idx(0, row, col)];
  }
  return out;
}

/** Fetch + parse the exported controller weights. */
export async function loadController(
  src = "/cellular-gaits/controller_best.json",
): Promise<Controller> {
  const r = await fetch(src);
  if (!r.ok) throw new Error(`controller fetch failed: ${r.status}`);
  return (await r.json()) as Controller;
}

// ─────────────────────────────────────────────────────────────────────────────
// Closed-loop controller (C2-A) — the 6→16 architecture that *feels* the body.
//
// Same recurrent 4-channel state and motor readout as v1, but conv1 takes two
// extra input channels carrying live proprioception, written fresh each control
// step from the MuJoCo sim. With those channels zeroed the rule is a plain
// open-loop NCA; evolution moved the sensor weights off zero so it can correct
// for what the body is doing. Architecture (from closed_loop_controller.json):
//   h   = tanh(gain * (conv1(s ⊕ sensors) + b1))   // (4+2)→16, 3×3, zero-pad 1
//   out = clamp(conv2(h) + b2, -1, 1)               // 16→4, 1×1
// State stays 4 channels; the 2 sensor channels enter *only* at conv1's input.
// ─────────────────────────────────────────────────────────────────────────────

/** conv1 input channels: 4 recurrent state + 2 live sensor channels. */
export const CL_IN = 6;

/** One proprioceptive sensor channel and how it lands on the 8×8 grid. */
export type SensorChannelSpec = {
  input_channel_index: number;
  name: string;
  count: number;
  normalization: string;
  placement: string;
  source: string;
};

export type ClosedLoopController = {
  meta: { best_fitness: number; grid: [number, number]; gain: number };
  conv1_w: number[][][][]; // [16][6][3][3]
  conv1_b: number[]; // [16]
  conv2_w: number[][]; // [4][16]  (1×1 spatial dropped)
  conv2_b: number[]; // [4]
  /** Motor readout cells, in actuator order — shared with v1 (same body). */
  motor_cells: [number, number][];
  /** The two sensor-channel specs, in input-channel order (ch4, ch5). */
  sensors: SensorChannelSpec[];
};

/**
 * Raw shape of closed_loop_controller.json as exported by C2-A. Note the weight
 * keys are flat dotted strings (`"conv1.weight"`), not a nested object.
 */
type ClosedLoopJson = {
  meta: { best_fitness: number; grid: [number, number]; gain: number };
  weights: {
    "conv1.weight": number[][][][]; // [16][6][3][3]
    "conv1.bias": number[];
    "conv2.weight": number[][][][]; // [4][16][1][1]
    "conv2.bias": number[];
  };
  sensors: { channels: SensorChannelSpec[] };
};

/**
 * Fetch the closed-loop weights and normalize them to `ClosedLoopController`.
 * The closed-loop export omits `motor_cells` (the readout is identical to v1 —
 * same body, same manifest), so we pull that from the v1 controller.
 */
export async function loadClosedLoop(
  src = "/cellular-gaits/data-c2/closed_loop_controller.json",
  motorCellsSrc = "/cellular-gaits/controller_best.json",
): Promise<ClosedLoopController> {
  const [clR, v1] = await Promise.all([
    fetch(src).then((r) => {
      if (!r.ok) throw new Error(`closed-loop fetch failed: ${r.status}`);
      return r.json() as Promise<ClosedLoopJson>;
    }),
    loadController(motorCellsSrc),
  ]);
  // conv2.weight is [4][16][1][1]; collapse the trailing 1×1 to [4][16].
  const conv2_w = clR.weights["conv2.weight"].map((o) => o.map((i) => i[0][0]));
  return {
    meta: clR.meta,
    conv1_w: clR.weights["conv1.weight"],
    conv1_b: clR.weights["conv1.bias"],
    conv2_w,
    conv2_b: clR.weights["conv2.bias"],
    motor_cells: v1.motor_cells,
    sensors: clR.sensors.channels,
  };
}

/**
 * One closed-loop NCA tick. `s` is the 8×8×4 recurrent state; `sens0`/`sens1`
 * are the two 8×8 sensor planes (input channels 4 and 5), written fresh each
 * step from the body. conv1 cross-correlates over all 6 input channels; the
 * output is the new 4-channel state.
 */
export function stepClosedLoop(
  s: Float32Array,
  sens0: Float32Array,
  sens1: Float32Array,
  ctrl: ClosedLoopController,
  gain: number,
): Float32Array {
  const { conv1_w, conv1_b, conv2_w, conv2_b } = ctrl;
  const out = new Float32Array(N);
  const hvec = new Float32Array(HID);
  // Input-channel accessor: 0..3 = recurrent state, 4 = sens0, 5 = sens1.
  const chan = (i: number): Float32Array =>
    i < C ? s.subarray(i * 64, i * 64 + 64) : i === C ? sens0 : sens1;
  const planes: Float32Array[] = [];
  for (let i = 0; i < CL_IN; i++) planes.push(chan(i));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      for (let o = 0; o < HID; o++) {
        let acc = conv1_b[o];
        const wo = conv1_w[o];
        for (let i = 0; i < CL_IN; i++) {
          const wi = wo[i];
          const plane = planes[i];
          for (let ky = 0; ky < 3; ky++) {
            const yy = y + ky - 1;
            if (yy < 0 || yy >= H) continue;
            const wik = wi[ky];
            for (let kx = 0; kx < 3; kx++) {
              const xx = x + kx - 1;
              if (xx < 0 || xx >= W) continue;
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
  }
  return out;
}

/**
 * A stateful closed-loop driver for FlyStage. Each `motors(angles, contacts)`
 * call lays the live proprioception onto the two sensor planes *exactly* as the
 * exported `sensors` spec dictates, advances one tick, and returns the 42 motor
 * targets. The spec (C2-A):
 *   ch4 — 42 joint angles (actuator_length), normalized θ/3.14 clipped to
 *         [−1,1], placed on the 7×6 motor block, one angle per motor cell
 *         (actuator order == motor_cells order);
 *   ch5 — 6 per-leg foot contacts {0,1}, placed on the bottom row (row 7,
 *         cols 0–5), leg order [lf, lm, lh, rf, rm, rh].
 */
export function makeClosedLoopController(
  ctrl: ClosedLoopController,
  opts?: { seed?: number; gain?: number },
) {
  const gain = opts?.gain ?? ctrl.meta.gain ?? 1.0;
  let state = initState(opts?.seed ?? 7);
  const sens0 = new Float32Array(64); // ch4 — joint angles on the motor block
  const sens1 = new Float32Array(64); // ch5 — foot contacts on the bottom row
  const out = new Float32Array(42);
  const cells = ctrl.motor_cells;
  return {
    /** Advance one tick from live proprioception; returns 42 motor targets. */
    motors(angles: ArrayLike<number>, contacts: ArrayLike<number>): Float32Array {
      sens0.fill(0);
      for (let i = 0; i < cells.length; i++) {
        const [row, col] = cells[i];
        let v = angles[i] / 3.14;
        v = v < -1 ? -1 : v > 1 ? 1 : v;
        sens0[row * 8 + col] = v;
      }
      sens1.fill(0);
      for (let leg = 0; leg < 6; leg++) sens1[7 * 8 + leg] = contacts[leg] ? 1 : 0;

      state = stepClosedLoop(state, sens0, sens1, ctrl, gain);
      return motorTargets(state, cells, out);
    },
    get state() {
      return state;
    },
    reset(seed?: number) {
      state = initState(seed ?? opts?.seed ?? 7);
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chemotaxis controller (CH-A) — the 8→16 architecture that *forages*.
//
// Same recurrent 4-channel state and motor readout as the closed loop, but conv1
// now takes FOUR extra input channels: the two proprioception planes (joint
// angles + foot contacts, exactly the closed-loop layout) plus a bilateral odor
// reading — the concentration at the LEFT and RIGHT antenna, laid out
// topographically over the motor block. Warm-started from the closed-loop
// controller with the chemo channels zero-initialised, so with all four extra
// channels zeroed the rule reproduces the closed-loop walking dynamics exactly;
// evolution moved the odor weights off zero so a left−right asymmetry steers the
// fly. Architecture (from chemotaxis_controller.json):
//   h   = tanh(gain * (conv1(s ⊕ proprio ⊕ chemo) + b1))  // (4+2+2)→16, 3×3, pad 1
//   out = clamp(conv2(h) + b2, -1, 1)                       // 16→4, 1×1
// State stays 4 channels; the 4 sensor channels enter *only* at conv1's input.
//
// The exact channel layout, antenna geometry, and odor-field formula are read
// from the export's `sensors` spec (see `loadChemo`); the placements below encode
// that spec verbatim:
//   ch4 — 42 joint angles  (θ/3.14, clipped)  → 7×6 motor block (rows 0–6, cols 0–5)
//   ch5 — 6 foot contacts  {0,1}              → bottom row (row 7, cols 0–5)
//   ch6 — odor_left  cL ∈ (0,1]               → LEFT half of motor block (rows 0–6, cols 0–2)
//   ch7 — odor_right cR ∈ (0,1]               → RIGHT half of motor block (rows 0–6, cols 3–5)
// ─────────────────────────────────────────────────────────────────────────────

/** conv1 input channels: 4 recurrent state + 2 proprio + 2 chemo. */
export const CHEMO_IN = 8;

/** Geometry + field constants the live loop needs, read from the export. */
export type ChemoSensing = {
  /** Forward antenna offset from the thorax (world units). */
  antenna_forward: number;
  /** Lateral antenna half-baseline (world units) — deliberately > biological. */
  antenna_lateral: number;
  /** Odor decay length λ in C(p) = exp(−‖p − src‖ / λ). */
  odor_lambda: number;
};

export type ChemoController = {
  meta: { best_fitness: number; grid: [number, number]; gain: number };
  conv1_w: number[][][][]; // [16][8][3][3]
  conv1_b: number[]; // [16]
  conv2_w: number[][]; // [4][16]  (1×1 spatial dropped)
  conv2_b: number[]; // [4]
  /** Motor readout cells, in actuator order — shared with v1 (same body). */
  motor_cells: [number, number][];
  /** The four sensor-channel specs, in input-channel order (ch4..ch7). */
  sensors: SensorChannelSpec[];
  /** Antenna geometry + odor-field λ, lifted from the `sensors` spec. */
  sensing: ChemoSensing;
};

/** Raw shape of chemotaxis_controller.json (flat dotted weight keys, like C2-A). */
type ChemoJson = {
  meta: { best_fitness: number; grid: [number, number]; gain: number };
  weights: {
    "conv1.weight": number[][][][]; // [16][8][3][3]
    "conv1.bias": number[];
    "conv2.weight": number[][][][]; // [4][16][1][1]
    "conv2.bias": number[];
  };
  sensors: {
    channels: SensorChannelSpec[];
    odor_field: { formula: string; lambda: number; note?: string };
    antenna_geometry: { forward_offset: number; lateral_offset: number };
  };
};

/**
 * Fetch the chemotaxis weights and normalize them to `ChemoController`. Like the
 * closed-loop export it omits `motor_cells` (identical readout — same body), so
 * we pull that from the v1 controller, and it carries the antenna geometry + λ in
 * its `sensors` spec so the live loop is fully data-driven.
 */
export async function loadChemo(
  src = "/cellular-gaits/data-ch/chemotaxis_controller.json",
  motorCellsSrc = "/cellular-gaits/controller_best.json",
): Promise<ChemoController> {
  const [chR, v1] = await Promise.all([
    fetch(src).then((r) => {
      if (!r.ok) throw new Error(`chemotaxis fetch failed: ${r.status}`);
      return r.json() as Promise<ChemoJson>;
    }),
    loadController(motorCellsSrc),
  ]);
  // conv2.weight is [4][16][1][1]; collapse the trailing 1×1 to [4][16].
  const conv2_w = chR.weights["conv2.weight"].map((o) => o.map((i) => i[0][0]));
  return {
    meta: chR.meta,
    conv1_w: chR.weights["conv1.weight"],
    conv1_b: chR.weights["conv1.bias"],
    conv2_w,
    conv2_b: chR.weights["conv2.bias"],
    motor_cells: v1.motor_cells,
    sensors: chR.sensors.channels,
    sensing: {
      antenna_forward: chR.sensors.antenna_geometry.forward_offset,
      antenna_lateral: chR.sensors.antenna_geometry.lateral_offset,
      odor_lambda: chR.sensors.odor_field.lambda,
    },
  };
}

/**
 * Odor concentration at world point (px, py) for a source at (sx, sy):
 * C(p) = exp(−‖p − src‖ / λ), C = 1 at the source, decaying with length λ.
 */
export function odorConcentration(
  px: number,
  py: number,
  sx: number,
  sy: number,
  lambda: number,
): number {
  return Math.exp(-Math.hypot(px - sx, py - sy) / lambda);
}

/**
 * Place the two antennae in world space from the body pose, per the export's
 * antenna_geometry: forward = (cos yaw, sin yaw), left = (−sin yaw, cos yaw);
 * left = thorax + forward·fwd + lateral·left, right = thorax + forward·fwd −
 * lateral·left.
 */
export function antennaPositions(
  tx: number,
  ty: number,
  yaw: number,
  forward: number,
  lateral: number,
): { left: [number, number]; right: [number, number] } {
  const fx = Math.cos(yaw);
  const fy = Math.sin(yaw);
  const lx = -Math.sin(yaw);
  const ly = Math.cos(yaw);
  const bx = tx + forward * fx;
  const by = ty + forward * fy;
  return {
    left: [bx + lateral * lx, by + lateral * ly],
    right: [bx - lateral * lx, by - lateral * ly],
  };
}

/**
 * One chemotaxis NCA tick. `s` is the 8×8×4 recurrent state; the four planes are
 * the live sensor channels (joint angles ch4, foot contacts ch5, odor_left ch6,
 * odor_right ch7), each an 8×8 grid written fresh each step. conv1
 * cross-correlates over all 8 input channels; the output is the new 4-ch state.
 */
export function stepChemo(
  s: Float32Array,
  joints: Float32Array,
  contacts: Float32Array,
  odorL: Float32Array,
  odorR: Float32Array,
  ctrl: ChemoController,
  gain: number,
): Float32Array {
  const { conv1_w, conv1_b, conv2_w, conv2_b } = ctrl;
  const out = new Float32Array(N);
  const hvec = new Float32Array(HID);
  // Input planes 0..3 = recurrent state, 4 = joints, 5 = contacts, 6/7 = odor L/R.
  const planes: Float32Array[] = [
    s.subarray(0, 64),
    s.subarray(64, 128),
    s.subarray(128, 192),
    s.subarray(192, 256),
    joints,
    contacts,
    odorL,
    odorR,
  ];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      for (let o = 0; o < HID; o++) {
        let acc = conv1_b[o];
        const wo = conv1_w[o];
        for (let i = 0; i < CHEMO_IN; i++) {
          const wi = wo[i];
          const plane = planes[i];
          for (let ky = 0; ky < 3; ky++) {
            const yy = y + ky - 1;
            if (yy < 0 || yy >= H) continue;
            const wik = wi[ky];
            for (let kx = 0; kx < 3; kx++) {
              const xx = x + kx - 1;
              if (xx < 0 || xx >= W) continue;
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
  }
  return out;
}

/**
 * A stateful chemotaxis driver for FlyStage. Each `motors(angles, contacts, cL,
 * cR)` call lays live proprioception + the bilateral odor reading onto the four
 * sensor planes *exactly* as the exported `sensors` spec dictates, advances one
 * tick, and returns the 42 motor targets. `cL`/`cR` are the (already-normalised)
 * concentrations at the left/right antenna, in (0,1].
 */
export function makeChemoController(
  ctrl: ChemoController,
  opts?: { seed?: number; gain?: number },
) {
  const gain = opts?.gain ?? ctrl.meta.gain ?? 1.0;
  let state = initState(opts?.seed ?? 7);
  const joints = new Float32Array(64); // ch4 — joint angles on the motor block
  const contacts = new Float32Array(64); // ch5 — foot contacts on the bottom row
  const odorL = new Float32Array(64); // ch6 — cL over the left half of the block
  const odorR = new Float32Array(64); // ch7 — cR over the right half of the block
  const out = new Float32Array(42);
  const cells = ctrl.motor_cells;
  return {
    /** Advance one tick from live proprioception + odor; returns 42 targets. */
    motors(
      angles: ArrayLike<number>,
      contactBools: ArrayLike<number>,
      cL: number,
      cR: number,
    ): Float32Array {
      joints.fill(0);
      for (let i = 0; i < cells.length; i++) {
        const [row, col] = cells[i];
        let v = angles[i] / 3.14;
        v = v < -1 ? -1 : v > 1 ? 1 : v;
        joints[row * 8 + col] = v;
      }
      contacts.fill(0);
      for (let leg = 0; leg < 6; leg++) contacts[7 * 8 + leg] = contactBools[leg] ? 1 : 0;
      // Topographic odor: cL over rows 0–6 cols 0–2, cR over rows 0–6 cols 3–5.
      odorL.fill(0);
      odorR.fill(0);
      for (let row = 0; row <= 6; row++) {
        for (let col = 0; col <= 2; col++) odorL[row * 8 + col] = cL;
        for (let col = 3; col <= 5; col++) odorR[row * 8 + col] = cR;
      }

      state = stepChemo(state, joints, contacts, odorL, odorR, ctrl, gain);
      return motorTargets(state, cells, out);
    },
    get state() {
      return state;
    },
    reset(seed?: number) {
      state = initState(seed ?? opts?.seed ?? 7);
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Escape controller (X-A) — the 8→16 architecture that *flees a looming threat*.
//
// Structurally a TWIN of the chemotaxis controller: identical 4-channel recurrent
// state, identical motor readout, identical ch4 (joint angles) + ch5 (foot
// contacts) proprioception. The only differences are the last two input channels
// and one amplification:
//   ch6 — loom_left  : a single [0,1] magnitude for the LEFT eye, laid over the
//                      left half of the motor block (rows 0–6, cols 0–2);
//   ch7 — loom_right : the RIGHT-eye magnitude, over the right half (rows 0–6,
//                      cols 3–5)  — same topographic placement the odor channels use.
// The loom magnitude is read out in [0,1] (interpretable, logged as such) but is
// multiplied by `loom_input_gain` (=8.0) BEFORE it enters conv1: the warm-start
// gait is bang-bang (every motor cell pinned at the ±1 clamp), so an unamplified
// cue can't move a motor cell — a flat fitness plateau CMA-ES can't climb. This is
// the escape analog of chemotaxis's deliberately strong antenna baseline. A/B
// integrity is exact: amplifying a zero loom (or through zero loom weights) is
// still zero, so with both loom planes zeroed the rule reproduces the C2-A
// closed-loop walking dynamics byte-for-byte.
//
// The looming front-end (Threat geometry → bilateral loom) is HAND-BUILT — a
// stand-in for the real LC4/LPLC2 → DNp01 (Giant Fiber) escape circuit. The
// analytic geometry below is ported verbatim from the export's
// `sensors.loom_geometry` + `eye_projection`; nothing here is invented.
// ─────────────────────────────────────────────────────────────────────────────

/** conv1 input channels: 4 recurrent state + 2 proprio + 2 loom (== CHEMO_IN). */
export const ESCAPE_IN = 8;

/** The analytic looming front-end constants, read from the export's geometry. */
export type LoomGeometry = {
  /** Threat disk radius R (world units) for the angular-size term. */
  threat_radius: number;
  /** size_gain in m = clip(size_gain·θ/π + exp_gain·min(1, rate/exp_ref), 0, 1). */
  loom_size_gain: number;
  /** exp_gain (the expansion-rate weight). */
  loom_exp_gain: number;
  /** exp_ref — the rate that saturates the expansion term. */
  loom_exp_ref: number;
};

export type LoomSensing = {
  /** The angular-size / expansion-rate / eye-split geometry. */
  geometry: LoomGeometry;
  /** ×gain applied to each loom plane before conv1 (bang-bang warm-start). */
  loom_input_gain: number;
};

export type EscapeController = {
  meta: { best_fitness: number; grid: [number, number]; gain: number };
  conv1_w: number[][][][]; // [16][8][3][3]
  conv1_b: number[]; // [16]
  conv2_w: number[][]; // [4][16]  (1×1 spatial dropped)
  conv2_b: number[]; // [4]
  /** Motor readout cells, in actuator order — shared with v1 (same body). */
  motor_cells: [number, number][];
  /** The four sensor-channel specs, in input-channel order (ch4..ch7). */
  sensors: SensorChannelSpec[];
  /** Loom geometry + input gain, lifted from the `sensors` spec. */
  sensing: LoomSensing;
};

/** Raw shape of escape_controller.json (flat dotted weight keys, like CH-A). */
type EscapeJson = {
  meta: { grid: [number, number]; gain: number; best_fitness: number };
  weights: {
    "conv1.weight": number[][][][]; // [16][8][3][3]
    "conv1.bias": number[];
    "conv2.weight": number[][][][]; // [4][16][1][1]
    "conv2.bias": number[];
  };
  sensors: {
    channels: SensorChannelSpec[];
    loom_geometry: {
      loom_size_gain: number;
      loom_exp_gain: number;
      loom_exp_ref: number;
      threat_radius: number;
    };
  };
};

/**
 * Pull `loom_input_gain` out of the export. It isn't a standalone numeric field
 * in the controller JSON, but the loom channel specs document it verbatim
 * ("…multiplied by loom_input_gain=8.0 before conv1"), so we parse it from there
 * to keep the controller self-contained. Falls back to 1.0 (identity, A/B-safe)
 * if absent; the live demo also passes the authoritative value from
 * `escape_metrics.json` `config.loom_input_gain` via `makeEscapeController` opts.
 */
function parseLoomInputGain(channels: SensorChannelSpec[]): number {
  for (const ch of channels) {
    const m = /loom_input_gain\s*=\s*([0-9.]+)/.exec(ch.normalization ?? "");
    if (m) return parseFloat(m[1]);
  }
  return 1.0;
}

/**
 * Fetch the escape weights and normalize them to `EscapeController`. Like the
 * chemo/closed-loop exports it omits `motor_cells` (identical readout — same
 * body), so we pull that from the v1 controller, and it carries the loom geometry
 * in its `sensors` spec so the live loop is fully data-driven.
 */
export async function loadEscape(
  src = "/cellular-gaits/data-x/escape_controller.json",
  motorCellsSrc = "/cellular-gaits/controller_best.json",
): Promise<EscapeController> {
  const [esR, v1] = await Promise.all([
    fetch(src).then((r) => {
      if (!r.ok) throw new Error(`escape fetch failed: ${r.status}`);
      return r.json() as Promise<EscapeJson>;
    }),
    loadController(motorCellsSrc),
  ]);
  // conv2.weight is [4][16][1][1]; collapse the trailing 1×1 to [4][16].
  const conv2_w = esR.weights["conv2.weight"].map((o) => o.map((i) => i[0][0]));
  const lg = esR.sensors.loom_geometry;
  return {
    meta: esR.meta,
    conv1_w: esR.weights["conv1.weight"],
    conv1_b: esR.weights["conv1.bias"],
    conv2_w,
    conv2_b: esR.weights["conv2.bias"],
    motor_cells: v1.motor_cells,
    sensors: esR.sensors.channels,
    sensing: {
      geometry: {
        threat_radius: lg.threat_radius,
        loom_size_gain: lg.loom_size_gain,
        loom_exp_gain: lg.loom_exp_gain,
        loom_exp_ref: lg.loom_exp_ref,
      },
      loom_input_gain: parseLoomInputGain(esR.sensors.channels),
    },
  };
}

/** The bilateral looming readout for one control step (all in [0,1], φ in rad). */
export type LoomReading = {
  /** Left-eye loom magnitude (already split, NOT yet ×loom_input_gain). */
  loomL: number;
  /** Right-eye loom magnitude. */
  loomR: number;
  /** Pre-split loom magnitude m = clip(size + expansion, 0, 1). */
  magnitude: number;
  /** Angular size θ = 2·atan2(R, d). */
  theta: number;
  /** Expansion rate max(0, dθ/dt) (approach only). */
  rate: number;
  /** Threat bearing φ in the fly's body frame (CCW positive = left), radians. */
  bearing: number;
};

/**
 * The analytic looming front-end — a verbatim port of the export's
 * `sensors.loom_geometry` + `eye_projection` (`env.read_loom`). Given the fly
 * thorax xy + world yaw and the threat xy, returns the bilateral loom reading:
 *   θ    = 2·atan2(R, d)                         (LPLC2-like angular size)
 *   rate = max(0, dθ/dt)                          (LC4-like expansion, approach only)
 *   m    = clip(size_gain·θ/π + exp_gain·min(1, rate/exp_ref), 0, 1)
 *   loomL = m·0.5·(1 + sin φ),  loomR = m·0.5·(1 − sin φ)
 * where φ is the threat bearing in the body frame (CCW = left). The previous θ
 * and Δt are passed in (the driver keeps that state, not a global), so dθ/dt is
 * well-defined; pass `prevTheta = null` on the first step (rate = 0).
 */
export function loomSignal(
  flyX: number,
  flyY: number,
  yaw: number,
  threatX: number,
  threatY: number,
  geom: LoomGeometry,
  prevTheta: number | null,
  dt: number,
): LoomReading {
  const dx = threatX - flyX;
  const dy = threatY - flyY;
  const d = Math.hypot(dx, dy);
  const theta = 2 * Math.atan2(geom.threat_radius, d);
  let rate = 0;
  if (prevTheta != null && dt > 0) rate = Math.max(0, (theta - prevTheta) / dt);
  const size = geom.loom_size_gain * (theta / Math.PI);
  const expansion = geom.loom_exp_gain * Math.min(1, rate / geom.loom_exp_ref);
  let m = size + expansion;
  m = m < 0 ? 0 : m > 1 ? 1 : m;
  // Bearing of the threat in the body frame; CCW positive = left.
  let phi = Math.atan2(dy, dx) - yaw;
  phi = Math.atan2(Math.sin(phi), Math.cos(phi)); // wrap to (−π, π]
  const sinPhi = Math.sin(phi);
  return {
    loomL: m * 0.5 * (1 + sinPhi),
    loomR: m * 0.5 * (1 - sinPhi),
    magnitude: m,
    theta,
    rate,
    bearing: phi,
  };
}

/**
 * One escape NCA tick — byte-for-byte `stepChemo`, with the last two planes being
 * the **already-amplified** loom planes (loom_left ch6, loom_right ch7). The
 * driver (`makeEscapeController`) writes loom_input_gain into the planes before
 * calling this, exactly as `read_loom` feeds conv1; `s` is the 8×8×4 recurrent
 * state, `joints`/`contacts` the live proprioception planes, `gain` the tanh gain.
 */
export function stepEscape(
  s: Float32Array,
  joints: Float32Array,
  contacts: Float32Array,
  loomL: Float32Array,
  loomR: Float32Array,
  ctrl: EscapeController,
  gain: number,
): Float32Array {
  const { conv1_w, conv1_b, conv2_w, conv2_b } = ctrl;
  const out = new Float32Array(N);
  const hvec = new Float32Array(HID);
  // Input planes 0..3 = recurrent state, 4 = joints, 5 = contacts, 6/7 = loom L/R.
  const planes: Float32Array[] = [
    s.subarray(0, 64),
    s.subarray(64, 128),
    s.subarray(128, 192),
    s.subarray(192, 256),
    joints,
    contacts,
    loomL,
    loomR,
  ];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      for (let o = 0; o < HID; o++) {
        let acc = conv1_b[o];
        const wo = conv1_w[o];
        for (let i = 0; i < ESCAPE_IN; i++) {
          const wi = wo[i];
          const plane = planes[i];
          for (let ky = 0; ky < 3; ky++) {
            const yy = y + ky - 1;
            if (yy < 0 || yy >= H) continue;
            const wik = wi[ky];
            for (let kx = 0; kx < 3; kx++) {
              const xx = x + kx - 1;
              if (xx < 0 || xx >= W) continue;
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
  }
  return out;
}

/**
 * A stateful escape driver for FlyStage. Each `motors(angles, contacts, loomL,
 * loomR)` call lays live proprioception + the two **amplified** loom planes onto
 * ch4–ch7 *exactly* as the exported `sensors` spec dictates, advances one tick,
 * and returns the 42 motor targets. `loomL`/`loomR` are the already-split [0,1]
 * eye magnitudes (the demo computes them with `loomSignal` from the live pose +
 * threat); this driver multiplies them by `loom_input_gain` as it writes the
 * planes. With `loomL = loomR = 0` the loom planes are zero regardless of gain,
 * so the rule reproduces the C2-A closed-loop walking dynamics exactly (A/B).
 *   ch4 — 42 joint angles  (θ/3.14, clipped)  → 7×6 motor block (rows 0–6, cols 0–5)
 *   ch5 — 6 foot contacts  {0,1}              → bottom row (row 7, cols 0–5)
 *   ch6 — loom_left·gain                       → LEFT half of block (rows 0–6, cols 0–2)
 *   ch7 — loom_right·gain                      → RIGHT half of block (rows 0–6, cols 3–5)
 */
export function makeEscapeController(
  ctrl: EscapeController,
  opts?: { seed?: number; gain?: number; loomInputGain?: number },
) {
  const gain = opts?.gain ?? ctrl.meta.gain ?? 1.0;
  const loomGain = opts?.loomInputGain ?? ctrl.sensing.loom_input_gain ?? 1.0;
  let state = initState(opts?.seed ?? 7);
  const joints = new Float32Array(64); // ch4 — joint angles on the motor block
  const contacts = new Float32Array(64); // ch5 — foot contacts on the bottom row
  const loomLPlane = new Float32Array(64); // ch6 — amplified loom_left, left half
  const loomRPlane = new Float32Array(64); // ch7 — amplified loom_right, right half
  const out = new Float32Array(42);
  const cells = ctrl.motor_cells;
  return {
    /** Advance one tick from live proprioception + bilateral loom; 42 targets. */
    motors(
      angles: ArrayLike<number>,
      contactBools: ArrayLike<number>,
      loomL: number,
      loomR: number,
    ): Float32Array {
      joints.fill(0);
      for (let i = 0; i < cells.length; i++) {
        const [row, col] = cells[i];
        let v = angles[i] / 3.14;
        v = v < -1 ? -1 : v > 1 ? 1 : v;
        joints[row * 8 + col] = v;
      }
      contacts.fill(0);
      for (let leg = 0; leg < 6; leg++) contacts[7 * 8 + leg] = contactBools[leg] ? 1 : 0;
      // Topographic loom, amplified: loomL·gain over rows 0–6 cols 0–2,
      // loomR·gain over rows 0–6 cols 3–5 (mirrors read_loom feeding conv1).
      const aL = loomL * loomGain;
      const aR = loomR * loomGain;
      loomLPlane.fill(0);
      loomRPlane.fill(0);
      for (let row = 0; row <= 6; row++) {
        for (let col = 0; col <= 2; col++) loomLPlane[row * 8 + col] = aL;
        for (let col = 3; col <= 5; col++) loomRPlane[row * 8 + col] = aR;
      }

      state = stepEscape(state, joints, contacts, loomLPlane, loomRPlane, ctrl, gain);
      return motorTargets(state, cells, out);
    },
    get state() {
      return state;
    },
    reset(seed?: number) {
      state = initState(seed ?? opts?.seed ?? 7);
    },
  };
}

/**
 * A stateful, allocation-light NCA driver for FlyStage: holds its own 8×8×4
 * state, advances one tick per `motors()` call, and returns the 42-vector of
 * leg actuator targets. `gain = 1.0` is the evolved native regime.
 */
export function makeNcaController(ctrl: Controller, opts?: { seed?: number; gain?: number }) {
  const gain = opts?.gain ?? 1.0;
  let state = initState(opts?.seed ?? 7);
  const out = new Float32Array(42);
  return {
    /** Advance one tick and return the 42 motor targets (reused buffer). */
    motors(): Float32Array {
      state = step(state, ctrl, gain);
      return motorTargets(state, ctrl.motor_cells, out);
    },
    /** Current 8×8×4 state (for optional channel-0 visualisation). */
    get state() {
      return state;
    },
    reset(seed?: number) {
      state = initState(seed ?? opts?.seed ?? 7);
    },
  };
}

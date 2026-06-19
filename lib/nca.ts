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

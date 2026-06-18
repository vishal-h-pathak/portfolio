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

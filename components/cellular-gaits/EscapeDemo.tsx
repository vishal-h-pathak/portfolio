"use client";

/**
 * <EscapeDemo> — the live, in-browser launch-the-threat escape (Behaviors /
 * escape, X-C). The killer demo: one live MuJoCo FlyStage runs the trained
 * escape controller (8→16, two bilateral loom channels), and you fire a looming
 * threat at it from a chosen azimuth. Each control step the loop reads the fly's
 * thorax xy + yaw straight from the sim (`lib/mujoco-fly.ts`), advances the
 * threat along its constant-velocity, target-leading course, evaluates the
 * analytic looming front-end (`loomSignal` in `lib/nca.ts`) at the live pose, and
 * feeds the two eye magnitudes into the controller. The *direction* of the bolt
 * is emergent — it falls out of the `loom_L − loom_R` asymmetry, nothing says
 * "flee the bigger side". The threat geometry → loom signal is analytic
 * (hand-built, the seam for the real LC4/LPLC2 → DNp01 circuit); only the
 * response is learned. Nothing here is recorded; `fallbackClipSrc` shows a
 * recorded flee where WASM can't run.
 *
 * Honesty echoed in the copy: the looming front-end is a stand-in for the real
 * escape circuit, and the [0,1] loom cue is multiplied by `loom_input_gain` (=8)
 * before conv1 — the bang-bang warm-start gait can't be moved by an unamplified
 * cue. With no active threat both loom channels are zero, so the fly just walks
 * (the A/B-exact closed-loop dynamics).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { loadEscape, loomSignal, makeEscapeController, type EscapeController } from "@/lib/nca";
import { TOKEN } from "@/lib/tokens";
import type { FlyStageCtx, FlyStageMetrics } from "@/components/cellular-gaits/FlyStage";

const FlyStage = dynamic(
  () => import("@/components/cellular-gaits/FlyStage").then((m) => m.FlyStage),
  { ssr: false },
);

/* TOKEN, not var(): these reach a canvas 2D ctx (fillStyle/strokeStyle), which
   cannot resolve a CSS custom property. A hex works in the JSX styles too. */
const GREEN = TOKEN.green;
const AMBER = TOKEN.amber;
const THREAT = TOKEN.signalOnset;
const INK = TOKEN.ink;
const SUB = TOKEN.inkDim;

// Fly-centred arena: world units → px, with the fly pinned at the centre. The
// threat starts ~18 units out and streaks ~33 units through, so a tighter scale
// than chemo's keeps the whole incoming course on screen.
const PX_PER_UNIT = 5.5;
const ARENA_H = 300;
const DEG = Math.PI / 180;

/** The escape config block from `escape_metrics.json` (passed by the route). */
export type EscapeConfig = {
  threat_speed: number;
  threat_radius: number;
  threat_start_distance: number;
  threat_hit_radius: number;
  threat_lead_distance: number;
  loom_input_gain: number;
  azimuths_deg: number[];
  rollout_steps?: number;
  rollout_seconds?: number;
};

type Pose = { x: number; y: number; yaw: number };
type Threat = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  startX: number;
  startY: number;
  aimX: number;
  aimY: number;
  travel: number; // straight-line start→aim distance, for the escape cut-off
  active: boolean;
  hit: boolean;
  azimuth: number;
};
type Status = "idle" | "incoming" | "hit" | "escaped";
type Readout = {
  loomL: number;
  loomR: number;
  magnitude: number;
  dist: number;
  status: Status;
  minDist: number;
};

// The three trained panel azimuths (front / left / right), in the fly frame.
const PANEL: { deg: number; label: string }[] = [
  { deg: 0, label: "front · 0°" },
  { deg: 90, label: "left · 90°" },
  { deg: 270, label: "right · 270°" },
];

export function EscapeDemo({ config }: { config: EscapeConfig }) {
  const [ready, setReady] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [readout, setReadout] = useState<Readout | null>(null);

  const escRef = useRef<ReturnType<typeof makeEscapeController> | null>(null);
  const geomRef = useRef<EscapeController["sensing"]["geometry"] | null>(null);
  const poseRef = useRef<Pose>({ x: 0, y: 0, yaw: 0 });
  const threatRef = useRef<Threat | null>(null);
  const prevThetaRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number | null>(null);
  const liveRef = useRef<Readout>({
    loomL: 0,
    loomR: 0,
    magnitude: 0,
    dist: 0,
    status: "idle",
    minDist: Infinity,
  });
  const zero = useRef(new Float32Array(42));
  // Set when the physics blows up to NaN (e.g. a hard bolt tumbles the fly into
  // untrained territory) — we self-heal with one reset.
  const diverged = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevStep = useRef(-1);
  // A pending launch request from a button/click, consumed on the next control
  // step (so the onset pose is the live pose, captured inside the loop).
  const pendingAzimuth = useRef<number | null>(null);

  // Load the trained escape controller once (tiny JSON; WASM loads in parallel
  // inside FlyStage). loadEscape pulls v1's motor_cells + the loom geometry from
  // the export's sensors spec; the authoritative loom_input_gain comes from the
  // route config (escape_metrics.json) so the ×8 amplification is data-driven.
  useEffect(() => {
    let alive = true;
    (async () => {
      const ctrl = await loadEscape();
      if (!alive) return;
      escRef.current = makeEscapeController(ctrl, { loomInputGain: config.loom_input_gain });
      geomRef.current = ctrl.sensing.geometry;
      setReady(true);
    })().catch((e) => console.error("[EscapeDemo] controller load failed", e));
    return () => {
      alive = false;
    };
  }, [config.loom_input_gain]);

  // Build a threat from the live onset pose, fired along `azimuthDeg` in the
  // fly's onset-heading frame. The threat starts `threat_start_distance` out on
  // that bearing and flies at `threat_speed` toward a *target-leading* aim point
  // (aim = onset_pos + lead_distance · heading) — a genuine collision course from
  // every azimuth, so a fly that keeps walking straight is hit.
  const buildThreat = useCallback(
    (p: Pose, azimuthDeg: number): Threat => {
      const launchAngle = p.yaw + azimuthDeg * DEG;
      const startX = p.x + config.threat_start_distance * Math.cos(launchAngle);
      const startY = p.y + config.threat_start_distance * Math.sin(launchAngle);
      const aimX = p.x + config.threat_lead_distance * Math.cos(p.yaw);
      const aimY = p.y + config.threat_lead_distance * Math.sin(p.yaw);
      const dx = aimX - startX;
      const dy = aimY - startY;
      const travel = Math.hypot(dx, dy) || 1;
      return {
        x: startX,
        y: startY,
        vx: (config.threat_speed * dx) / travel,
        vy: (config.threat_speed * dy) / travel,
        startX,
        startY,
        aimX,
        aimY,
        travel,
        active: true,
        hit: false,
        azimuth: ((azimuthDeg % 360) + 360) % 360,
      };
    },
    [config.threat_start_distance, config.threat_lead_distance, config.threat_speed],
  );

  // The live controller handed to FlyStage. Reads the body pose, advances any
  // active threat, computes the bilateral loom against the live pose, and feeds
  // loom_L/loom_R into the trained controller every control step.
  const controller = useCallback(
    (ctx: FlyStageCtx): Float32Array => {
      const esc = escRef.current;
      const geom = geomRef.current;
      if (!esc || !geom) return zero.current;

      const [tx, ty] = ctx.sim.thoraxXyz();
      const yaw = ctx.sim.thoraxYaw();

      // Guard the physics: if the sim has gone non-finite, stop driving it and
      // ask the stage for one clean re-pose (self-heal), keeping the last good
      // pose so the arena doesn't try to draw NaN.
      if (!Number.isFinite(tx) || !Number.isFinite(ty) || !Number.isFinite(yaw)) {
        if (!diverged.current) {
          diverged.current = true;
          setResetSignal((r) => r + 1);
        }
        return zero.current;
      }

      const pose = { x: tx, y: ty, yaw };
      poseRef.current = pose;

      // On a fresh start (reset / first run), re-seed the rule and clear any
      // in-flight threat so the fly resumes plain walking.
      if (ctx.controlStep === 0 && prevStep.current !== 0) {
        esc.reset();
        threatRef.current = null;
        prevThetaRef.current = null;
        prevTimeRef.current = null;
        pendingAzimuth.current = null;
        diverged.current = false;
        liveRef.current = {
          loomL: 0,
          loomR: 0,
          magnitude: 0,
          dist: 0,
          status: "idle",
          minDist: Infinity,
        };
      }
      prevStep.current = ctx.controlStep;

      // Consume a pending launch from a button/click against the live pose.
      if (pendingAzimuth.current != null) {
        threatRef.current = buildThreat(pose, pendingAzimuth.current);
        prevThetaRef.current = null;
        liveRef.current = {
          loomL: 0,
          loomR: 0,
          magnitude: 0,
          dist: config.threat_start_distance,
          status: "incoming",
          minDist: Infinity,
        };
        pendingAzimuth.current = null;
      }

      // Control-step Δt (sim seconds) for the expansion-rate term; fall back to a
      // single 250 Hz control step before we have two timestamps.
      const dt =
        prevTimeRef.current != null && ctx.time > prevTimeRef.current
          ? ctx.time - prevTimeRef.current
          : 0.004;
      prevTimeRef.current = ctx.time;

      let loomL = 0;
      let loomR = 0;
      const threat = threatRef.current;
      if (threat && threat.active) {
        // Advance the threat along its fixed course.
        threat.x += threat.vx * dt;
        threat.y += threat.vy * dt;

        const sig = loomSignal(
          tx,
          ty,
          yaw,
          threat.x,
          threat.y,
          geom,
          prevThetaRef.current,
          dt,
        );
        prevThetaRef.current = sig.theta;
        loomL = sig.loomL;
        loomR = sig.loomR;

        const dist = Math.hypot(threat.x - tx, threat.y - ty);
        const prev = liveRef.current;
        const minDist = Math.min(prev.minDist, dist);
        let status: Status = "incoming";
        if (dist <= config.threat_hit_radius) {
          threat.hit = true;
          threat.active = false; // freeze the threat on the fly
          status = "hit";
        } else {
          // How far the threat has travelled along its course (start → aim → past).
          const progress = Math.hypot(threat.x - threat.startX, threat.y - threat.startY);
          if (progress > threat.travel + config.threat_start_distance) {
            threat.active = false; // it whiffed past and is receding
            threatRef.current = null;
            status = "escaped";
          }
        }
        liveRef.current = {
          loomL: sig.loomL,
          loomR: sig.loomR,
          magnitude: sig.magnitude,
          dist,
          status,
          minDist,
        };
      }

      return esc.motors(ctx.sim.actuatorLengths(), ctx.sim.footContacts(), loomL, loomR);
    },
    [
      buildThreat,
      config.threat_hit_radius,
      config.threat_start_distance,
    ],
  );

  // ── arena drawing (fly-centred top-down) ────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth || 320;
    const cssH = ARENA_H;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const cx = cssW / 2;
    const cy = cssH / 2;
    const pose = poseRef.current;
    const threat = threatRef.current;

    // world → screen, fly pinned at centre, world +y up.
    const toScreen = (wx: number, wy: number): [number, number] => [
      cx + (wx - pose.x) * PX_PER_UNIT,
      cy - (wy - pose.y) * PX_PER_UNIT,
    ];

    // background
    ctx.fillStyle = "rgba(232,230,223,0.02)";
    ctx.fillRect(0, 0, cssW, cssH);

    if (!Number.isFinite(pose.x) || !Number.isFinite(pose.y) || !Number.isFinite(pose.yaw)) return;

    // collision zone (hit radius) around the fly
    ctx.strokeStyle = "rgba(242,104,60,0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, config.threat_hit_radius * PX_PER_UNIT, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // the threat course + disk
    if (threat && Number.isFinite(threat.x) && Number.isFinite(threat.y)) {
      const [aimSx, aimSy] = toScreen(threat.aimX, threat.aimY);
      const [tsx, tsy] = toScreen(threat.x, threat.y);

      // dashed course toward the lead aim point
      ctx.strokeStyle = "rgba(242,104,60,0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      ctx.moveTo(tsx, tsy);
      ctx.lineTo(aimSx, aimSy);
      ctx.stroke();
      ctx.setLineDash([]);

      // the lead aim point (where a straight-walking fly would be)
      ctx.strokeStyle = "rgba(242,104,60,0.6)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(aimSx - 4, aimSy - 4);
      ctx.lineTo(aimSx + 4, aimSy + 4);
      ctx.moveTo(aimSx + 4, aimSy - 4);
      ctx.lineTo(aimSx - 4, aimSy + 4);
      ctx.stroke();

      // the looming disk (grows as it nears — its on-screen radius is the threat
      // radius, the loom magnitude tints it brighter)
      const mag = liveRef.current.magnitude;
      ctx.fillStyle = `rgba(242,104,60,${0.4 + 0.5 * mag})`;
      ctx.strokeStyle = THREAT;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(tsx, tsy, Math.max(4, config.threat_radius * PX_PER_UNIT), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // ── the fly: an oriented triangle at the centre, eyes tinted by loom L/R ──
    const fwd = { x: Math.cos(pose.yaw), y: -Math.sin(pose.yaw) }; // screen frame
    const lft = { x: Math.sin(pose.yaw), y: Math.cos(pose.yaw) };
    const { loomL, loomR } = liveRef.current;
    // left/right eye dots (the bilateral cue that carries direction)
    const eyes: [number, boolean][] = [
      [loomL, loomL >= loomR && loomL > 0.001],
      [loomR, loomR > loomL && loomR > 0.001],
    ];
    eyes.forEach(([v, lead], i) => {
      const side = i === 0 ? 1 : -1; // +left, −right (screen lft is fly-left)
      const ex = cx + fwd.x * 7 + lft.x * 6 * side;
      const ey = cy + fwd.y * 7 + lft.y * 6 * side;
      ctx.fillStyle = `rgba(242,104,60,${0.25 + 0.7 * Math.min(1, v)})`;
      ctx.strokeStyle = lead ? THREAT : SUB;
      ctx.lineWidth = lead ? 1.8 : 1;
      ctx.beginPath();
      ctx.arc(ex, ey, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    // body triangle pointing along yaw — green when bolting
    const bolting = liveRef.current.status === "incoming" && liveRef.current.magnitude > 0.02;
    const nose = [cx + fwd.x * 11, cy + fwd.y * 11];
    const bl = [cx - fwd.x * 6 + lft.x * 6, cy - fwd.y * 6 + lft.y * 6];
    const br = [cx - fwd.x * 6 - lft.x * 6, cy - fwd.y * 6 - lft.y * 6];
    ctx.fillStyle = bolting ? "rgba(111,227,154,0.22)" : "rgba(232,230,223,0.18)";
    ctx.strokeStyle = bolting ? GREEN : INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(nose[0], nose[1]);
    ctx.lineTo(bl[0], bl[1]);
    ctx.lineTo(br[0], br[1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }, [config.threat_hit_radius, config.threat_radius]);

  // Redraw on every metrics tick from the stage (~10 Hz) — cheap 2D.
  const onStep = useCallback(
    (_m: FlyStageMetrics) => {
      setReadout(liveRef.current);
      draw();
    },
    [draw],
  );

  // Keep the arena sized to its box.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas);
    draw();
    return () => ro.disconnect();
  }, [draw]);

  // Launch a threat from a panel azimuth (consumed on the next control step).
  const launch = useCallback((azimuthDeg: number) => {
    pendingAzimuth.current = azimuthDeg;
  }, []);

  // Click-in-arena: launch from the bearing of the click in the fly's frame —
  // an arbitrary azimuth (held-out azimuths generalize, which is the point).
  const onArenaPointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left - rect.width / 2;
    const py = e.clientY - rect.top - rect.height / 2;
    const pose = poseRef.current;
    // screen → world bearing, then into the fly frame (CCW positive).
    const worldBearing = Math.atan2(-py, px);
    const azimuth = (worldBearing - pose.yaw) / DEG;
    pendingAzimuth.current = azimuth;
  }, []);

  const onReset = useCallback(() => {
    setResetSignal((r) => r + 1);
  }, []);

  const fmt = (v: number) => v.toFixed(3);
  const lead = readout ? (readout.loomL >= readout.loomR ? "left" : "right") : "—";
  // The bolt is away from the looming side: stronger-left → flee right.
  const flee = readout && readout.magnitude > 0.02 ? (readout.loomL >= readout.loomR ? "right" : "left") : "—";

  const statusText = (() => {
    if (!readout || readout.status === "idle") return "no threat — the fly just walks (both loom channels zero).";
    if (readout.status === "incoming")
      return `threat incoming · loom stronger on the ${lead} → bolting ${flee}. closest so far ${readout.minDist === Infinity ? "—" : readout.minDist.toFixed(1)}.`;
    if (readout.status === "hit") return `hit — the threat reached the fly (within ${config.threat_hit_radius.toFixed(0)} units).`;
    return `escaped — the threat whiffed past (closest ${readout.minDist === Infinity ? "—" : readout.minDist.toFixed(1)} units).`;
  })();

  return (
    <div className="cg-chemo-live">
      <div className="cg-perturb-live-head">
        <span className="cg-pg-badge" style={{ color: GREEN }}>
          live · launch the threat
        </span>
        <p className="cg-sense-stage-note">
          The trained escaper walking the real fly, live — and{" "}
          <strong>fleeing the threat you launch</strong>. Pick an azimuth (or click
          anywhere in the arena to launch from that bearing); a looming disk streaks
          in on a <strong>target-leading collision course</strong>. Each control step
          the loop reads its thorax pose from the sim, computes the bilateral loom,
          and bolts. The <em>direction</em> falls out of the{" "}
          <code>loom_L − loom_R</code> asymmetry — no flee is hard-coded. The threat
          geometry → loom is <strong>analytic</strong> (the hand-built stand-in for
          the LC4/LPLC2 → DNp01 circuit); only the <em>response</em> is learned.
        </p>
      </div>

      <div className="cg-chemo-stages">
        <div className="cg-chemo-stage3d">
          <FlyStage
            controller={controller}
            onStep={onStep}
            height={ARENA_H}
            resetSignal={resetSignal}
            fallbackClipSrc="/cellular-gaits/data-x/flee_left.mp4"
          />
        </div>

        <div className="cg-chemo-arena-wrap">
          <div className="cg-chemo-arena" style={{ position: "relative", height: ARENA_H }}>
            <canvas
              ref={canvasRef}
              className="cg-escape-canvas"
              style={{ width: "100%", height: ARENA_H, display: "block", touchAction: "none" }}
              onPointerDown={onArenaPointerDown}
              role="img"
              aria-label="Top-down arena: the fly at centre with its collision ring, and the looming threat streaking in toward its target-leading aim point. Click to launch a threat from that bearing."
            />
          </div>
          <p className="cg-chemo-arena-cap">
            top-down · fly-centred (north up). click anywhere to launch a threat from
            that bearing.
          </p>
        </div>
      </div>

      <div className="cg-chemo-controls" role="group" aria-label="Live escape demo controls">
        <div className="cg-escape-az" role="group" aria-label="Launch a threat from an azimuth">
          {PANEL.map((a) => (
            <button
              key={a.deg}
              type="button"
              className="cg-pg-btn"
              onClick={() => launch(a.deg)}
              disabled={!ready}
            >
              {a.label}
            </button>
          ))}
        </div>
        <button type="button" className="cg-pg-btn" onClick={onReset} disabled={!ready}>
          reset
        </button>
      </div>

      <div
        className="cg-flystage-readout cg-chemo-readout"
        aria-label={`Bilateral loom: left eye ${readout ? fmt(readout.loomL) : "—"}, right eye ${readout ? fmt(readout.loomR) : "—"}, stronger on the ${lead}.`}
      >
        <span>
          loom_L{" "}
          <strong style={{ color: readout && readout.loomL >= readout.loomR && readout.magnitude > 0.001 ? THREAT : undefined }}>
            {readout ? fmt(readout.loomL) : "—"}
          </strong>
        </span>
        <span>
          loom_R{" "}
          <strong style={{ color: readout && readout.loomR > readout.loomL && readout.magnitude > 0.001 ? THREAT : undefined }}>
            {readout ? fmt(readout.loomR) : "—"}
          </strong>
        </span>
        <span>
          Δ = L−R{" "}
          <strong>{readout ? (readout.loomL - readout.loomR >= 0 ? "+" : "") + fmt(readout.loomL - readout.loomR) : "—"}</strong>
        </span>
        <span>
          dist <strong>{readout && readout.status !== "idle" ? readout.dist.toFixed(1) : "—"}</strong>
        </span>
        <span className="cg-escape-status" data-status={readout?.status ?? "idle"}>
          {readout?.status ?? "idle"}
        </span>
      </div>

      <p className="cg-chemo-live-readout" aria-live="polite">
        {ready ? statusText : "Loading the trained controller…"}
      </p>

      <p className="cg-pg-cap">
        live MuJoCo · the loop reads thorax pose from the sim and the loom from the
        threat you launch, every step
        {!ready && " · loading controller…"}. The [0,1] loom cue is multiplied by{" "}
        <strong>loom_input_gain = {config.loom_input_gain.toFixed(0)}</strong> before
        conv1 — the bang-bang warm-start gait can&apos;t be moved by an unamplified
        cue (the escape analog of chemotaxis&apos;s strong antenna baseline);
        amplifying a zero loom is still zero, so with no threat the fly just walks.
      </p>
    </div>
  );
}

export default EscapeDemo;

import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt =
  "Vishal Pathak — Notebook & Bench. Hodgkin–Huxley action potential trace.";

// Static export of the hero: the spike trace on dark bg, with name + tagline.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0B0B0C",
          color: "#E8E6DF",
          display: "flex",
          flexDirection: "column",
          padding: 64,
          fontFamily: "Georgia, serif",
        }}
      >
        {/* eyebrow */}
        <div
          style={{
            fontSize: 18,
            letterSpacing: "0.22em",
            color: "#6FE39A",
            textTransform: "uppercase",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          § VISHAL PATHAK · NOTEBOOK &amp; BENCH
        </div>

        {/* trace */}
        <div
          style={{
            marginTop: 56,
            border: "1px solid rgba(232,230,223,0.12)",
            background: "#101012",
            padding: "44px 56px 24px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <svg viewBox="0 0 720 200" width={1072} height={298}>
            <line
              x1="0"
              y1="140"
              x2="720"
              y2="140"
              stroke="rgba(232,230,223,0.08)"
              strokeDasharray="2 4"
            />
            <line
              x1="0"
              y1="60"
              x2="720"
              y2="60"
              stroke="rgba(232,230,223,0.04)"
              strokeDasharray="2 4"
            />
            <path
              d="M0,140 L80,140 L100,141 L130,138 L160,140 L185,138 L200,135
                 Q210,135 215,120 Q220,80 225,30 Q230,15 240,18
                 Q250,30 260,90 Q270,160 280,170 Q290,165 300,150
                 L340,142 L380,140 L410,140 L435,138 L450,135
                 Q460,135 465,120 Q470,80 475,30 Q480,15 490,18
                 Q500,30 510,90 Q520,160 530,170 Q540,165 550,150
                 L600,142 L660,140 L720,140"
              fill="none"
              stroke="#6FE39A"
              strokeWidth="2.6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <div
            style={{
              marginTop: 18,
              fontFamily: "ui-monospace, monospace",
              fontSize: 16,
              color: "#8C8B83",
              letterSpacing: "0.14em",
            }}
          >
            FIG.1 &nbsp; V_m vs. t &nbsp;·&nbsp; two action potentials,
            simulated
          </div>
        </div>

        {/* footer line — split into flex rows so Satori can lay them out */}
        <div
          style={{
            marginTop: "auto",
            fontSize: 28,
            lineHeight: 1.25,
            color: "#E8E6DF",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span>Electrical engineer in Atlanta.</span>
            <span style={{ color: "#6FE39A" }}>Neuromorphic hardware</span>
            <span>for ten years —</span>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              color: "#8C8B83",
            }}
          >
            <span>and lately a lot of</span>
            <span style={{ color: "#E89B3D" }}>agentic systems</span>
            <span>, off-hours, with an LLM in the loop.</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

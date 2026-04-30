/**
 * Hodgkin–Huxley action potential trace.
 * Path is hand-tuned in the reference HTML (Notebook + Bench.html) — copied verbatim.
 * Do not regenerate.
 */
export function HHTrace() {
  return (
    <svg
      viewBox="0 0 720 200"
      aria-label="Hodgkin-Huxley action potential trace"
      role="img"
    >
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
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <text
        x="6"
        y="20"
        fill="rgba(232,230,223,0.4)"
        fontFamily="JetBrains Mono, monospace"
        fontSize="10"
        letterSpacing="0.1em"
      >
        +40 mV
      </text>
      <text
        x="6"
        y="138"
        fill="rgba(232,230,223,0.4)"
        fontFamily="JetBrains Mono, monospace"
        fontSize="10"
        letterSpacing="0.1em"
      >
        -65 mV
      </text>
      <text
        x="660"
        y="195"
        fill="rgba(232,230,223,0.4)"
        fontFamily="JetBrains Mono, monospace"
        fontSize="10"
        letterSpacing="0.1em"
      >
        t (ms)
      </text>
    </svg>
  );
}

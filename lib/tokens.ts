/*
  The TS mirror of the palette in app/tokens.css.

  CSS is the source of truth. This file exists ONLY for the contexts that
  physically cannot read a CSS custom property:

    - canvas 2D   (ctx.fillStyle = "#…" — var() is not a color there)
    - WebGL/three (new THREE.Color(…))
    - Satori      (app/opengraph-image.tsx — the OG renderer has no cascade)

  Everywhere else — SVG presentation attributes, inline styles, className —
  use var(--token) directly and do NOT import from here.

  scripts/check-tokens.mjs parses app/tokens.css and fails the build if these
  hexes drift from it, so the two copies cannot silently diverge the way the
  ~150 pasted literals did before (W6/#26).
*/

export const TOKEN = {
  bg: "#0b0b0c",
  bgRaised: "#101012",
  bgCard: "#14130f",
  bgDeep: "#050507",

  ink: "#e8e6df",
  inkDim: "#8c8b83",
  inkFaint: "#828071",

  green: "#6fe39a",
  amber: "#e89b3d",
  signalOnset: "#f2683c",

  /* The one red — status/data, not a third accent. --chaos is an alias of it. */
  red: "#e0655b",
} as const;

/** Maps a TOKEN key back to its CSS custom-property name. */
export const CSS_VAR: Record<keyof typeof TOKEN, string> = {
  bg: "--bg",
  bgRaised: "--bg-raised",
  bgCard: "--bg-card",
  bgDeep: "--bg-deep",
  ink: "--ink",
  inkDim: "--ink-dim",
  inkFaint: "--ink-faint",
  green: "--green",
  amber: "--amber",
  signalOnset: "--signal-onset",
  red: "--red",
};

/**
 * The chart palette. Both console charts (jobs/insights and credits) used to
 * re-type the whole palette as a local CHART object, each with an "if the
 * tokens change, update PALETTE below" comment — comment discipline as the only
 * thing holding two copies together. They import this instead.
 *
 * Recharts resolves colors on an SVG element, so var() works and these stay
 * live against the cascade.
 */
const dim = (token: string) => `color-mix(in srgb, var(${token}) 45%, transparent)`;

export const CHART = {
  green: "var(--green)",
  greenDim: dim("--green"),
  amber: "var(--amber)",
  amberDim: dim("--amber"),
  blue: "var(--blue)",
  blueDim: dim("--blue"),
  red: "var(--red)",
  redDim: dim("--red"),
  ink: "var(--ink)",
  inkWash: "color-mix(in srgb, var(--ink) 25%, transparent)",
  inkDim: "var(--ink-dim)",
  inkFaint: "var(--ink-faint)",
  rule: "var(--rule)",
  ruleSoft: "var(--rule-soft)",
  raised: "var(--bg-raised)",
} as const;

/** The tooltip + axis-tick styles both console charts used to declare separately. */
export const CHART_TOOLTIP = {
  background: CHART.raised,
  border: `1px solid ${CHART.rule}`,
  borderRadius: 0,
  fontSize: 11,
  fontFamily: "var(--mono)",
} as const;

export const CHART_TICK = { fill: CHART.inkFaint, fontSize: 10 } as const;

#!/usr/bin/env node
/*
  Guards the two copies of the palette against drift (W6/#26):

    1. lib/tokens.ts must agree with the :root block in app/tokens.css. The TS
       mirror only exists for canvas / WebGL / Satori, which cannot read a CSS
       variable — but a mirror held together by a comment is exactly how this
       codebase ended up with four independently-maintained palettes.

    2. No raw token-family hex may appear in .tsx/.ts outside lib/tokens.ts.
       An s3 retheme has to catch every consumer; a pasted #6FE39A is invisible
       to it.

  Runs in `npm run prebuild`.
*/
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};

// ── 1. TS mirror vs CSS source ────────────────────────────────────────────
const css = readFileSync("app/tokens.css", "utf8");
const ts = readFileSync("lib/tokens.ts", "utf8");

const cssVars = {};
for (const [, name, value] of css.matchAll(/^\s*(--[\w-]+):\s*(#[0-9a-fA-F]{6});/gm)) {
  cssVars[name] = value.toLowerCase();
}

const tsPairs = [...ts.matchAll(/^\s*(\w+): "(#[0-9a-fA-F]{6})",/gm)];
const CAMEL_TO_VAR = {
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

let checked = 0;
for (const [, key, hex] of tsPairs) {
  const varName = CAMEL_TO_VAR[key];
  if (!varName) continue;
  checked++;
  const cssHex = cssVars[varName];
  if (!cssHex) fail(`lib/tokens.ts has TOKEN.${key} but app/tokens.css has no ${varName}`);
  else if (cssHex !== hex.toLowerCase())
    fail(`TOKEN.${key} = ${hex} but ${varName} = ${cssHex} in app/tokens.css`);
}
for (const varName of Object.values(CAMEL_TO_VAR)) {
  if (!cssVars[varName]) fail(`app/tokens.css is missing ${varName}`);
}

// ── 2. no raw token-family hex in TS/TSX ──────────────────────────────────
const FAMILY =
  /#(0b0b0c|101012|14130f|050507|e8e6df|8c8b83|828071|7e7a6d|6fe39a|e89b3d|e36f6f|e0655b|f2683c)\b/i;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if ([".ts", ".tsx"].includes(extname(p))) out.push(p);
  }
  return out;
}

for (const f of ["app", "components", "lib"].flatMap((d) => walk(d))) {
  if (f === join("lib", "tokens.ts")) continue;
  const src = readFileSync(f, "utf8");
  src.split("\n").forEach((line, i) => {
    const m = line.match(FAMILY);
    if (m) fail(`${f}:${i + 1} raw token hex ${m[0]} — import TOKEN from lib/tokens or use var()`);
  });
}

if (!process.exitCode) console.log(`✓ tokens: ${checked} hexes match app/tokens.css, no raw hex in tsx`);

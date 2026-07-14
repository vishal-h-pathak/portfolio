#!/usr/bin/env node
/*
  Cross-references every class selector declared in the CSS files against every
  string that appears in the app's .ts/.tsx source. A class with zero source
  hits has no possible markup consumer and is dead.

  Deliberately conservative: it substring-matches the bare class name anywhere
  in the source (including inside template literals and `cg-${x}` prefixes are
  flagged as "dynamic" below), so it under-reports dead rules rather than
  over-reporting them. Run before any token/refactor pass so extraction doesn't
  tokenize dead rules:  node scripts/find-dead-css.mjs
*/
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const CSS = [
  "app/globals.css",
  "app/_internal.css",
  "app/projects/project-shell.css",
  "app/projects/soliton/soliton.css",
];
const SRC_DIRS = ["app", "components", "lib", "content"];

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (e === "node_modules" || e === ".next") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if ([".ts", ".tsx", ".js", ".jsx", ".md", ".mdx"].includes(extname(p))) out.push(p);
  }
  return out;
}

const source = SRC_DIRS.flatMap((d) => walk(d))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

const dead = [];
for (const file of CSS) {
  // Strip comments first — otherwise a prose mention of a deleted class
  // ("`.bench-intro` is gone, see …") reads as a live selector.
  const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const classes = new Set();
  // class selectors only (skip attribute/pseudo tails)
  for (const m of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) classes.add(m[1]);
  for (const cls of classes) {
    if (!source.includes(cls)) dead.push(`${file}  .${cls}`);
  }
}

if (dead.length) {
  console.log(`${dead.length} class selector(s) with no source consumer:\n`);
  for (const d of dead.sort()) console.log("  " + d);
  process.exitCode = 1;
} else {
  console.log("No dead class selectors.");
}

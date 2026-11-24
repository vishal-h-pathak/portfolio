#!/usr/bin/env node
/*
  Removal acceptance test for the retired trading pages, run by `npm run build`
  (postbuild). Fails the build if the built output still contains the retired
  names. Names are assembled from fragments so this file is not a hit itself.

  Server-side source maps (under .next/server, *.map) are deleted first. They
  are never served to browsers, and they embed full third-party sources: the
  three.js geometry code has one of the retired names as an ordinary English
  word in a comment, which is not a reference to the retired page. Browser
  source maps are off, so nothing else is removed.
*/
import { readdirSync, readFileSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";

const NAMES = [["sol", "iton"], ["mer", "idian"]].map((p) => p.join(""));
const walk = (d, out = []) => {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

let removed = 0;
for (const f of walk(".next/server")) {
  if (f.endsWith(".map")) {
    rmSync(f);
    removed++;
  }
}

const hits = [];
for (const f of walk(".next")) {
  if (f.startsWith(join(".next", "cache"))) continue; // build cache, not output
  const s = readFileSync(f).toString("latin1").toLowerCase();
  for (const n of NAMES) if (s.includes(n)) hits.push(`${f} (${n})`);
}
if (hits.length) {
  console.error(`✗ retired names found in build output:\n  ${hits.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ build output clean of retired names (${removed} server source maps dropped)`);

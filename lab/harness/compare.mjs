#!/usr/bin/env node
/** node lab/harness/compare.mjs <labelA> <labelB> [responsive|l10n]  — per-case delta between two judged runs; flags regressions. */
import fs from "node:fs";

const [A, B, kind = "responsive"] = process.argv.slice(2);
const file = (l) => `lab/results/${l}/${kind === "l10n" ? "l10n-summary" : "summary"}.json`;
const a = JSON.parse(fs.readFileSync(file(A), "utf8")), b = JSON.parse(fs.readFileSync(file(B), "utf8"));
const key = (r) => (kind === "l10n" ? `${r.id}/${r.lang}` : r.id);
const num = (x) => (typeof x === "string" ? +x.split("/")[0] : x);
let regress = 0, better = 0, same = 0;
console.log(kind === "l10n" ? "case               | crit  major minor" : "case             | critVP        sweepBad      tapMajor  tiny");
for (const rb of b) {
  const ra = a.find((r) => key(r) === key(rb)); if (!ra) { console.log(key(rb).padEnd(18), "(new in B)"); continue; }
  const dims = kind === "l10n" ? ["crit", "major", "minor"] : ["crit", "sweepBad", "tapMajor", "tiny"];
  const d = dims.map((k) => [num(ra[k]), num(rb[k])]);
  const worse = d.some(([x, y], i) => i < (kind === "l10n" ? 2 : 2) && y > x), improved = d.some(([x, y], i) => i < 2 && y < x);
  if (worse) regress++; else if (improved) better++; else same++;
  console.log(key(rb).padEnd(18), "|", d.map(([x, y]) => `${x}→${y}`.padEnd(13)).join(""), worse ? "  REGRESSION" : improved ? "  improved" : "");
}
console.log(`\n${better} improved, ${same} unchanged, ${regress} regressed`);

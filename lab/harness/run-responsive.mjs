#!/usr/bin/env node
/**
 * Run the independent responsive judge over lab cases and store results under lab/results/<label>/.
 *   node lab/harness/run-responsive.mjs --label v1-after [--split dev|heldout|all] [--only r01-hero,r02-nav] [--quick]
 * Also prints a compact table; use compare.mjs to diff two labels.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const a = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, all) => (v.startsWith("--") ? [...acc, [v.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? true : all[i + 1]]] : acc), []));
const label = a.label || "adhoc", split = a.split || "dev", base = a.base || "http://localhost:4173/responsive";
const manifest = JSON.parse(fs.readFileSync("lab/manifest.json", "utf8"));
let cases = manifest.responsive.filter((c) => (split === "all" && c.split !== "real") || c.split === split);
if (a.only) cases = cases.filter((c) => String(a.only).split(",").includes(c.id));
const rows = [];
for (const c of cases) {
  const out = `lab/results/${label}/${c.id}`;
  const r = spawnSync("node", ["lab/harness/check-responsive.mjs", "--url", c.url || `${base}/${c.id}/`, "--id", c.id, "--out", out, ...(a.quick ? ["--quick"] : [])], { encoding: "utf8" });
  if (r.status !== 0) { console.log(`${c.id}: HARNESS ERROR ${r.stderr.slice(0, 200)}`); continue; }
  const s = JSON.parse(fs.readFileSync(`${out}/report.json`, "utf8")).summary;
  rows.push({ id: c.id, split: c.split, crit: `${s.criticalViewports}/${s.totalViewports}`, sweepBad: `${s.sweepFailingWidths}/${s.sweepTotalWidths}`, tapMajor: s.tapMajorTotal, tiny: s.tinyTextViewports, fixedCover: s.fixedCoverViewports, errors: s.consoleErrors.length });
}
fs.mkdirSync(`lab/results/${label}`, { recursive: true });
fs.writeFileSync(`lab/results/${label}/summary.json`, JSON.stringify(rows, null, 1));
console.log(`\n== ${label} (${split}) ==`);
console.log("case".padEnd(16), "critVP".padEnd(8), "sweepBad".padEnd(9), "tapMajor".padEnd(9), "tiny".padEnd(5), "fixCov".padEnd(7), "err");
for (const r of rows) console.log(r.id.padEnd(16), r.crit.padEnd(8), r.sweepBad.padEnd(9), String(r.tapMajor).padEnd(9), String(r.tiny).padEnd(5), String(r.fixedCover).padEnd(7), r.errors);

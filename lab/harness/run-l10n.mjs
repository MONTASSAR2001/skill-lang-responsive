#!/usr/bin/env node
/** node lab/harness/run-l10n.mjs --label v1-run [--split dev|heldout|real|all] [--only l01-marketing,l05-dynamic] */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const a = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, all) => (v.startsWith("--") ? [...acc, [v.slice(2), all[i + 1]]] : acc), []));
const label = a.label || "adhoc", split = a.split || "dev";
const man = JSON.parse(fs.readFileSync("lab/manifest-l10n.json", "utf8"));
let cases = man.cases.filter((c) => (split === "all" && c.split !== "real") || c.split === split);
if (a.only) cases = cases.filter((c) => a.only.split(",").includes(c.id));
const rows = [];
for (const c of cases) for (const lang of c.langs) {
  const out = `lab/results/${label}/${c.id}-${lang}`;
  const r = spawnSync("node", ["lab/harness/check-l10n.mjs", "--id", c.id, "--lang", lang, "--out", out, ...(a.base ? ["--base", a.base] : [])], { encoding: "utf8" });
  if (!fs.existsSync(`${out}/report.json`)) { rows.push({ id: c.id, lang, crit: "ERR", major: "-", minor: "-", top: r.stderr.slice(0, 80) }); continue; }
  const rep = JSON.parse(fs.readFileSync(`${out}/report.json`, "utf8"));
  rows.push({ id: c.id, lang, crit: rep.critical.length, major: rep.major.length, minor: rep.minor.length, top: [...rep.critical, ...rep.major].slice(0, 4).map((x) => x.code).join(", ") });
}
fs.mkdirSync(`lab/results/${label}`, { recursive: true });
fs.writeFileSync(`lab/results/${label}/l10n-summary.json`, JSON.stringify(rows, null, 1));
console.log(`\n== l10n ${label} (${split}) ==\ncase               lang  crit major minor  top findings`);
for (const r of rows) console.log(r.id.padEnd(18), r.lang.padEnd(5), String(r.crit).padEnd(5), String(r.major).padEnd(5), String(r.minor).padEnd(5), r.top);

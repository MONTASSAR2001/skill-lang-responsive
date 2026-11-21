#!/usr/bin/env node
/**
 * Test runner. Executes each test module in its own process, parses the PASS/FAIL/SKIP lines and prints a summary.
 *   node tests/run.mjs              everything that can run here
 *   node tests/run.mjs --static     validators + installer (no browser, no Claude CLI)
 *   node tests/run.mjs --browser    browser tests only
 *   node tests/run.mjs --claude     Claude Code plugin tests only
 *   node tests/run.mjs --gemini     Gemini CLI discovery tests only
 *   --strict                        a SKIP counts as a failure (used in CI, where nothing may be silently skipped)
 *   --json <file>                   also write the full report as JSON
 * Exit code 1 if any check FAILED (or SKIPPED with --strict).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const GROUPS = {
  static: ["validate-skills", "validate-plugins", "validate-scripts", "test-installer"],
  browser: ["test-browser"],
  claude: ["test-claude"],
  gemini: ["test-gemini"],
};
const selected = flag("--static") ? GROUPS.static : flag("--browser") ? GROUPS.browser : flag("--claude") ? GROUPS.claude : flag("--gemini") ? GROUPS.gemini : [...GROUPS.static, ...GROUPS.browser, ...GROUPS.claude, ...GROUPS.gemini];

const results = []; let allOut = "";
for (const name of selected) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(HERE, name + ".mjs")], { encoding: "utf8", timeout: 20 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
  const lines = (r.stdout || "").split(/\r?\n/);
  const checks = lines.filter((l) => /^(PASS|FAIL|SKIP) /.test(l));
  const crashed = r.status !== 0 && !checks.some((c) => c.startsWith("FAIL")) ? (r.stderr || "crashed").split("\n").slice(0, 6).join(" | ") : null;
  results.push({ name, status: r.status, ms: Date.now() - t0, pass: checks.filter((c) => c.startsWith("PASS")).length, fail: checks.filter((c) => c.startsWith("FAIL")).length, skip: checks.filter((c) => c.startsWith("SKIP")).length, crashed, checks });
  allOut += (r.stdout || "") + (r.stderr || "");
}
const totals = results.reduce((a, r) => ({ pass: a.pass + r.pass, fail: a.fail + r.fail + (r.crashed ? 1 : 0), skip: a.skip + r.skip }), { pass: 0, fail: 0, skip: 0 });

for (const r of results) for (const c of r.checks) if (c.startsWith("FAIL") || c.startsWith("SKIP")) console.log(c);
for (const r of results) if (r.crashed) console.log(`FAIL ${r.name} :: test module crashed -- ${r.crashed}`);
console.log("\nsuite              pass  fail  skip   time");
for (const r of results) console.log(r.name.padEnd(18), String(r.pass).padStart(4), String(r.fail + (r.crashed ? 1 : 0)).padStart(5), String(r.skip).padStart(5), (r.ms / 1000).toFixed(1).padStart(6) + "s");
console.log("-".repeat(46));
console.log("TOTAL".padEnd(18), String(totals.pass).padStart(4), String(totals.fail).padStart(5), String(totals.skip).padStart(5));
const jsonIdx = argv.indexOf("--json");
if (jsonIdx >= 0) fs.writeFileSync(argv[jsonIdx + 1], JSON.stringify({ node: process.version, platform: process.platform, totals, results }, null, 2));
const bad = totals.fail > 0 || (flag("--strict") && totals.skip > 0);
console.log(bad ? "\nRESULT: FAILED" : totals.skip ? "\nRESULT: passed (with skipped checks listed above; nothing skipped counts as a pass)" : "\nRESULT: passed");
process.exit(bad ? 1 : 0);

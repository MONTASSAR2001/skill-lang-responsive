#!/usr/bin/env node
// Restore pristine baselines so a skill version can be run again from the same starting point.
//   node lab/tools/reset.mjs responsive [r01-hero r02-nav …]    (no ids = every case)
//   node lab/tools/reset.mjs l10n [l01-marketing …]
import fs from "node:fs";
import path from "node:path";

const [kind, ...ids] = process.argv.slice(2);
if (!["responsive", "l10n"].includes(kind)) { console.error("usage: reset.mjs <responsive|l10n> [caseId…]"); process.exit(2); }
const src = path.resolve("lab/baseline", kind), dst = path.resolve("lab", kind);
const list = ids.length ? ids : fs.readdirSync(src).filter((d) => fs.statSync(path.join(src, d)).isDirectory());
for (const id of list) {
  fs.rmSync(path.join(dst, id), { recursive: true, force: true });
  fs.cpSync(path.join(src, id), path.join(dst, id), { recursive: true });
  console.log(`reset ${kind}/${id}`);
}

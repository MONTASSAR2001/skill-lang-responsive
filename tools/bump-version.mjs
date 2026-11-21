#!/usr/bin/env node
/**
 * Bump the single project version everywhere, then regenerate the plugin payloads.
 *   node tools/bump-version.mjs <patch|minor|major|X.Y.Z> [--dry-run]
 * Updates: package.json, metadata.version in every SKILL.md under skills/, then runs tools/sync-plugins.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [arg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const dry = process.argv.includes("--dry-run");
if (!arg) { console.error("usage: bump-version.mjs <patch|minor|major|X.Y.Z> [--dry-run]"); process.exit(2); }

const pkgFile = path.join(ROOT, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
const [maj, min, pat] = pkg.version.split(".").map(Number);
const next = /^\d+\.\d+\.\d+$/.test(arg) ? arg : { major: `${maj + 1}.0.0`, minor: `${maj}.${min + 1}.0`, patch: `${maj}.${min}.${pat + 1}` }[arg];
if (!next) { console.error(`not a bump type or version: ${arg}`); process.exit(2); }
console.log(`${pkg.version} -> ${next}${dry ? " (dry run)" : ""}`);
if (dry) process.exit(0);

pkg.version = next;
fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n");
for (const s of fs.readdirSync(path.join(ROOT, "skills"))) {
  const f = path.join(ROOT, "skills", s, "SKILL.md");
  if (!fs.existsSync(f)) continue;
  const txt = fs.readFileSync(f, "utf8");
  if (!/(version: ")[^"]+/.test(txt)) { console.error(`no metadata.version in ${f}`); process.exit(1); }
  fs.writeFileSync(f, txt.replace(/(version: ")[^"]+/, `$1${next}`));
}
const r = spawnSync(process.execPath, [path.join(ROOT, "tools", "sync-plugins.mjs")], { stdio: "inherit" });
process.exit(r.status ?? 1);

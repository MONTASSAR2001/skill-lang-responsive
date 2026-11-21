// Validates the generated Claude Code plugin payloads and the marketplace manifest (structure + sync with skills/ + official validator).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { suite, ROOT, pkg, skillNames, sameTree, which, run, mktemp } from "./lib.mjs";
import { build, diffAgainst } from "../tools/sync-plugins.mjs";

const t = suite("plugins");
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const RESERVED_PREFIX = /^(claude-|anthropic-|anthropics-|cc-plugin-)/;

const mpFile = path.join(ROOT, ".claude-plugin", "marketplace.json");
if (!t.check("marketplace.json exists at .claude-plugin/marketplace.json", fs.existsSync(mpFile))) t.finish();
let mp;
try { mp = readJson(mpFile); t.check("marketplace.json is valid JSON", true); } catch (e) { t.check("marketplace.json is valid JSON", false, e.message); t.finish(); }

t.check("marketplace name is valid and not reserved", NAME_RE.test(mp.name || "") && !RESERVED_PREFIX.test(mp.name || ""), mp.name);
t.check("marketplace has owner.name", !!(mp.owner && mp.owner.name));
t.check("marketplace lists plugins", Array.isArray(mp.plugins) && mp.plugins.length >= 1);
t.check("marketplace version matches package.json", mp.metadata && mp.metadata.version === pkg.version);

const canonical = skillNames();
for (const entry of mp.plugins || []) {
  const p = (w) => `${entry.name}: ${w}`;
  t.check(p("name valid and not reserved"), NAME_RE.test(entry.name || "") && !RESERVED_PREFIX.test(entry.name || ""));
  t.check(p("source is a relative path starting with ./ and without .."), typeof entry.source === "string" && entry.source.startsWith("./") && !entry.source.includes(".."), String(entry.source));
  const dir = path.resolve(ROOT, entry.source || "x");
  if (!t.check(p("source directory exists"), fs.existsSync(dir))) continue;
  const mf = path.join(dir, ".claude-plugin", "plugin.json");
  if (!t.check(p("plugin.json exists in .claude-plugin/"), fs.existsSync(mf))) continue;
  const m = readJson(mf);
  t.check(p("manifest name equals marketplace entry name"), m.name === entry.name, `${m.name} vs ${entry.name}`);
  t.check(p("version equals package.json"), m.version === pkg.version && entry.version === pkg.version, `${m.version}/${entry.version} vs ${pkg.version}`);
  t.check(p("description, author, license, repository present"), !!(m.description && m.author && m.author.name && m.license === "MIT" && m.repository));
  const inside = fs.readdirSync(path.join(dir, ".claude-plugin"));
  t.check(p("only plugin.json lives inside .claude-plugin/"), inside.length === 1 && inside[0] === "plugin.json", inside.join(", "));
  t.check(p("LICENSE and README present"), fs.existsSync(path.join(dir, "LICENSE")) && fs.existsSync(path.join(dir, "README.md")));
  const skillsDir = path.join(dir, "skills");
  const inPlugin = fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir) : [];
  t.check(p("skills/ at plugin root contains at least one skill"), inPlugin.length >= 1);
  for (const s of inPlugin) {
    t.check(p(`skill ${s} exists in the canonical skills/`), canonical.includes(s));
    t.check(p(`skill ${s} is byte-identical to skills/${s} (single source of truth)`), canonical.includes(s) && sameTree(path.join(skillsDir, s), path.join(ROOT, "skills", s)));
  }
}
t.check("both skills are shipped by the combined plugin", (() => { const e = (mp.plugins || []).find((x) => x.name === "responsive-localization"); if (!e) return false; const d = path.join(ROOT, e.source, "skills"); return canonical.every((s) => fs.existsSync(path.join(d, s, "SKILL.md"))); })());
t.check("each skill is also available as its own plugin", canonical.every((s) => (mp.plugins || []).some((x) => x.name === s)));

// regeneration must reproduce exactly what is committed
{
  const tmp = mktemp("slr-sync-");
  try { build(tmp); const problems = diffAgainst(tmp); t.check("plugins/ and marketplace.json equal a fresh `npm run sync`", problems.length === 0, problems.slice(0, 5).join("; ")); }
  finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// official validator, when the Claude CLI is installed
const claude = which("claude");
if (!claude) t.skip("claude plugin validate (marketplace + every plugin)", "claude CLI not found on PATH");
else {
  const v = run("claude", ["plugin", "validate", ROOT]);
  t.check("claude plugin validate <marketplace>", v.status === 0, (v.stdout + v.stderr).slice(-300));
  for (const entry of mp.plugins || []) { const r = run("claude", ["plugin", "validate", path.resolve(ROOT, entry.source)]); t.check(`claude plugin validate ${entry.name}`, r.status === 0, (r.stdout + r.stderr).slice(-300)); }
}
t.finish();

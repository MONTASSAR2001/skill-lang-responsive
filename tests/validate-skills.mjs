// Validates each skill against the Agent Skills specification (https://agentskills.io/specification) as read on 2026-11-21.
// NOTE: this is our own implementation of the spec's published rules; the official `skills-ref` validator could not be installed
// in the environment where this was written (not on PyPI), so run it too if you can: `skills-ref validate skills/<name>`.
import fs from "node:fs";
import path from "node:path";
import { suite, SKILLS_DIR, ROOT, pkg, skillNames, listFiles } from "./lib.mjs";

const t = suite("skills");
const ALLOWED = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);

/** minimal YAML subset: `key: value`, quoted scalars, and one level of `key:` + indented `k: v` map */
export function parseFrontmatter(text) {
  const m = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return null;
  const out = {}; let map = null;
  for (const raw of m[1].split("\n")) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const ind = /^\s+/.test(raw);
    const kv = raw.trim().match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) return { __error: "unparseable line: " + raw };
    const val = kv[2].replace(/^(['"])(.*)\1$/, "$2");
    if (ind && map) out[map][kv[1]] = val;
    else if (kv[2] === "") { out[kv[1]] = {}; map = kv[1]; }
    else { out[kv[1]] = val; map = null; }
  }
  return { fm: out, body: text.slice(m[0].length) };
}

const names = skillNames();
t.check("at least one skill exists", names.length >= 2, `found ${names.join(", ")}`);
t.check("LICENSE file exists at the repository root", fs.existsSync(path.join(ROOT, "LICENSE")));

for (const name of names) {
  const dir = path.join(SKILLS_DIR, name), f = path.join(dir, "SKILL.md");
  const p = (what) => `${name}: ${what}`;
  if (!t.check(p("SKILL.md exists"), fs.existsSync(f))) continue;
  const parsed = parseFrontmatter(fs.readFileSync(f, "utf8"));
  if (!t.check(p("frontmatter parses"), parsed && !parsed.__error, parsed && parsed.__error)) continue;
  const { fm, body } = parsed;
  t.check(p("name present"), typeof fm.name === "string" && fm.name.length > 0);
  t.check(p("name is 1-64 chars"), fm.name && fm.name.length >= 1 && fm.name.length <= 64, fm.name);
  t.check(p("name uses only lowercase a-z, 0-9 and single hyphens, not starting/ending with one"), /^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.name || ""), fm.name);
  t.check(p("name matches the directory name"), fm.name === name, `${fm.name} vs ${name}`);
  t.check(p("description is 1-1024 chars"), typeof fm.description === "string" && fm.description.length >= 1 && fm.description.length <= 1024, `len ${fm.description && fm.description.length}`);
  t.check(p("description says when to use it"), /\buse when\b|\bwhen (asked|the user)\b/i.test(fm.description || ""), "no 'Use when ...' trigger found");
  if ("compatibility" in fm) t.check(p("compatibility is 1-500 chars"), typeof fm.compatibility === "string" && fm.compatibility.length >= 1 && fm.compatibility.length <= 500, `len ${fm.compatibility.length}`);
  t.check(p("license declared"), typeof fm.license === "string" && fm.license.length > 0);
  t.check(p("metadata is a string->string map"), fm.metadata && typeof fm.metadata === "object" && Object.values(fm.metadata).every((v) => typeof v === "string"));
  t.check(p("metadata.version matches package.json"), fm.metadata && fm.metadata.version === pkg.version, `${fm.metadata && fm.metadata.version} vs ${pkg.version}`);
  const unknown = Object.keys(fm).filter((k) => !ALLOWED.has(k));
  t.check(p("no frontmatter fields outside the spec"), unknown.length === 0, unknown.join(", "));
  const lines = body.split("\n").length;
  t.check(p("SKILL.md body under 500 lines"), lines < 500, `${lines} lines`);
  t.check(p("SKILL.md body under ~5000 tokens (chars/4 estimate)"), body.length / 4 < 5000, `~${Math.round(body.length / 4)} tokens`);

  // references: every relative link and every `references/...` / `scripts/...` mention must exist
  const all = listFiles(dir);
  const mdFiles = all.filter((x) => x.endsWith(".md"));
  const broken = [];
  for (const mf of mdFiles) {
    const txt = fs.readFileSync(path.join(dir, mf), "utf8");
    for (const m of txt.matchAll(/\]\((?!https?:|#|mailto:)([^)\s#]+)(?:#[^)]*)?\)/g)) if (!fs.existsSync(path.resolve(path.dirname(path.join(dir, mf)), m[1]))) broken.push(`${mf} -> ${m[1]}`);
    for (const m of txt.matchAll(/`((?:references|scripts)\/[A-Za-z0-9._\/-]+\.(?:md|mjs|json|py|sh))`/g)) if (!fs.existsSync(path.join(dir, m[1]))) broken.push(`${mf} mentions ${m[1]}`);
  }
  t.check(p("no broken internal links or file mentions"), broken.length === 0, broken.join("; "));
  t.check(p("references/ is one level deep"), !all.some((x) => /^references\/[^/]+\//.test(x)), "nested directory under references/");
  t.check(p("every script is referenced from SKILL.md"), all.filter((x) => x.startsWith("scripts/")).every((s) => body.includes(path.basename(s))), "unreferenced script");

  // portability
  const allText = mdFiles.concat(all.filter((x) => x.startsWith("scripts/"))).map((x) => fs.readFileSync(path.join(dir, x), "utf8")).join("\n");
  t.check(p("no hardcoded absolute user paths"), !/\/home\/\w+|\/Users\/\w+|[A-Z]:\\Users\\/.test(allText), "found a home-directory path");
  t.check(p("no unresolved <skill> placeholder (use <skill-dir>)"), !/<skill>\//.test(allText));
  t.check(p("no Claude-Code-only variables required"), !/\$\{CLAUDE_(PLUGIN|SKILL|PROJECT)/.test(allText), "uses ${CLAUDE_*}");
  t.check(p("documents how to locate scripts and the Playwright requirement"), /<skill-dir>/.test(body) && /Playwright/.test(body));
}
t.finish();

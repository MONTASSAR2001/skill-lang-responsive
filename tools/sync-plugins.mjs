#!/usr/bin/env node
/**
 * Single source of truth: skills/ (the Agent Skills core).
 * This tool GENERATES everything Claude Code needs from it:
 *   plugins/<plugin>/.claude-plugin/plugin.json, plugins/<plugin>/skills/<skill>/..., LICENSE, README.md
 *   .claude-plugin/marketplace.json
 * Versions come from package.json. Never edit generated files by hand.
 *
 *   node tools/sync-plugins.mjs           regenerate
 *   node tools/sync-plugins.mjs --check   fail (exit 1) if committed output differs from what would be generated
 *
 * Why copies and not symlinks: symlinks are skipped or broken in Windows checkouts without developer mode, and a
 * silently empty plugin is worse than a generated, CI-verified copy.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const REPO = "https://github.com/MONTASSAR2001/skill-lang-responsive";
const AUTHOR = { name: "MONTASSAR2001", url: "https://github.com/MONTASSAR2001" };
const MARKETPLACE = "skill-lang-responsive";

const SKILL_BLURB = {
  "universal-responsive-design": "browser-measured responsive audits and fixes with a before/after regression gate",
  "smart-website-localization": "context-aware website localization (French, Arabic/RTL) with glossary, SEO/a11y text, hreflang and a layout-fallout verifier",
};
const PLUGINS = [
  { name: "responsive-localization", skills: ["universal-responsive-design", "smart-website-localization"], tags: ["responsive", "localization", "i18n", "rtl", "playwright"],
    description: "Two Agent Skills in one plugin: universal-responsive-design (" + SKILL_BLURB["universal-responsive-design"] + ") and smart-website-localization (" + SKILL_BLURB["smart-website-localization"] + ")." },
  { name: "universal-responsive-design", skills: ["universal-responsive-design"], tags: ["responsive", "css", "playwright", "audit"],
    description: "Agent Skill: " + SKILL_BLURB["universal-responsive-design"] + "." },
  { name: "smart-website-localization", skills: ["smart-website-localization"], tags: ["localization", "i18n", "rtl", "arabic", "french"],
    description: "Agent Skill: " + SKILL_BLURB["smart-website-localization"] + "." },
];

const json = (o) => JSON.stringify(o, null, 2) + "\n";

function pluginReadme(p) {
  return `# ${p.name}

Generated Claude Code plugin payload of [${MARKETPLACE}](${REPO}). **Do not edit here**: edit \`skills/\` in the repository root and run \`npm run sync\`.

Contains: ${p.skills.map((s) => "`" + s + "`").join(", ")}.

Install:

\`\`\`bash
claude plugin marketplace add MONTASSAR2001/skill-lang-responsive
claude plugin install ${p.name}@${MARKETPLACE}
\`\`\`

Invoke (namespaced by the plugin): ${p.skills.map((s) => "`/" + p.name + ":" + s + "`").join(", ")}.
The bundled scripts need Node.js 18+ and Playwright with Chromium (\`npm i -D playwright && npx playwright install chromium\`).
Licensed under MIT, see LICENSE.
`;
}

/** Build the expected tree into outRoot (a directory that contains plugins/ and .claude-plugin/). */
export function build(outRoot) {
  const plugins = path.join(outRoot, "plugins");
  fs.mkdirSync(plugins, { recursive: true });
  for (const p of PLUGINS) {
    const dir = path.join(plugins, p.name);
    fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
    for (const s of p.skills) fs.cpSync(path.join(ROOT, "skills", s), path.join(dir, "skills", s), { recursive: true });
    fs.copyFileSync(path.join(ROOT, "LICENSE"), path.join(dir, "LICENSE"));
    fs.writeFileSync(path.join(dir, "README.md"), pluginReadme(p));
    fs.writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), json({
      name: p.name, version: pkg.version, description: p.description, author: AUTHOR,
      homepage: REPO + "#readme", repository: REPO, license: "MIT",
      keywords: ["agent-skills", ...p.tags],
    }));
  }
  fs.mkdirSync(path.join(outRoot, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(outRoot, ".claude-plugin", "marketplace.json"), json({
    name: MARKETPLACE,
    owner: AUTHOR,
    metadata: { description: "Browser-measured responsive design and context-aware website localization as portable Agent Skills.", version: pkg.version },
    plugins: PLUGINS.map((p) => ({ name: p.name, source: "./plugins/" + p.name, description: p.description, version: pkg.version, category: "development", tags: ["agent-skills", ...p.tags] })),
  }));
}

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listFiles(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name)).split(path.sep).join("/")]));
}
const hash = (f) => crypto.createHash("sha256").update(fs.readFileSync(f).toString("utf8").replace(/\r\n/g, "\n")).digest("hex");

export function diffAgainst(expectedRoot) {
  const problems = [];
  const pairs = [["plugins", path.join(ROOT, "plugins"), path.join(expectedRoot, "plugins")], [".claude-plugin", path.join(ROOT, ".claude-plugin"), path.join(expectedRoot, ".claude-plugin")]];
  for (const [label, actualDir, expectDir] of pairs) {
    const a = new Set(listFiles(actualDir)), e = new Set(listFiles(expectDir));
    for (const f of e) if (!a.has(f)) problems.push(`missing: ${label}/${f}`); else if (hash(path.join(actualDir, f)) !== hash(path.join(expectDir, f))) problems.push(`differs: ${label}/${f}`);
    for (const f of a) if (!e.has(f)) problems.push(`unexpected: ${label}/${f}`);
  }
  return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--check")) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sync-check-"));
    try {
      build(tmp);
      const problems = diffAgainst(tmp);
      if (problems.length) { console.error("Generated plugin files are out of date with skills/ or package.json:\n  " + problems.slice(0, 20).join("\n  ") + "\nRun: npm run sync"); process.exit(1); }
      console.log("plugins/ and .claude-plugin/marketplace.json are in sync with skills/ (" + PLUGINS.length + " plugins, version " + pkg.version + ")");
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  } else {
    for (const p of PLUGINS) { const dir = path.join(ROOT, "plugins", p.name); if (path.relative(ROOT, dir).startsWith("..")) throw new Error("refusing to touch " + dir); fs.rmSync(dir, { recursive: true, force: true }); }
    build(ROOT);
    console.log("generated " + PLUGINS.length + " plugins + marketplace.json from skills/ (version " + pkg.version + ")");
  }
}

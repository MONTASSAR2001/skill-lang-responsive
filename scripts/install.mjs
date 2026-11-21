#!/usr/bin/env node
/**
 * Cross-platform installer for the two Agent Skills. No dependencies (Node >= 18).
 * It copies (or symlinks) skills/<name> to the directory where the chosen tool discovers skills.
 *
 *   node scripts/install.mjs --target <name|all> [--scope user|project] [--skill <name>] [--mode copy|link]
 *                            [--project-dir <dir>] [--dest <dir>] [--dry-run] [--uninstall] [--list]
 *
 * Targets and their directories come from each vendor's documentation (see docs/compatibility.md):
 *   claude        user ~/.claude/skills            project <p>/.claude/skills
 *   agents        user ~/.agents/skills            project <p>/.agents/skills      (shared convention)
 *   cursor        user ~/.cursor/skills            project <p>/.cursor/skills
 *   vscode        user ~/.copilot/skills           project <p>/.github/skills      (GitHub Copilot in VS Code)
 *   codex         user ~/.agents/skills            project <p>/.agents/skills
 *   antigravity   user ~/.gemini/config/skills     project <p>/.agents/skills
 *   gemini        user ~/.gemini/skills            project <p>/.gemini/skills       (Gemini CLI; verified by running `gemini skills`)
 * Claude Code users should prefer the plugin marketplace (docs/install/claude-code.md).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_SRC = path.resolve(HERE, "..", "skills");

export const TARGETS = {
  claude: { user: [".claude", "skills"], project: [".claude", "skills"] },
  agents: { user: [".agents", "skills"], project: [".agents", "skills"] },
  cursor: { user: [".cursor", "skills"], project: [".cursor", "skills"] },
  vscode: { user: [".copilot", "skills"], project: [".github", "skills"] },
  codex: { user: [".agents", "skills"], project: [".agents", "skills"] },
  antigravity: { user: [".gemini", "config", "skills"], project: [".agents", "skills"] },
  gemini: { user: [".gemini", "skills"], project: [".gemini", "skills"] },
};

function parseArgs(argv) {
  const a = { flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith("--")) continue;
    const k = t.slice(2);
    if (["dry-run", "uninstall", "list", "help"].includes(k)) a.flags.add(k);
    else a[k] = argv[++i];
  }
  return a;
}

export function availableSkills() {
  return fs.readdirSync(SKILLS_SRC, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(SKILLS_SRC, d.name, "SKILL.md"))).map((d) => d.name);
}

export function destinationFor(target, scope, projectDir, home = os.homedir()) {
  const t = TARGETS[target];
  if (!t) throw new Error(`unknown target "${target}" (choose: ${Object.keys(TARGETS).join(", ")}, all)`);
  const base = scope === "project" ? path.resolve(projectDir || process.cwd()) : home;
  return path.join(base, ...t[scope]);
}

const isSkillDir = (d) => fs.existsSync(path.join(d, "SKILL.md"));

/** Install one skill into destRoot. Returns a short status string. Never deletes anything that is not a skill directory. */
export function installOne(skill, destRoot, { mode = "copy", dryRun = false } = {}) {
  const src = path.join(SKILLS_SRC, skill), dst = path.join(destRoot, skill);
  let existed = false;
  if (fs.existsSync(dst) || isSymlink(dst)) {
    existed = true;
    if (!isSymlink(dst) && !isSkillDir(dst)) throw new Error(`refusing to overwrite ${dst}: it exists and is not a skill directory`);
  }
  if (dryRun) return `${existed ? "would replace" : "would install"} ${dst} (${mode})`;
  fs.mkdirSync(destRoot, { recursive: true });
  if (existed) fs.rmSync(dst, { recursive: true, force: true });
  if (mode === "link") {
    try { fs.symlinkSync(src, dst, process.platform === "win32" ? "junction" : "dir"); return `linked ${dst} -> ${src}`; }
    catch (e) { console.warn(`  symlink failed (${e.code}); falling back to copy`); }
  }
  fs.cpSync(src, dst, { recursive: true });
  return `${existed ? "updated" : "installed"} ${dst}`;
}

export function uninstallOne(skill, destRoot, { dryRun = false } = {}) {
  const dst = path.join(destRoot, skill);
  if (!fs.existsSync(dst) && !isSymlink(dst)) return `not installed: ${dst}`;
  if (!isSymlink(dst) && !isSkillDir(dst)) throw new Error(`refusing to remove ${dst}: not a skill directory`);
  if (dryRun) return `would remove ${dst}`;
  fs.rmSync(dst, { recursive: true, force: true });
  return `removed ${dst}`;
}

function isSymlink(p) { try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; } }

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.flags.has("help") || (!a.target && !a.flags.has("list"))) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0].replace(/^[\s\S]*?\/\*\*\n/, "").replace(/^ \* ?/gm, ""));
    process.exit(a.flags.has("help") ? 0 : 2);
  }
  const all = availableSkills();
  if (a.flags.has("list")) { console.log(all.join("\n")); return; }
  const scope = a.scope || "user";
  if (!["user", "project"].includes(scope)) { console.error('--scope must be "user" or "project"'); process.exit(2); }
  const mode = a.mode || "copy";
  if (!["copy", "link"].includes(mode)) { console.error('--mode must be "copy" or "link"'); process.exit(2); }
  const skills = a.skill ? a.skill.split(",") : all;
  for (const s of skills) if (!all.includes(s)) { console.error(`unknown skill "${s}" (available: ${all.join(", ")})`); process.exit(2); }
  let targets;
  try { targets = a.target === "all" ? Object.keys(TARGETS) : a.target.split(","); for (const t of targets) destinationFor(t, scope, a["project-dir"]); }
  catch (e) { console.error(e.message); process.exit(2); }
  // several targets can share a directory (agents/codex); do each directory once
  const done = new Set();
  for (const t of targets) {
    const dest = a.dest ? path.resolve(a.dest) : destinationFor(t, scope, a["project-dir"]);
    if (done.has(dest)) { console.log(`[${t}] ${dest} already handled`); continue; }
    done.add(dest);
    for (const s of skills) {
      try { console.log(`[${t}] ` + (a.flags.has("uninstall") ? uninstallOne(s, dest, { dryRun: a.flags.has("dry-run") }) : installOne(s, dest, { mode, dryRun: a.flags.has("dry-run") }))); }
      catch (e) { console.error(`[${t}] ERROR: ${e.message}`); process.exitCode = 1; }
    }
  }
  if (!a.flags.has("uninstall") && !a.flags.has("dry-run")) console.log("Done. Restart or reload your agent so it re-scans skills. The scripts need Node 18+ and Playwright (npm i -D playwright && npx playwright install chromium).");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

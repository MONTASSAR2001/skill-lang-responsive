// Real Claude Code plugin installation, in an isolated HOME (your real ~/.claude is never touched).
// Local mode (default): marketplace added from this checkout.  Remote mode (TEST_REMOTE=1): from GitHub, as users do.
import fs from "node:fs";
import path from "node:path";
import { suite, ROOT, pkg, skillNames, which, run, mktemp } from "./lib.mjs";

const t = suite("claude-code");
const claude = which("claude");
if (!claude) { t.skip("all Claude Code plugin tests", "claude CLI not found on PATH"); t.finish(); }
const ver = run("claude", ["--version"]).stdout.trim();
console.log(`# using ${ver}`);

const MARKET = "skill-lang-responsive";
const source = process.env.TEST_REMOTE === "1" ? "MONTASSAR2001/skill-lang-responsive" : ROOT;
const label = process.env.TEST_REMOTE === "1" ? "from GitHub" : "from the local checkout";
const skills = skillNames();

const home = mktemp("slr-claude-home-");
const env = { HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: path.join(home, ".claude") };
const cl = (args) => run("claude", args, { env, timeout: 240000 });

let r = cl(["plugin", "marketplace", "add", source]);
t.check(`marketplace add ${label}`, r.status === 0 && new RegExp(MARKET).test(r.stdout + r.stderr), (r.stdout + r.stderr).slice(-250));
r = cl(["plugin", "marketplace", "list"]);
t.check("marketplace is listed under the expected identifier", new RegExp(MARKET).test(r.stdout + r.stderr), r.stdout.slice(-200));

for (const [plugin, expected] of [["responsive-localization", skills], ["universal-responsive-design", ["universal-responsive-design"]], ["smart-website-localization", ["smart-website-localization"]]]) {
  const id = `${plugin}@${MARKET}`;
  r = cl(["plugin", "install", id]);
  t.check(`install ${id}`, r.status === 0 && /Successfully installed/.test(r.stdout + r.stderr), (r.stdout + r.stderr).slice(-250));
  if (process.env.TEST_REMOTE === "1" && plugin === "responsive-localization") {
    // installed from GitHub the plugin is copied into Claude's cache: every bundled script must be present there
    const found = new Set(); const stack = [path.join(home, ".claude")];
    while (stack.length) { const d = stack.pop(); if (!fs.existsSync(d)) continue; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) stack.push(p); else if (["audit.mjs", "verify.mjs", "extract-strings.mjs"].includes(e.name)) found.add(e.name); } }
    t.check("GitHub install: audit.mjs, verify.mjs and extract-strings.mjs are present in Claude's plugin cache", found.size === 3, [...found].join(","));
  }
  r = cl(["plugin", "details", id]);
  const inv = (r.stdout.match(/Skills \((\d+)\)\s+([^\n]+)/) || []);
  const found = (inv[2] || "").split(",").map((x) => x.trim()).filter(Boolean).sort();
  t.check(`${id}: Claude Code discovers exactly ${expected.length} skill(s): ${expected.join(", ")}`, found.join() === [...expected].sort().join(), `found [${found.join(", ")}]`);
  r = cl(["plugin", "list"]);
  t.check(`${id}: shows as installed, enabled, version ${pkg.version}`, new RegExp(plugin + "@" + MARKET + "[\\s\\S]{0,200}Version: " + pkg.version.replace(/\./g, "\\.") + "[\\s\\S]{0,500}enabled").test(r.stdout), r.stdout.slice(0, 300));
  r = cl(["plugin", "uninstall", id]);
  t.check(`uninstall ${id}`, r.status === 0, (r.stdout + r.stderr).slice(-200));
}
r = cl(["plugin", "marketplace", "remove", MARKET]);
t.check("marketplace remove", r.status === 0, (r.stdout + r.stderr).slice(-200));
fs.rmSync(home, { recursive: true, force: true });
t.finish();

// Tests scripts/install.mjs in throw-away HOME / project directories. Nothing outside the temp dirs is touched.
import fs from "node:fs";
import path from "node:path";
import { suite, ROOT, SKILLS_DIR, skillNames, sameTree, node, mktemp } from "./lib.mjs";
import { TARGETS } from "../scripts/install.mjs";

const t = suite("installer");
const INSTALL = path.join(ROOT, "scripts", "install.mjs");
const skills = skillNames();
const env = (home) => ({ HOME: home, USERPROFILE: home, HOMEDRIVE: "", HOMEPATH: "" });

// expected directories, taken from the vendors' documentation (docs/compatibility.md)
const EXPECT = {
  claude: { user: ".claude/skills", project: ".claude/skills" },
  agents: { user: ".agents/skills", project: ".agents/skills" },
  cursor: { user: ".cursor/skills", project: ".cursor/skills" },
  vscode: { user: ".copilot/skills", project: ".github/skills" },
  codex: { user: ".agents/skills", project: ".agents/skills" },
  antigravity: { user: ".gemini/config/skills", project: ".agents/skills" },
  gemini: { user: ".gemini/skills", project: ".gemini/skills" },
};
t.check("installer knows every documented target", JSON.stringify(Object.keys(TARGETS).sort()) === JSON.stringify(Object.keys(EXPECT).sort()), Object.keys(TARGETS).join(","));

for (const [target, scopes] of Object.entries(EXPECT)) {
  for (const scope of ["user", "project"]) {
    const home = mktemp("slr-home-"), proj = mktemp("slr-proj-");
    const args = [INSTALL, "--target", target, "--scope", scope, "--project-dir", proj];
    const r = node(args, { env: env(home) });
    const base = scope === "user" ? home : proj;
    const dest = path.join(base, ...scopes[scope].split("/"));
    t.check(`${target}/${scope}: installs both skills to ${scopes[scope]}`, r.status === 0 && skills.every((s) => fs.existsSync(path.join(dest, s, "SKILL.md"))), r.stderr || r.stdout.slice(-200));
    t.check(`${target}/${scope}: installed copy is identical to skills/ (scripts and references included)`, skills.every((s) => fs.existsSync(path.join(dest, s)) && sameTree(path.join(dest, s), path.join(SKILLS_DIR, s))));
    const again = node(args, { env: env(home) });
    t.check(`${target}/${scope}: re-install is idempotent`, again.status === 0 && skills.every((s) => sameTree(path.join(dest, s), path.join(SKILLS_DIR, s))), again.stderr);
    if (scope === "user" && target === "claude") {
      const one = mktemp("slr-home-");
      node([INSTALL, "--target", "claude", "--skill", skills[0]], { env: env(one) });
      t.check("--skill installs only the chosen skill (independent installability)", fs.existsSync(path.join(one, ".claude/skills", skills[0], "SKILL.md")) && !fs.existsSync(path.join(one, ".claude/skills", skills[1])));
      fs.writeFileSync(path.join(home, ".claude", "skills", "my-other-skill.txt"), "keep me");
      const un = node([INSTALL, "--target", "claude", "--uninstall"], { env: env(home) });
      t.check("--uninstall removes only these skills and leaves other files", un.status === 0 && !fs.existsSync(path.join(home, ".claude/skills", skills[0])) && fs.existsSync(path.join(home, ".claude/skills/my-other-skill.txt")), un.stderr);
    }
  }
}

{ // safety
  const home = mktemp("slr-home-");
  const victim = path.join(home, ".claude", "skills", skills[0]);
  fs.mkdirSync(victim, { recursive: true }); fs.writeFileSync(path.join(victim, "precious.txt"), "do not delete");
  const r = node([INSTALL, "--target", "claude", "--skill", skills[0]], { env: env(home) });
  t.check("refuses to overwrite a directory that is not a skill (exit 1, data intact)", r.status === 1 && fs.existsSync(path.join(victim, "precious.txt")), `exit ${r.status} ${r.stderr}`);
  const dry = mktemp("slr-home-");
  const d = node([INSTALL, "--target", "all", "--dry-run"], { env: env(dry) });
  t.check("--dry-run writes nothing", d.status === 0 && fs.readdirSync(dry).length === 0 && /would install/.test(d.stdout), d.stdout.slice(0, 120));
  const bad = node([INSTALL, "--target", "nope"], { env: env(dry) });
  t.check("unknown target exits 2 with the list of valid targets", bad.status === 2 && /claude/.test(bad.stderr));
  const badSkill = node([INSTALL, "--target", "claude", "--skill", "nope"], { env: env(dry) });
  t.check("unknown skill exits 2", badSkill.status === 2);
  const all = mktemp("slr-home-");
  const a = node([INSTALL, "--target", "all"], { env: env(all) });
  t.check("--target all handles shared directories once (agents/codex)", a.status === 0 && /already handled/.test(a.stdout), a.stderr);
}
if (process.platform === "win32") t.skip("--mode link", "symlink/junction behaviour is Windows-specific; copy mode is the supported default");
else {
  const home = mktemp("slr-home-");
  const r = node([INSTALL, "--target", "claude", "--mode", "link"], { env: env(home) });
  const l = path.join(home, ".claude/skills", skills[0]);
  t.check("--mode link creates symlinks to skills/ for development", r.status === 0 && fs.lstatSync(l).isSymbolicLink() && fs.existsSync(path.join(l, "SKILL.md")), r.stderr);
}
t.finish();

// Gemini CLI really discovers the skills (isolated HOME, no network, no API key needed for `gemini skills ...`).
import fs from "node:fs";
import path from "node:path";
import { suite, ROOT, SKILLS_DIR, skillNames, which, run, node, mktemp } from "./lib.mjs";

const t = suite("gemini-cli");
if (!which("gemini")) { t.skip("all Gemini CLI tests", "gemini CLI not found on PATH"); t.finish(); }
console.log("# using gemini " + run("gemini", ["--version"]).stdout.trim());
const skills = skillNames();
const envFor = (h) => ({ HOME: h, USERPROFILE: h });

// A) gemini's own installer
{
  const home = mktemp("slr-gem-"); const env = envFor(home);
  for (const s of skills) { const r = run("gemini", ["skills", "install", path.join(SKILLS_DIR, s), "--scope", "user", "--consent"], { env, timeout: 120000 }); t.check(`gemini skills install ${s}`, r.status === 0 && /Successfully installed/.test(r.stdout + r.stderr), (r.stdout + r.stderr).slice(-200)); }
  const l = run("gemini", ["skills", "list"], { env, timeout: 120000 });
  t.check("gemini skills list shows both skills as Enabled with their descriptions", skills.every((s) => new RegExp(s + " \\[Enabled\\]").test(l.stdout)), l.stdout.slice(-300));
}
// B) our installer's gemini target must put files where gemini looks
{
  const home = mktemp("slr-gem-"); const env = envFor(home);
  const i = node([path.join(ROOT, "scripts", "install.mjs"), "--target", "gemini"], { env });
  t.check("scripts/install.mjs --target gemini succeeds", i.status === 0, i.stderr);
  const l = run("gemini", ["skills", "list"], { env, timeout: 120000 });
  t.check("skills installed by our installer are discovered by Gemini CLI", skills.every((s) => new RegExp(s + " \\[Enabled\\]").test(l.stdout)), l.stdout.slice(-300));
}
t.finish();

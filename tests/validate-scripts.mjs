// Static + light dynamic hygiene checks for every script shipped inside a skill.
import fs from "node:fs";
import path from "node:path";
import { suite, SKILLS_DIR, skillNames, listFiles, node } from "./lib.mjs";

const t = suite("scripts");
const scripts = skillNames().flatMap((s) => listFiles(path.join(SKILLS_DIR, s)).filter((f) => f.startsWith("scripts/") && f.endsWith(".mjs")).map((f) => path.join(SKILLS_DIR, s, f)));
t.check("scripts found", scripts.length >= 3, `${scripts.length}`);

const blocks = new Map(), authBlocks = new Map();
for (const f of scripts) {
  const rel = path.relative(SKILLS_DIR, f).split(path.sep).join("/");
  const src = fs.readFileSync(f, "utf8");
  const syntax = node(["--check", f]);
  t.check(`${rel}: node --check (syntax)`, syntax.status === 0, syntax.stderr);
  t.check(`${rel}: has a node shebang or ESM header comment`, /^(#!\/usr\/bin\/env node|\/\/|\/\*)/.test(src));
  t.check(`${rel}: no Node-side eval / new Function (page.$eval runs in the browser)`, !/(^|[^\w$.])eval\s*\(|new Function\s*\(/.test(src));
  const execs = [...src.matchAll(/\b(execSync|exec|spawn|spawnSync|execFile)\s*\(/g)].map((m) => m[0]);
  t.check(`${rel}: only the fixed 'npm root -g' call may spawn a process`, execs.every((e) => e.startsWith("execSync")) && (src.match(/execSync\(/g) || []).length <= 1 && (!execs.length || /execSync\("npm root -g"/.test(src)), execs.join(","));
  t.check(`${rel}: no hardcoded user paths`, !/\/home\/\w+|\/Users\/\w+|[A-Z]:\\Users\\|\/tmp\//.test(src));
  const m = src.match(/\/\/ ---- shared bootstrap[\s\S]*?\/\/ ---- end shared bootstrap ----/);
  t.check(`${rel}: contains the shared bootstrap block`, !!m);
  if (m) blocks.set(rel, m[0]);
  const a = src.match(/\/\/ ---- shared auth[\s\S]*?\/\/ ---- end shared auth ----/);
  t.check(`${rel}: contains the shared auth block (--storage-state)`, !!a);
  if (a) authBlocks.set(rel, a[0]);
  t.check(`${rel}: --help documents --storage-state`, /--storage-state/.test(node([f, "--help"]).stdout));
  const help = node([f, "--help"]);
  t.check(`${rel}: --help exits 0 and prints usage`, help.status === 0 && /--/.test(help.stdout), `exit ${help.status}`);
  const bad = node([f, "--url", "not a url", "--source", "x", "--target", "y", "--lang", "fr"]);
  t.check(`${rel}: invalid URL fails fast with exit code 2 and a message`, bad.status === 2 && /valid http\(s\) or file URL|Playwright is not installed/.test(bad.stderr), `exit ${bad.status}: ${bad.stderr.slice(0, 120)}`);
}
const uniq = new Set(blocks.values());
t.check("the shared bootstrap block is identical in every script (no drift)", uniq.size <= 1, `${uniq.size} variants`);
const uniqAuth = new Set(authBlocks.values());
t.check("the shared auth block is identical in every script (no drift)", uniqAuth.size <= 1, `${uniqAuth.size} variants`);
t.finish();

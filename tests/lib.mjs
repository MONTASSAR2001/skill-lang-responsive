// Tiny zero-dependency test helper. Every check prints exactly one line:  PASS|FAIL|SKIP <suite> :: <name> [-- detail]
// A SKIP is never counted as a pass: the runner lists skips separately and `--strict` turns them into failures.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SKILLS_DIR = path.join(ROOT, "skills");
export const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

export function suite(name) {
  let failed = 0;
  const line = (status, test, detail) => console.log(`${status} ${name} :: ${test}${detail ? " -- " + String(detail).replace(/\s+/g, " ").slice(0, 300) : ""}`);
  return {
    check(test, ok, detail) { if (ok) line("PASS", test); else { failed++; line("FAIL", test, detail); } return !!ok; },
    skip(test, reason) { line("SKIP", test, reason); },
    finish() { process.exit(failed ? 1 : 0); },
  };
}

export const skillNames = () => fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

export function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listFiles(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name)).split(path.sep).join("/")]));
}
export const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f).toString("utf8").replace(/\r\n/g, "\n")).digest("hex");

/** true when two directory trees have identical files (line-ending-insensitive) */
export function sameTree(a, b) {
  const fa = listFiles(a).sort(), fb = listFiles(b).sort();
  if (fa.join("\n") !== fb.join("\n")) return false;
  return fa.every((f) => sha(path.join(a, f)) === sha(path.join(b, f)));
}

export function mktemp(prefix = "slr-") { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }

/** run a command, never through a shell string built from input */
export function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: opts.timeout ?? 120000, env: { ...process.env, ...(opts.env || {}) }, cwd: opts.cwd || ROOT, shell: process.platform === "win32" && !/\.(exe|mjs)$/i.test(cmd) && cmd !== process.execPath });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "", error: r.error };
}
export const node = (args, opts) => run(process.execPath, args, opts);

export function which(cmd) {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", [cmd], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null;
}

/** async variant: required whenever this process also hosts a server the child needs (spawnSync would block it) */
export function nodeAsync(args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: opts.cwd || ROOT, env: { ...process.env, ...(opts.env || {}) } });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => { child.kill(); stderr += "\n[timeout]"; }, opts.timeout ?? 180000);
    child.stdout.on("data", (d) => (stdout += d)); child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (status) => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
  });
}

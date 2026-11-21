#!/usr/bin/env python3
"""One-off migration used while hardening v1.0: replaces the per-script Playwright loader with the shared,
cross-platform bootstrap and adds friendly error handling. Idempotent. Kept for the audit trail (docs/audit.md)."""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
BOOTSTRAP = '''// ---- shared bootstrap: identical in every script of this package (tests/validate-scripts.mjs enforces it) ----
function fail(msg, code = 2) { console.error(msg); process.exit(code); }
process.on("unhandledRejection", (e) => fail("Unexpected error: " + ((e && e.message) || e), 1));
function globalNpmRoot() { try { return execSync("npm root -g", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 8000 }).trim(); } catch { return null; } }
async function loadPlaywright() {
  const tryImport = async (spec) => { try { return await import(spec); } catch { return null; } };
  const entryOf = (dir) => pathToFileURL(fs.existsSync(path.join(dir, "index.mjs")) ? path.join(dir, "index.mjs") : dir).href;
  if (process.env.PLAYWRIGHT_MODULE) { const m = await tryImport(entryOf(path.resolve(process.env.PLAYWRIGHT_MODULE))); if (m) return m; }
  for (const name of ["playwright", "playwright-core"]) { const m = await tryImport(name); if (m) return m; }
  for (const base of [process.cwd(), globalNpmRoot()].filter(Boolean)) {
    for (const name of ["playwright", "playwright-core"]) {
      try { const m = await tryImport(entryOf(path.dirname(createRequire(path.join(base, "noop.js")).resolve(name + "/package.json")))); if (m) return m; } catch { /* try next */ }
    }
  }
  fail("Playwright is not installed.\\n  Install: npm i -D playwright && npx playwright install chromium\\n  (or point PLAYWRIGHT_MODULE at an existing playwright package directory)");
}
async function launchChromium(chromium) { try { return await chromium.launch(); } catch (e) { fail("Could not start Chromium: " + String(e.message).split("\\n")[0] + "\\n  Install the browser: npx playwright install chromium"); } }
function checkUrl(u) { try { if (!["http:", "https:", "file:"].includes(new URL(u).protocol)) throw new Error("scheme"); } catch { fail("Not a valid http(s) or file URL: " + u); } return u; }
async function go(page, url) { try { await page.goto(url, { waitUntil: "load", timeout: 45000 }); } catch (e) { fail("Cannot load " + url + ": " + String(e.message).split("\\n")[0]); } }
// ---- end shared bootstrap ----
'''

IMPORTS = {
    "fs": 'import fs from "node:fs";',
    "path": 'import path from "node:path";',
    "createRequire": 'import { createRequire } from "node:module";',
    "execSync": 'import { execSync } from "node:child_process";',
    "pathToFileURL": 'import { pathToFileURL } from "node:url";',
}

def patch(file, usage_hint):
    p = ROOT / file
    s = p.read_text()
    if "shared bootstrap" in s:
        print("already patched", file); return
    # 1. replace old loader (from 'async function loadPlaywright' up to the 'const args' line)
    a = s.index("async function loadPlaywright()")
    b = s.index("const args = Object.fromEntries")
    s = s[:a] + BOOTSTRAP + s[b:]
    # 2. imports: make sure all five exist
    head_end = s.index("// ---- shared bootstrap")
    head = s[:head_end]
    for k, line in IMPORTS.items():
        if line not in head:
            head = head.rstrip("\n") + "\n" + line + "\n"
    s = head + s[head_end:]
    # 3. --help + url validation + launch + goto
    s = s.replace("const { chromium } = await loadPlaywright();", "const { chromium } = await loadPlaywright();")
    s = re.sub(r"await (\w+)\.goto\((args\.url|url), \{ waitUntil: \"load\" \}\)", r"await go(\1, \2)", s)
    s = s.replace("await browser.newContext", "await browser.newContext")  # no-op, keeps diff readable
    s = s.replace("const browser = await chromium.launch();", "const browser = await launchChromium(chromium);")
    s = s.replace("const b = await chromium.launch();", "const b = await launchChromium(chromium);")
    # 4. --help (checked before arg validation)
    marker = "const args = Object.fromEntries"
    help_line = "if (process.argv.includes(\"--help\") || process.argv.includes(\"-h\")) { console.log(" + __import__("json").dumps(usage_hint) + "); process.exit(0); }\n"
    s = s.replace(marker, help_line + marker, 1)
    p.write_text(s)
    print("patched", file)

patch("skills/universal-responsive-design/scripts/audit.mjs",
      "audit.mjs --url <url> [--out <dir>] [--compare <prev>/audit.json] [--intentional sel,sel] [--must a,b] [--widths 320,390,1280] [--no-sweep] [--scroll-shots N] [--wait ms]\nRenders the page in Chromium across a viewport matrix and a width sweep and reports layout defects. Needs Playwright (npm i -D playwright && npx playwright install chromium).")
patch("skills/smart-website-localization/scripts/verify.mjs",
      "verify.mjs --source <url> --target <url> --lang <code> [--glossary file.json] [--out dir] [--steps \"click:sel;wait:ms\"] [--intentional sel,sel] [--source-files a.js,b.js --target-files x.js,y.js] [--protect A,B]\nCompares a localized page with its source in Chromium. Writes <out>/pairs.tsv and <out>/verify.json; exit code 1 when critical issues exist, 2 on setup errors.")
patch("skills/smart-website-localization/scripts/extract-strings.mjs",
      "extract-strings.mjs --url <url> [--out strings.json] [--steps \"click:sel;wait:ms\"] [--source-dir <dir>]\nLists translatable strings of a rendered page (and, with --source-dir, candidate strings found in source files but not on the rendered page).")

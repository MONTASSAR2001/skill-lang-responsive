#!/usr/bin/env node
/**
 * Inventory the translatable strings of a site, wherever they come from.
 *   node extract-strings.mjs --url <url> --out strings.json [--steps "click:.open;wait:1500"] [--source-dir ./src]
 *                            [--crawl N] [--residue fr|ar|<lang>] [--protect A,B] [--storage-state auth.json]
 *
 * 1. Rendered strings: text nodes, alt/title/placeholder/aria-label, <title>, meta, JSON-LD — at load and again after `--steps`
 *    (so dialogs, drawers, viewers and menus that only exist after interaction are captured; run it several times with different steps).
 * 2. API strings: every JSON response the page fetches (fetch/XHR) is recorded and its human-looking string values are listed with the
 *    endpoint and JSON path. Text that comes from a backend, database or CMS never appears in the source files: this is where it shows up.
 * 3. --source-dir: scans .js/.jsx/.ts/.tsx/.html/.json/.vue/.svelte files for human-looking string literals that the rendered inventory
 *    did NOT contain (validation messages, toasts, plural/conditional branches, templates, error states). The list is candidates, not truth.
 * 4. --crawl N: follows same-origin links (breadth-first, at most N pages) so every route is inventoried, not just the first one.
 * 5. --residue <lang>: for an already LOCALIZED site, lists what is still in the source language, per page, in the DOM and in API
 *    responses (heuristic: English stop-words; for Arabic also Latin-only phrases). A lower bound, not proof of completeness.
 *    Exit code 1 when residue is found, so it can gate a build.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
// ---- shared bootstrap: identical in every script of this package (tests/validate-scripts.mjs enforces it) ----
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
  fail("Playwright is not installed.\n  Install: npm i -D playwright && npx playwright install chromium\n  (or point PLAYWRIGHT_MODULE at an existing playwright package directory)");
}
async function launchChromium(chromium) { try { return await chromium.launch(); } catch (e) { fail("Could not start Chromium: " + String(e.message).split("\n")[0] + "\n  Install the browser: npx playwright install chromium"); } }
function checkUrl(u) { try { if (!["http:", "https:", "file:"].includes(new URL(u).protocol)) throw new Error("scheme"); } catch { fail("Not a valid http(s) or file URL: " + u); } return u; }
async function go(page, url) { try { await page.goto(url, { waitUntil: "load", timeout: 45000 }); } catch (e) { fail("Cannot load " + url + ": " + String(e.message).split("\n")[0]); } }
// ---- end shared bootstrap ----
// ---- shared auth: identical in every script of this package (tests/validate-scripts.mjs enforces it) ----
// Pages behind a login: pass --storage-state <file> (a Playwright storage-state JSON: cookies + localStorage, scoped per origin).
// Create one without putting a password on a command line:  npx playwright codegen --save-storage=auth.json <login-url>   (sign in, close the window)
// The file holds live session tokens: keep it out of git (auth*.json is in .gitignore) and delete it when done.
function authState(args) {
  const f = args["storage-state"]; if (!f) return undefined;
  if (f === true) fail("--storage-state needs a file path.");
  const p = path.resolve(String(f)); if (!fs.existsSync(p)) fail("--storage-state file not found: " + p + "\n  Create one: npx playwright codegen --save-storage=auth.json <login-url>   (sign in, then close the window)");
  try { JSON.parse(fs.readFileSync(p, "utf8")); } catch { fail("--storage-state is not valid JSON: " + p); }
  return p;
}
function useAuth(browser, state) {
  let warned = false; const nc = browser.newContext.bind(browser);
  browser.newContext = async (o = {}) => {
    const ctx = await nc(state ? { storageState: state, ...o } : o);
    ctx.on("page", (pg) => pg.on("load", () => { if (warned) return; let u; try { u = new URL(pg.url()); } catch { return; } if (/(^|\/)(log-?in|sign-?in|signin|sso|auth|authenticate)(\/|$|\.)/i.test(u.pathname)) { warned = true; console.error("WARNING: the page redirected to a login screen (" + u.pathname + "); results describe the login page, not the app." + (state ? " The saved session may have expired: create a new --storage-state file." : " Pass --storage-state <file> (see --help).")); } }));
    return ctx;
  };
  return browser;
}
// ---- end shared auth ----
if (process.argv.includes("--help") || process.argv.includes("-h")) { console.log("extract-strings.mjs --url <url> [--out strings.json] [--steps \"click:sel;wait:ms\"] [--source-dir <dir>] [--crawl N] [--residue <lang>] [--protect A,B] [--storage-state auth.json]\nLists translatable strings of a rendered page, of the JSON API responses it loads, and (with --source-dir) candidate strings found in source files but not rendered.\n--crawl N follows same-origin links (max N pages). --residue <lang> reports text still in the source language on a localized site (exit 1 if any)."); process.exit(0); }
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1] === undefined || all[i + 1].startsWith("--") ? true : all[i + 1]]] : a), []));
if (!args.url) { console.error("usage: extract-strings.mjs --url <url> [--out strings.json] [--steps ...] [--source-dir dir] [--crawl N] [--residue lang]"); process.exit(2); }
checkUrl(args.url);
const { chromium } = await loadPlaywright();
const b = useAuth(await launchChromium(chromium), authState(args));
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const protect = args.protect ? String(args.protect).split(",") : [];
const crawlMax = Math.max(1, Math.min(200, Number(args.crawl) || 1));
const residueLang = typeof args.residue === "string" ? args.residue : null;

const STOP = new Set("the and your you our with from this that will are have has was were their they what when where which would could about into also than then there these those just more most only some such very can't don't won't it's we're you're let's isn't doesn't for not but all any can how its out per get set see use new now one two of to in is it at by be if every away should must do does been being than so each both between before after during until while because without within keep make take add".split(" "));
const isProtected = (t) => protect.some((p) => t.includes(p)) && protect.reduce((r, p) => r.split(p).join(" "), t).replace(/[\W\d_]+/g, "") === "";
const looksSourceLanguage = (t) => {
  if (!t || isProtected(t)) return false;
  const w = t.toLowerCase().match(/[a-z']{2,}/g) || [];
  if (w.filter((x) => STOP.has(x)).length >= 2) return true;
  if (residueLang && /^(ar|he|fa|ur)$/.test(residueLang)) return w.length >= 2 && !/[֐-ۿ]/.test(t); // an Arabic/Hebrew page should not hold Latin-only phrases
  return false;
};
const humanString = (s) => typeof s === "string" && s.length >= 8 && s.length <= 600 && /[\p{L}]{3,}\s+[\p{L}]{2,}/u.test(s) && !/^(https?:|\/|[\w.+-]+@[\w-]+\.)/.test(s) && !/^[\w-]+(\.[\w-]+)+$/.test(s) && !/^[0-9a-f-]{16,}$/i.test(s) && !/^\d{4}-\d\d-\d\d/.test(s);
const walkJson = (v, pth, out) => { if (Array.isArray(v)) v.slice(0, 200).forEach((x) => walkJson(x, pth + "[]", out)); else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walkJson(x, pth + "." + k, out); else if (humanString(v)) out.push({ path: pth, text: v }); };

const collectDom = (stage) => (page) => page.evaluate((stage) => {
  const out = [], skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);
  const walk = (n) => {
    if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, " ").trim(); if (t) out.push({ stage, type: "text", text: t, tag: n.parentElement.tagName.toLowerCase(), code: !!n.parentElement.closest("pre,code,kbd") }); return; }
    if (n.nodeType !== 1 || skip.has(n.tagName)) return;
    for (const a of ["alt", "title", "placeholder", "aria-label", "aria-description"]) if (n.getAttribute(a)) out.push({ stage, type: "attr:" + a, text: n.getAttribute(a), tag: n.tagName.toLowerCase() });
    n.childNodes.forEach(walk);
  };
  walk(document.body);
  out.push({ stage, type: "head:title", text: document.title });
  document.querySelectorAll('meta[name=description],meta[property^="og:"],meta[name^="twitter:"]').forEach((m) => { if (m.content && !/^https?:/.test(m.content)) out.push({ stage, type: "head:" + (m.name || m.getAttribute("property")), text: m.content }); });
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => { try { const w = (o) => o && typeof o === "object" && Object.entries(o).forEach(([k, v]) => typeof v === "string" && /^(description|headline|text|slogan)$/.test(k) ? out.push({ stage, type: "head:jsonld." + k, text: v }) : w(v)); w(JSON.parse(s.textContent)); } catch {} });
  return out;
}, stage);
const normPath = (u) => { try { const x = new URL(u); return x.origin + x.pathname.replace(/\/+$/, "") ; } catch { return u; } };

const pages = []; let items = []; const apiAll = [];
const queue = [args.url], seenPages = new Set(); const origin = new URL(args.url).origin;
while (queue.length && pages.length < crawlMax) {
  const url = queue.shift(), key = normPath(url); if (seenPages.has(key)) continue; seenPages.add(key);
  const page = await ctx.newPage(); const api = [];
  page.on("response", async (r) => {
    try {
      const rt = r.request().resourceType(); if (!["fetch", "xhr"].includes(rt) || r.status() >= 400 || !/json/i.test(r.headers()["content-type"] || "")) return;
      const found = []; walkJson(JSON.parse(await r.text()), "$", found); const u = new URL(r.url());
      for (const f of found.slice(0, 400)) api.push({ endpoint: u.origin === origin ? u.pathname : u.origin + u.pathname, query: u.search || undefined, ...f });
    } catch { /* not JSON / body gone: ignore */ }
  });
  await go(page, url); await page.waitForTimeout(600);
  let pageItems = (await collectDom("load")(page)).map((i) => ({ ...i, page: new URL(page.url()).pathname }));
  if (pages.length === 0) {
    for (const st of String(typeof args.steps === "string" ? args.steps : "").split(";").filter(Boolean)) {
      const [k, ...v] = st.split(":"); const val = v.join(":");
      try { if (k === "click") await page.click(val, { timeout: 2500 }); else if (k === "wait") await page.waitForTimeout(+val); else if (k === "press") await page.keyboard.press(val); else if (k === "fill") { const [s2, t] = val.split("="); await page.fill(s2, t); } } catch { console.error("step failed:", st); }
    }
    if (args.steps) pageItems = pageItems.concat((await collectDom("after-steps")(page)).map((i) => ({ ...i, page: new URL(page.url()).pathname })));
  }
  await page.waitForTimeout(150);
  const links = crawlMax > 1 ? await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.href)) : [];
  for (const l of links) { try { const x = new URL(l); if (x.origin === origin && /^https?:$/.test(x.protocol) && !/\.(pdf|zip|png|jpe?g|webp|svg|gif|mp4|webm|xml|json|txt|ico|css|js)$/i.test(x.pathname) && !seenPages.has(normPath(l))) queue.push(x.origin + x.pathname); } catch {} }
  const apiPage = api.map((a) => ({ ...a, page: new URL(page.url()).pathname }));
  pages.push({ url: page.url(), strings: pageItems.length, apiStrings: apiPage.length, _items: pageItems, _api: apiPage });
  items = items.concat(pageItems); apiAll.push(...apiPage);
  await page.close();
}
await b.close();
const seen = new Set(); items = items.filter((i) => { const k = i.type + "|" + i.text; if (seen.has(k)) return false; seen.add(k); return true; });
const seenApi = new Set(); const apiStrings = apiAll.filter((a) => { const k = a.endpoint + "|" + a.path + "|" + a.text; if (seenApi.has(k)) return false; seenApi.add(k); return true; });

let candidates = [];
if (args["source-dir"]) {
  const known = new Set([...items, ...apiStrings].map((i) => i.text.toLowerCase()));
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.name === "node_modules" || e.name.startsWith(".") ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(args["source-dir"]).filter((f) => /\.(m?[jt]sx?|html|vue|svelte|json)$/.test(f))) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n]){6,200})\1|>\s*([A-Z][^<>{}\n]{5,160})\s*</g)) {
      const s = (m[2] || m[3] || "").trim();
      if (!/[A-Za-z]{3,}\s+[A-Za-z]{2,}|^[A-Z][a-z]{4,}[.!?…]?$/.test(s) || /^[./#@\w-]+$/.test(s) && !s.includes(" ") || /^(https?:|\/|\.\.?\/|[a-z-]+:|[A-Z_]{4,}$)|\{\s*$|=>|function|import |className|px |rem |var\(|rgb|#[0-9a-f]{3,}/.test(s)) continue;
      if (known.has(s.toLowerCase())) continue;
      candidates.push({ file: f, text: s.slice(0, 120) });
    }
  }
  const uniq = new Map(candidates.map((c) => [c.text, c])); candidates = [...uniq.values()];
}

// residue: what a localized site still says in the source language, in the DOM and in API responses
let residue = null;
if (residueLang) {
  const dom = items.filter((i) => i.type !== "text" || !i.code).filter((i) => looksSourceLanguage(i.text)).map((i) => ({ where: "dom", page: i.page, type: i.type, text: i.text.slice(0, 100) }));
  const apis = apiStrings.filter((a) => looksSourceLanguage(a.text)).map((a) => ({ where: "api", page: a.page, endpoint: a.endpoint + (a.query || ""), path: a.path, text: a.text.slice(0, 100) }));
  residue = { lang: residueLang, dom, api: apis, perPage: pages.map((p) => ({ url: p.url, dom: dom.filter((d) => d.page === new URL(p.url).pathname).length, api: apis.filter((d) => d.page === new URL(p.url).pathname).length })) };
}
const file = typeof args.out === "string" ? args.out : "strings.json";
fs.writeFileSync(file, JSON.stringify({ rendered: items, apiStrings, sourceCandidates: candidates, pages: pages.map(({ _items, _api, ...p }) => p), residue }, null, 1));
const by = items.reduce((a, i) => ((a[i.type] = (a[i.type] || 0) + 1), a), {});
console.log(`${items.length} rendered strings on ${pages.length} page(s) → ${file}`, by);
const endpoints = apiStrings.reduce((a, s) => ((a[s.endpoint] = (a[s.endpoint] || 0) + 1), a), {});
if (Object.keys(endpoints).length) { console.log(`${apiStrings.length} human-readable strings come from the API/network, NOT from the page markup or source files (they need a backend/data localization strategy):`); for (const [e, n] of Object.entries(endpoints)) console.log(`   ${String(n).padStart(4)}  ${e}`); }
else console.log("No JSON API strings were loaded on the visited pages (content is in the markup or in bundled code).");
if (args["source-dir"]) { console.log(`${candidates.length} candidate strings found in source but NOT in the rendered/API inventory (check these):`); candidates.slice(0, 25).forEach((c) => console.log("  ", path.relative(process.cwd(), c.file) + ":", c.text)); if (candidates.length > 25) console.log(`  … ${candidates.length - 25} more in ${file}`); }
if (residue) {
  const n = residue.dom.length + residue.api.length;
  console.log(`\nRESIDUE (${residueLang}): ${residue.dom.length} source-language string(s) in the DOM, ${residue.api.length} in API responses, on ${pages.length} page(s).`);
  for (const r of [...residue.dom, ...residue.api].slice(0, 30)) console.log(`   ${r.where.padEnd(3)} ${String(r.page).padEnd(24)} ${r.endpoint ? r.endpoint + " " + r.path + "  " : ""}"${r.text}"`);
  if (n > 30) console.log(`   … ${n - 30} more in ${file}`);
  console.log(n ? "Heuristic and incomplete by nature: also run verify.mjs per route and READ the pairs. Brand/product names and shared words are expected residue: add them to --protect." : "No source-language residue detected (heuristic: this is a lower bound, not proof).");
  process.exit(n ? 1 : 0);
}

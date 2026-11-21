#!/usr/bin/env node
/**
 * Responsive audit (v2). Renders a URL in Chromium across a viewport matrix and a fine width sweep, measures real layout
 * problems, and can diff two runs to expose regressions.
 *
 *   node audit.mjs --url <url> --out <dir>                       matrix + sweep + screenshots
 *   node audit.mjs --url <url> --out <dir> --compare <dir0>/audit.json     also list fixed / new / unchanged issues
 *   options:
 *     --widths 320,390,768,1280   override the matrix          --no-sweep      skip the 16px-step width sweep
 *     --intentional ".carousel,#hscroll"   selectors that are meant to scroll/overflow (not reported)
 *     --must "Pricing,Log in"      texts that must stay reachable (default: auto inventory of headings/links/buttons/labels)
 *     --scroll-shots 6             also write N viewport screenshots down the page at 390 and 1280 (sticky / scroll-driven pages)
 *     --wait 500                   ms to wait after load (raise for client-rendered pages)
 *
 * Categories: CRITICAL overflow | hidden-overflow | offscreen | clipped-text | overlap | distorted-img | tap<24 | unreachable
 *             MAJOR    tap<44 (touch) | fixed-cover | tiny-text(<12px)         INFO console errors, failed requests
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
if (process.argv.includes("--help") || process.argv.includes("-h")) { console.log("audit.mjs --url <url> [--out <dir>] [--compare <prev>/audit.json] [--intentional sel,sel] [--must a,b] [--widths 320,390,1280] [--no-sweep] [--scroll-shots N] [--wait ms] [--storage-state auth.json]\nRenders the page in Chromium across a viewport matrix and a width sweep and reports layout defects. Needs Playwright (npm i -D playwright && npx playwright install chromium)."); process.exit(0); }
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1] === undefined || all[i + 1].startsWith("--") ? true : all[i + 1]]] : a), []));
if (!args.url) { console.error("usage: audit.mjs --url <url> --out <dir> [--compare prev/audit.json] [--intentional sel,sel] [--must a,b] [--no-sweep] [--scroll-shots N]"); process.exit(2); }
checkUrl(args.url);
const out = args.out || "responsive-audit";
fs.mkdirSync(out, { recursive: true });
const MATRIX = [[320, 640], [360, 740], [375, 812], [390, 844], [430, 932], [480, 854], [600, 960], [768, 1024], [820, 1180], [1024, 768], [1280, 800], [1440, 900], [1920, 1080], [2560, 1440], [844, 390, "landscape-phone"], [1280, 600, "short-laptop"], [640, 450, "zoom-200%", 2]];
const widthsOverride = args.widths ? String(args.widths).split(",").map(Number) : null;
const matrix = widthsOverride ? widthsOverride.map((w) => [w, w < 500 ? 800 : w < 900 ? 1000 : 900]) : MATRIX;
const intentional = args.intentional ? String(args.intentional).split(",") : [];
const wait = Number(args.wait || 450);
const { chromium } = await loadPlaywright();

/** Runs inside the page. Measures; never assumes. */
function measure({ intentional, must }) {
  const vw = document.documentElement.clientWidth, vh = innerHeight, de = document.documentElement;
  const cs = (e) => getComputedStyle(e);
  const sel = (e) => (e.id ? "#" + e.id : e.tagName.toLowerCase() + (typeof e.className === "string" && e.className.trim() ? "." + e.className.trim().split(/\s+/)[0] : ""));
  const visible = (e) => { const r = e.getBoundingClientRect(), s = cs(e); return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden" && +s.opacity > 0; };
  const own = (e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const SKIP = /^(SCRIPT|STYLE|LINK|META|BR|WBR|NOSCRIPT|TEMPLATE|DEFS|PATH|G|LINE|RECT|POLYLINE|CIRCLE|MASK|USE|TEXT|TSPAN)$/i;
  const deco = (e) => !!e.closest("[aria-hidden='true']") && !e.matches("a,button,input,select,textarea");
  const all = [...document.querySelectorAll("body *")].filter((e) => !SKIP.test(e.tagName) && visible(e) && !deco(e));
  const marked = intentional.flatMap((q) => { try { return [...document.querySelectorAll(q)]; } catch { return []; } });
  const scrollerOf = (e) => { for (let p = e; p && p !== document.body; p = p.parentElement) { if (marked.includes(p)) return p; if (p !== e && /(auto|scroll)/.test(cs(p).overflowX) && p.scrollWidth > p.clientWidth + 1) return p; } return null; };
  const inMarked = (e) => marked.some((m) => m.contains(e));
  const fixedAnc = (e) => { for (let p = e; p && p !== document.body; p = p.parentElement) if (cs(p).position === "fixed") return p; return null; };
  const m = { vw, vh };

  // 1. overflow, and overflow *hidden* by overflow-x:hidden/clip on html/body (content cut off but no scrollbar)
  m.overflowPx = Math.max(0, de.scrollWidth - de.clientWidth);
  let maxRight = 0, widest = null;
  for (const e of all) { if (scrollerOf(e) || fixedAnc(e)) continue; const r = e.getBoundingClientRect(); if ((own(e) || /^(IMG|VIDEO|INPUT|BUTTON|SELECT|TEXTAREA|SVG|TABLE|CANVAS)$/i.test(e.tagName)) && r.right > maxRight) { maxRight = r.right; widest = e; } }
  const clipsX = [de, document.body].some((e) => /(hidden|clip)/.test(cs(e).overflowX));
  m.hiddenOverflowPx = clipsX ? Math.max(0, Math.round(maxRight - vw)) : 0;
  m.widest = widest ? sel(widest) : null;

  // 2. offscreen content (text/controls/media beyond the viewport, outside scrollers, fixed layers and decorative boxes)
  m.offscreen = all.filter((e) => !scrollerOf(e) && !fixedAnc(e) && (own(e) || /^(IMG|VIDEO|INPUT|BUTTON|SELECT|TEXTAREA|TABLE)$/i.test(e.tagName)) && (e.getBoundingClientRect().right > vw + 2 || e.getBoundingClientRect().left < -2)).slice(0, 10).map((e) => `${sel(e)} [${Math.round(e.getBoundingClientRect().left)},${Math.round(e.getBoundingClientRect().right)}]`);

  // 3. clipped text — measured on the text boxes against an overflow:hidden/clip ancestor
  m.clipped = [];
  for (const e of all) {
    const s = cs(e), cx = /(hidden|clip)/.test(s.overflowX), cy = /(hidden|clip)/.test(s.overflowY);
    if (!(cx || cy) || e === document.body || e === de || e.matches("video,img,svg,canvas,picture") || /^(auto|scroll)$/.test(s.overflowX) || s.textOverflow === "ellipsis" || inMarked(e)) continue;
    const box = e.getBoundingClientRect(); if (box.width <= 2 || box.height <= 2) continue;
    const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let bad = "";
    for (let n = w.nextNode(); n && !bad; n = w.nextNode()) {
      if (!n.textContent.trim() || !visible(n.parentElement) || n.parentElement.closest("[aria-hidden='true']")) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) if (r.width > 0 && ((cx && (r.right > box.right + 1.5 || r.left < box.left - 1.5)) || (cy && (r.bottom > box.bottom + 1.5 || r.top < box.top - 1.5)))) { bad = n.textContent.trim().slice(0, 36); break; }
    }
    if (bad) m.clipped.push(`${sel(e)}: "${bad}"`);
  }
  m.clipped = m.clipped.slice(0, 10);

  // 4. overlapping content boxes that are neither nested nor fixed (text/controls/images on top of each other)
  const content = all.filter((e) => (own(e) || /^(IMG|VIDEO|INPUT|SELECT|TEXTAREA|BUTTON)$/i.test(e.tagName)) && cs(e).position !== "fixed" && !fixedAnc(e));
  m.overlaps = [];
  const boxes = (e) => { const rs = [...e.getClientRects()].filter((r) => r.width > 0 && r.height > 0); return rs.length ? rs : [e.getBoundingClientRect()]; }; // per line box: a wrapped inline link is not one big rectangle
  for (let i = 0; i < content.length && m.overlaps.length < 10; i++) {
    const A = boxes(content[i]);
    for (let j = i + 1; j < content.length; j++) {
      if (content[i].contains(content[j]) || content[j].contains(content[i])) continue;
      if (marked.some((mk) => mk.contains(content[i]) && mk.contains(content[j]))) continue; // layered on purpose inside a declared stage
      const B = boxes(content[j]);
      const hit = A.some((ra) => B.some((rb) => { const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top); return ix > 2 && iy > 2 && ix * iy > 120 && ix * iy / Math.min(ra.width * ra.height, rb.width * rb.height) > 0.2; }));
      if (hit) m.overlaps.push(`${sel(content[i])} × ${sel(content[j])}`);
    }
  }

  // 5. touch targets: <24px critical, <44px major; inline text links inside prose are exempt
  m.tap = [];
  for (const e of all.filter((x) => x.matches("a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab]"))) {
    if (e.tagName === "A" && cs(e).display === "inline" && e.closest("p,li,address,small,figcaption,label")) continue;
    const lbl = e.closest("label"), r = (lbl && e.matches("input[type=checkbox],input[type=radio]") ? lbl : e).getBoundingClientRect(), mn = Math.min(r.width, r.height);
    if (mn < 43.5) m.tap.push({ el: sel(e), w: Math.round(r.width), h: Math.round(r.height), critical: mn < 24 });
  }
  // 6. tiny text
  m.tiny = all.filter((e) => own(e) && parseFloat(cs(e).fontSize) < 12 && !e.closest("svg")).slice(0, 6).map((e) => `${sel(e)} ${parseFloat(cs(e).fontSize)}px`);
  // 7. distorted images (object-fit fill/none with a different aspect ratio than the file)
  m.distorted = all.filter((e) => e.tagName === "IMG" && e.naturalWidth && (!cs(e).objectFit || cs(e).objectFit === "fill")).filter((e) => { const r = e.getBoundingClientRect(); return Math.abs(e.naturalWidth / e.naturalHeight - r.width / r.height) / (e.naturalWidth / e.naturalHeight) > 0.03; }).map((e) => `${sel(e)} ${e.naturalWidth}x${e.naturalHeight} shown ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`).slice(0, 6);
  // 8. fixed/sticky layers that cover a large part of the *visible* viewport
  m.fixedCover = all.filter((e) => /^(fixed|sticky)$/.test(cs(e).position) && !inMarked(e)).map((e) => { const r = e.getBoundingClientRect(); const iw = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)), ih = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)); return [sel(e), Math.round(iw * ih / (vw * vh) * 100)]; }).filter(([, p]) => p > 28).map(([s, p]) => `${s} ${p}%`);
  // 9. inventory of user-facing text: what is visible right now
  const label = (e) => (e.getAttribute("aria-label") || e.innerText || e.textContent || "").replace(/\s+/g, " ").trim();
  const wanted = must.length ? must : [...new Set([...document.querySelectorAll("h1,h2,h3,button,a[href],label,summary,th,[role=tab],[role=menuitem]")].map(label).filter((t) => t && t.length < 90))];
  // content inside a scroller (carousel, strip, data table) is reachable by scrolling even when it is currently off to the side
  const present = (t) => { const l = t.toLowerCase(); return [...document.querySelectorAll("body *")].some((e) => (own(e) || e.getAttribute("aria-label")) && label(e).toLowerCase().includes(l) && visible(e) && !e.closest("[hidden],[inert]") && (scrollerOf(e) || (e.getBoundingClientRect().right > 0 && e.getBoundingClientRect().left < vw))); };
  m.inventory = wanted.map((t) => [t, present(t)]);
  return m;
}

/** Reveal hidden texts through toggles/dropdowns so "behind a menu" counts as reachable but "gone" does not. */
async function reveal(page, hidden) {
  const out = Object.fromEntries(hidden.map((t) => [t, false]));
  const shown = (t) => page.evaluate((w) => [...document.querySelectorAll("body *")].some((e) => ((e.getAttribute("aria-label") || e.innerText || "").toLowerCase().includes(w.toLowerCase())) && e.children.length < 4 && (() => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && r.right > 0 && r.left < innerWidth; })()), t);
  const trigger = async (h) => { for (const how of ["hover", "focus", "click"]) { try { await h[how === "hover" ? "hover" : how === "focus" ? "focus" : "click"]({ timeout: 700 }); } catch { continue; } await page.waitForTimeout(220); } };
  const dropdowns = async () => { for (const t of hidden) { if (out[t]) continue; const h = await page.evaluateHandle((w) => { const el = [...document.querySelectorAll("body *")].find((e) => e.children.length < 4 && (e.innerText || e.textContent || "").toLowerCase().includes(w.toLowerCase())); for (let p = el?.parentElement; p; p = p.parentElement) { const r = p.getBoundingClientRect(); if (r.width && getComputedStyle(p).display !== "none") return p.querySelector(":scope > a,:scope > button,:scope > summary") || p; } return null; }, t); const el = h.asElement(); if (el) { await trigger(el); out[t] = await shown(t); } } };
  await dropdowns();
  for (const b of await page.$$("button,[role=button],[aria-expanded],[aria-controls],summary,label[for]")) {
    if (Object.values(out).every(Boolean)) break;
    const meta = await b.evaluate((e) => ({ v: e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== "none", l: [e.getAttribute("aria-label"), e.textContent, e.id, e.className, e.getAttribute("aria-controls")].join(" ").toLowerCase() }));
    if (!meta.v || !/menu|nav|burger|hamburger|toggle|sidebar|filter|☰|≡|open/.test(meta.l)) continue;
    try { await b.click({ timeout: 700 }); await page.waitForTimeout(350); } catch { continue; }
    for (const t of hidden) if (!out[t]) out[t] = await shown(t);
    await dropdowns();
    try { await b.click({ timeout: 700 }); await page.waitForTimeout(150); } catch {}
  }
  return out;
}

const browser = useAuth(await launchChromium(chromium), authState(args));
const errors = new Set(), failed = new Set();
const results = [];
const must = args.must ? String(args.must).split(",") : [];
let desktopInventory = null;

// the widest desktop viewport defines which content must exist everywhere
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  await go(p, args.url); await p.waitForTimeout(wait);
  desktopInventory = (await p.evaluate(measure, { intentional, must })).inventory.filter(([, v]) => v).map(([t]) => t);
  await ctx.close();
}
for (const [w, h, label, dpr] of matrix) {
  const touch = w <= 1024;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr || 1, hasTouch: touch, isMobile: touch && w < 820 });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && errors.add(m.text().slice(0, 100)));
  page.on("requestfailed", (r) => failed.add(r.url().slice(-70)));
  await go(page, args.url); await page.waitForTimeout(wait);
  const m = await page.evaluate(measure, { intentional, must: desktopInventory });
  const gone = m.inventory.filter(([, v]) => !v).map(([t]) => t);
  const reach = gone.length ? await reveal(page, gone) : {};
  m.unreachable = gone.filter((t) => !reach[t]);
  delete m.inventory;
  results.push({ width: w, height: h, label: label || null, touch, ...m });
  await ctx.close();
}

const sweep = [];
if (!args["no-sweep"]) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 800 } }); const page = await ctx.newPage();
  await go(page, args.url); await page.waitForTimeout(wait);
  for (let w = 320; w <= 1600; w += 16) {
    await page.setViewportSize({ width: w, height: 800 }); await page.waitForTimeout(45);
    const m = await page.evaluate(measure, { intentional, must: [] });
    sweep.push({ w, bad: Math.max(m.overflowPx, m.hiddenOverflowPx) > 2 || m.offscreen.length > 0 || m.clipped.length > 0 || m.overlaps.length > 0 });
  }
  await ctx.close();
}

// screenshots: half-resolution JPEGs; full page + optional scroll-through for sticky / scroll-driven pages
for (const [w, h, label] of matrix.filter(([w, , l]) => !l && [360, 390, 768, 1024, 1280, 1440].includes(w))) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 0.5, hasTouch: w <= 1024, isMobile: w < 820 });
  const page = await ctx.newPage(); await go(page, args.url); await page.waitForTimeout(wait);
  await page.screenshot({ path: path.join(out, `w${w}.jpg`), fullPage: true, type: "jpeg", quality: 45 });
  const n = Number(args["scroll-shots"] || 0);
  if (n && (w === 390 || w === 1280)) {
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let i = 0; i < n; i++) { await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), Math.round(((total - h) * i) / Math.max(1, n - 1))); await page.waitForTimeout(700); await page.screenshot({ path: path.join(out, `scroll-w${w}-${String(i).padStart(2, "0")}.jpg`), type: "jpeg", quality: 45 }); }
  }
  await ctx.close();
}
await browser.close();

// ---- report
const issuesOf = (r) => {
  const i = [];
  if (r.overflowPx > 2) i.push(["critical", "overflow", `${r.overflowPx}px`]);
  if (r.hiddenOverflowPx > 2) i.push(["critical", "hidden-overflow", `${r.hiddenOverflowPx}px cut off by overflow-x:hidden on html/body (widest: ${r.widest})`]);
  r.offscreen.forEach((x) => i.push(["critical", "offscreen", x]));
  r.clipped.forEach((x) => i.push(["critical", "clipped-text", x]));
  r.overlaps.forEach((x) => i.push(["critical", "overlap", x]));
  r.distorted.forEach((x) => i.push(["critical", "distorted-img", x]));
  r.unreachable.forEach((x) => i.push(["critical", "unreachable", x]));
  r.tap.filter((t) => t.critical && r.touch).forEach((t) => i.push(["critical", "tap<24", `${t.el} ${t.w}x${t.h}`]));
  r.tap.filter((t) => !t.critical && r.touch).forEach((t) => i.push(["major", "tap<44", `${t.el} ${t.w}x${t.h}`]));
  r.fixedCover.forEach((x) => i.push(["major", "fixed-cover", x]));
  r.tiny.forEach((x) => i.push(["major", "tiny-text", x]));
  return i;
};
const flat = {};
for (const r of results) for (const [sev, cat, detail] of issuesOf(r)) { const k = `${cat}|${detail.split(" ")[0]}|${detail.slice(0, 40)}`; (flat[k] ||= { sev, cat, detail, widths: [] }).widths.push(r.label || r.width); }
const report = { url: args.url, matrix: results.map((r) => ({ width: r.width, height: r.height, label: r.label, touch: r.touch, issues: issuesOf(r) })), sweep, consoleErrors: [...errors].slice(0, 5), failedRequests: [...failed].slice(0, 5), issues: Object.values(flat) };
fs.writeFileSync(path.join(out, "audit.json"), JSON.stringify(report, null, 1));

console.log("viewport".padEnd(20), "critical".padEnd(9), "major");
for (const r of report.matrix) console.log(`${r.width}x${r.height}${r.label ? " " + r.label : ""}${r.touch ? " T" : ""}`.padEnd(20), String(r.issues.filter((x) => x[0] === "critical").length).padEnd(9), r.issues.filter((x) => x[0] === "major").length);
const ranges = []; for (const s of sweep) if (s.bad) { const l = ranges.at(-1); l && s.w - l.to <= 16 ? (l.to = s.w) : ranges.push({ from: s.w, to: s.w }); }
if (sweep.length) console.log(`\nsweep 320–1600px (16px steps): ${sweep.filter((s) => s.bad).length}/${sweep.length} widths with overflow/offscreen/clipped/overlap` + (ranges.length ? ` → ${ranges.map((r) => `${r.from}–${r.to}`).join(", ")}` : ""));
console.log("\nIssues (grouped; widths in parentheses):");
for (const x of report.issues.sort((a, b) => (a.sev === b.sev ? a.cat.localeCompare(b.cat) : a.sev === "critical" ? -1 : 1)).slice(0, 40)) console.log(` ${x.sev.toUpperCase().padEnd(8)} ${x.cat.padEnd(15)} ${x.detail.slice(0, 80)}  (${x.widths.slice(0, 6).join(",")}${x.widths.length > 6 ? ",…" : ""})`);
if (report.issues.length > 40) console.log(` … ${report.issues.length - 40} more in audit.json`);
if (report.consoleErrors.length) console.log("\nconsole errors:", report.consoleErrors.join(" | "));

if (args.compare) {
  const prev = JSON.parse(fs.readFileSync(args.compare, "utf8")), key = (x) => `${x.cat}|${x.detail.split(" ")[0]}`;
  const before = new Map(prev.issues.map((x) => [key(x), x])), after = new Map(report.issues.map((x) => [key(x), x]));
  const fixed = [...before.keys()].filter((k) => !after.has(k)), added = [...after.keys()].filter((k) => !before.has(k));
  console.log(`\nCOMPARE vs ${args.compare}: ${fixed.length} fixed, ${added.length} NEW, ${[...after.keys()].filter((k) => before.has(k)).length} remaining`);
  added.slice(0, 15).forEach((k) => console.log(`  NEW  ${after.get(k).sev} ${after.get(k).cat} ${after.get(k).detail.slice(0, 70)} (${after.get(k).widths.slice(0, 5).join(",")})`));
}
const crit = report.issues.filter((x) => x.sev === "critical").length;
console.log(`\n${crit ? crit + " critical issue group(s) remain." : "No critical issues in the tested viewports."} Screenshots: ${out}/w*.jpg`);

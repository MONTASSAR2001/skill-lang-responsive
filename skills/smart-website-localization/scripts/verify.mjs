#!/usr/bin/env node
/**
 * Localization verifier (v2). Compares a localized page with its source in a real browser.
 *
 *   node verify.mjs --source <url> --target <url> --lang fr [--glossary glossary.json] [--out dir] [--steps "click:.open;wait:1500"]
 *                   [--intentional ".carousel,.hero-stage"]   containers that clip or scroll on purpose (not reported as clipped text)
 *                   [--source-files a.js,b.js --target-files fr/a.js,fr/b.js]
 *
 * Writes <out>/pairs.tsv (source ⇥ target for the mandatory read-through) and <out>/verify.json. Exit code 1 when critical issues exist.
 * Checks: lang/dir/hreflang · structure parity · string coverage + source-language leakage · head metadata + a11y attributes · real broken
 * assets · NEW clipped text / overflow vs the source at 320/390/768/1280 · protected terms + glossary consistency · interpolation tokens in
 * script files · French typography · Arabic digits + RTL mirroring, LTR islands, directional icons.
 * It cannot judge meaning or tone: read pairs.tsv.
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
if (process.argv.includes("--help") || process.argv.includes("-h")) { console.log("verify.mjs --source <url> --target <url> --lang <code> [--glossary file.json] [--out dir] [--steps \"click:sel;wait:ms\"] [--intentional sel,sel] [--source-files a.js,b.js --target-files x.js,y.js] [--protect A,B]\nCompares a localized page with its source in Chromium. Writes <out>/pairs.tsv and <out>/verify.json; exit code 1 when critical issues exist, 2 on setup errors."); process.exit(0); }
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]]] : a), []));
if (!args.source || !args.target || !args.lang) { console.error("usage: verify.mjs --source <url> --target <url> --lang <code> [--glossary file] [--out dir] [--steps ...]"); process.exit(2); }
checkUrl(args.source); checkUrl(args.target);
const lang = args.lang, rtl = ["ar", "he", "fa", "ur"].includes(lang), out = args.out || "l10n-verify";
fs.mkdirSync(out, { recursive: true });
const glossary = args.glossary ? JSON.parse(fs.readFileSync(args.glossary, "utf8")) : { protect: [], terms: [] };
const protect = [...(glossary.protect || []), ...(args.protect ? String(args.protect).split(",") : [])];
const intentional = args.intentional ? String(args.intentional).split(",") : [];
const issues = []; const add = (sev, code, detail) => issues.push({ sev, code, detail });
const { chromium } = await loadPlaywright();
const browser = await launchChromium(chromium);
const STOP = new Set("the and your you our with from this that will are have has was were their they what when where which would could about into also than then there these those just more most only some such very can't don't won't it's we're you're let's isn't doesn't".split(" "));
const words = (t) => t.toLowerCase().match(/[a-z']{2,}/g) || [];

async function open(url, w = 1280) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } }); const page = await ctx.newPage();
  const failed = []; page.on("response", (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`)); page.on("requestfailed", (r) => failed.push(r.url()));
  const errs = []; page.on("pageerror", (e) => errs.push(String(e).slice(0, 100)));
  await go(page, url); await page.waitForTimeout(400);
  return { ctx, page, failed, errs };
}
/** run `click:sel;wait:ms;press:key` steps so strings that only exist after interaction (dialogs, menus, viewers) are collected */
async function steps(page) { for (const st of String(args.steps || "").split(";").filter(Boolean)) { const [k, ...v] = st.split(":"); const val = v.join(":"); try { if (k === "click") await page.click(val, { timeout: 2000 }); else if (k === "wait") await page.waitForTimeout(+val); else if (k === "press") await page.keyboard.press(val); } catch (e) { add("minor", "step-failed", st); } } }

const collect = () => {
  const items = [], skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]), attrs = ["alt", "title", "placeholder", "aria-label", "value"];
  const pathOf = (el) => { const p = []; for (; el && el !== document.documentElement; el = el.parentElement) p.unshift(el.tagName.toLowerCase() + ([...el.parentElement.children].filter((c) => c.tagName === el.tagName).indexOf(el) + 1)); return p.join(">"); };
  const walk = (n) => {
    if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, " ").trim(); if (t) items.push({ k: "text", t, p: pathOf(n.parentElement), code: !!n.parentElement.closest("pre,code,kbd") }); return; }
    if (n.nodeType !== 1 || skip.has(n.tagName)) return;
    for (const a of attrs) { if (!n.hasAttribute(a) || (a === "value" && !(n.tagName === "INPUT" && /submit|button|reset/.test(n.type)))) continue; const v = n.getAttribute(a).trim(); if (v) items.push({ k: "attr:" + a, t: v, p: pathOf(n) }); }
    n.childNodes.forEach(walk);
  };
  walk(document.body);
  items.push({ k: "head:title", t: document.title, p: "head>title" });
  document.querySelectorAll('meta[name="description"],meta[property^="og:"],meta[name^="twitter:"]').forEach((m) => { const c = (m.content || "").trim(); if (c && !/^(https?:|website|article)/.test(c)) items.push({ k: "head:" + (m.name || m.getAttribute("property")), t: c, p: "head>" + (m.name || m.getAttribute("property")) }); });
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s, i) => { try { const w = (o) => o && typeof o === "object" && Object.entries(o).forEach(([k, v]) => typeof v === "string" && /^(description|headline|text|slogan)$/.test(k) ? items.push({ k: "head:jsonld." + k, t: v, p: `head>ld${i}.${k}` }) : w(v)); w(JSON.parse(s.textContent)); } catch {} });
  return {
    items, text: document.body.innerText, values: [...document.querySelectorAll("input,textarea")].map((e) => e.value).join("\n"),
    lang: document.documentElement.lang, dir: document.documentElement.getAttribute("dir"),
    hreflang: [...document.querySelectorAll('link[rel=alternate][hreflang]')].map((l) => l.hreflang), canonical: document.querySelector("link[rel=canonical]")?.getAttribute("href") || null,
    counts: Object.fromEntries(["a[href]", "button", "input", "select", "textarea", "img", "h1,h2,h3,h4,h5,h6", "li", "form", "table", "nav", "pre", "code"].map((s) => [s, document.querySelectorAll(s).length])),
    pre: [...document.querySelectorAll("pre")].map((p) => p.textContent),
  };
};
const layout = (ignore) => {
  const vw = document.documentElement.clientWidth, de = document.documentElement, res = { overflow: Math.max(0, de.scrollWidth - de.clientWidth), clip: {} };
  const sel = (e) => (e.id ? "#" + e.id : e.tagName.toLowerCase() + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/)[0] : ""));
  for (const e of document.querySelectorAll("body *")) {
    const s = getComputedStyle(e), b = e.getBoundingClientRect(); if (b.width <= 2 || b.height <= 2 || s.display === "none" || s.visibility === "hidden") continue;
    if ((ignore || []).some((q) => { try { return e.matches(q) || e.closest(q); } catch { return false; } })) continue;
    const cx = /(hidden|clip)/.test(s.overflowX), cy = /(hidden|clip)/.test(s.overflowY); if (!(cx || cy) || e.matches("video,img,svg,pre,canvas") || s.textOverflow === "ellipsis") continue;
    let worst = 0; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.width > 0) worst = Math.max(worst, cx ? Math.max(0, r.right - b.right, b.left - r.left) : 0, cy ? Math.max(0, r.bottom - b.bottom, b.top - r.top) : 0); }
    if (worst > 1.5) res.clip[sel(e)] = Math.round(worst);
  }
  return res;
};

const S = await open(args.source), T = await open(args.target);
if (args.steps) { await steps(S.page); await steps(T.page); }
const src = await S.page.evaluate(collect), tgt = await T.page.evaluate(collect);

// 1. document language / direction / alternates
if (!(tgt.lang || "").toLowerCase().startsWith(lang)) add("critical", "html-lang", `lang="${tgt.lang}" (expected ${lang})`);
if (rtl && tgt.dir !== "rtl") add("critical", "html-dir", `dir="${tgt.dir}" (expected rtl)`); if (!rtl && tgt.dir === "rtl") add("critical", "html-dir", "dir=rtl on an LTR language");
if (!tgt.hreflang.length) add("major", "hreflang", "no <link rel=alternate hreflang> (add en/<lang>/x-default) and a visible language switch"); if (tgt.canonical && tgt.canonical === src.canonical) add("minor", "canonical", "canonical still points to the source page");
// 2. structure parity
for (const [k, n] of Object.entries(src.counts)) if (tgt.counts[k] < n) add("critical", "structure-lost", `${k}: ${n} → ${tgt.counts[k]}`);
// 3. pair + read-through file
const key = (i) => i.k + "|" + i.p, tmap = new Map(tgt.items.map((i) => [key(i), i]));
const pairs = src.items.length === tgt.items.length ? src.items.map((s, i) => [s, tgt.items[i]]) : src.items.map((s) => [s, tmap.get(key(s)) || null]);
fs.writeFileSync(path.join(out, "pairs.tsv"), pairs.map(([s, t]) => `${s.k}\t${s.t}\t${t ? t.t : "<<MISSING>>"}\t${t && s.t.length > 12 ? (t.t.length / s.t.length).toFixed(2) : ""}`).join("\n"));
const missing = pairs.filter(([, t]) => !t).length; if (missing) add("major", "strings-unpaired", `${missing} source strings have no counterpart (structure changed?)`);
// 4. leakage / untranslated
const isProtected = (t) => protect.some((p) => t === p) || (protect.some((p) => t.includes(p)) && protect.reduce((r, p) => r.split(p).join(" "), t).replace(/[\W\d_]+/g, "") === ""); // a string made only of protected tokens (e.g. a postal address) stays as is
const noise = (t) => /^[\d\s.,:%$€£°/\-–—+()#⌘⋯✓←→▶▾›‹]*$/.test(t) || /^\S+@\S+\.\S+$/.test(t) || /^(https?:|www\.)/.test(t);
const leaks = [], same = [];
for (const [s, t] of pairs) { if (!t || s.code || isProtected(t.t) || noise(t.t)) continue; const eng = words(t.t).filter((w) => STOP.has(w)).length; if (eng >= 2 || (s.t === t.t && words(t.t).length >= 3)) leaks.push(t.t.slice(0, 70)); else if (s.t === t.t && /[a-z]{3,}/i.test(t.t)) same.push(t.t.slice(0, 40)); }
if (leaks.length) add("critical", "untranslated-sentences", leaks.slice(0, 6)); if (same.length) add("minor", "identical-to-source (cognate or untranslated? review)", same.slice(0, 12));
// 5. head + a11y attributes
for (const [s, t] of pairs) if (/^head:(title|description|og:title|og:description|jsonld)/.test(s.k) && t && s.t === t.t && !isProtected(t.t)) add("critical", "metadata-untranslated", s.k);
const attr = pairs.filter(([s, t]) => /^attr:(alt|aria-label|title|placeholder)/.test(s.k) && t && s.t === t.t && !isProtected(s.t) && !noise(s.t) && /[a-z]{4,}/i.test(s.t)); if (attr.length) add("major", "a11y-attributes-identical", attr.map(([s]) => s.k + ": " + s.t).slice(0, 5));
// 6. real broken assets (lazy-loaded images are not broken: HEAD them)
const broken = await T.page.evaluate(async () => { const bad = []; for (const i of [...document.images].filter((x) => !x.complete || !x.naturalWidth)) { const u = i.currentSrc || i.src; const ok = u && (await fetch(u, { method: "HEAD" }).then((r) => r.ok).catch(() => false)); if (!ok) bad.push(i.getAttribute("src")); } return bad; });
if (broken.length) add("critical", "broken-images", broken.slice(0, 4)); const f404 = [...new Set(T.failed.filter((f) => !S.failed.includes(f)))]; if (f404.length) add("critical", "failed-requests (paths changed in the locale folder?)", f404.slice(0, 4)); if (T.errs.length) add("major", "script-errors", T.errs.slice(0, 2));
// 7. layout fallout: NEW or WORSE clipping / overflow after translation
const lay = [];
for (const w of [320, 390, 768, 1280]) { const row = {}; for (const [n, P] of [["s", S], ["t", T]]) { await P.page.setViewportSize({ width: w, height: 900 }); await P.page.waitForTimeout(150); row[n] = await P.page.evaluate(layout, intentional); }
  if (row.t.overflow > row.s.overflow + 2) add("critical", "overflow-after-translation", `${w}px +${row.t.overflow - row.s.overflow}px`);
  const worse = Object.entries(row.t.clip).filter(([k, v]) => v > (row.s.clip[k] || 0) + 8); if (worse.length) add("critical", "text-clipped-after-translation", `${w}px: ` + worse.slice(0, 3).map(([k, v]) => `${k} cuts ${v}px (source ${row.s.clip[k] || 0}px)`).join("; ")); lay.push({ w, ...row }); }
// 8. protected terms + glossary + interpolation tokens
const flat = tgt.items.map((i) => i.t).join("\n") + "\n" + tgt.text + "\n" + tgt.values;
for (const p of protect) if (src.items.some((i) => i.t.includes(p)) || src.text.includes(p)) if (!flat.includes(p)) add("critical", "protected-term-changed", p);
for (const g of glossary.terms || []) { const fams = (g.targets?.[lang] || []).map((f) => (Array.isArray(f) ? f : [f])); const lead = rtl ? "" : "(?<![\\p{L}])"; let scrub = flat; for (const p of protect) scrub = scrub.split(p).join(" ");
  const used = fams.map((f) => [f[0], f.reduce((n, v) => n + (scrub.match(new RegExp(lead + v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:s|x|es)?(?![\\p{L}])", "giu")) || []).length, 0)]).filter(([, n]) => n); if (used.length > 1) add("major", "term-inconsistent", `${g.source}: ${used.map(([v, n]) => v + "×" + n).join(", ")}`);
  for (const bad of g.forbid?.[lang] || []) if (flat.toLowerCase().includes(bad.toLowerCase())) add("critical", "forbidden-translation", `${g.source}: "${bad}"`); }
if (args["source-files"] && args["target-files"]) { const tok = (f) => (fs.readFileSync(f, "utf8").match(/\$\{[^}]+\}|\{\{[^}]+\}\}|\{[A-Za-z_][\w.]*\}|%[sd]|%\d\$s/g) || []).sort().join("|"); const A = String(args["source-files"]).split(","), B = String(args["target-files"]).split(","); A.forEach((f, i) => { if (B[i] && tok(f).replace(/ /g, "") !== tok(B[i]).replace(/ /g, "")) add("critical", "interpolation-tokens-differ", `${f} vs ${B[i]} (a variable was lost, renamed or added)`); }); }
if (src.pre.length) src.pre.forEach((p, i) => { const strip = (x) => x.split("\n").filter((l) => !/^\s*(#|\/\/)/.test(l)).join("\n"); if (strip(p) !== strip(tgt.pre[i] || "")) add("critical", "code-block-altered", `pre #${i + 1} (only comments may change)`); });
// 9. language-specific
if (lang === "fr") { const miss = (tgt.text.match(/[\p{L}\d)»][ ]?[:;?!»](?=\s|$)/gu) || []).filter((m) => !/[  ]/.test(m)).length; if (miss) add("minor", "fr-typography", `${miss} place(s): no no-break space (U+00A0/U+202F) before : ; ? ! » (and after «), % also takes one`); if (/\b\d+\.\d+\b/.test(tgt.text)) add("major", "fr-decimal-point", "decimal point in French text (use a comma)"); if (/\b(a\.m\.|p\.m\.|miles?|lbs?|°F)\b/.test(tgt.text)) add("major", "locale-conventions", "12-hour clock / imperial units left in French text"); }
if (rtl) {
  const w = (tgt.text.match(/[0-9]/g) || []).length, a = (tgt.text.match(/[٠-٩]/g) || []).length; if (w > 3 && a > 3) add("minor", "mixed-digit-systems", `${w} Western vs ${a} Arabic-Indic digits`);
  await S.page.setViewportSize({ width: 1280, height: 900 }); await T.page.setViewportSize({ width: 1280, height: 900 });
  const marks = "header a:first-child,.logo,[class*=logo],nav,h1,main button,form input,.toast,[class*=toast],[class*=crumb] li:first-child".split(",");
  let checked = 0, bad = [];
  for (const q of marks) { const g = (P) => P.page.$eval(q, (e) => { const r = e.getBoundingClientRect(), vw = document.documentElement.clientWidth; return { l: r.left, r: vw - r.right, w: r.width, vw }; }).catch(() => null); const a = await g(S), b = await g(T); if (!a || !b || a.w > a.vw * 0.8 || Math.abs(a.l - a.r) < 40) continue; checked++; if (a.l < a.r ? Math.abs(b.r - a.l) > 40 : Math.abs(b.l - a.r) > 40) bad.push(q); }
  if (checked >= 2 && bad.length / checked > 0.3) add("critical", "layout-not-mirrored", `${bad.length}/${checked} anchored landmarks keep their LTR side: ${bad.slice(0, 4).join(", ")}`);
  else if (bad.length) add("major", "layout-partly-mirrored", bad.join(", "));
  const ltr = await T.page.evaluate(() => [...document.querySelectorAll("input[type=tel],input[type=email],input[type=url]")].filter((e) => getComputedStyle(e).direction !== "ltr").length); if (ltr) add("major", "ltr-field-direction", `${ltr} tel/email/url field(s) not dir=ltr`);
  const arrows = await T.page.evaluate(() => [...document.querySelectorAll("button,a,.ico,[class*=icon],[class*=arrow]")].map((e) => e.textContent.trim()).filter((t) => /[←→‹›«»◀▶]/.test(t)).slice(0, 8)); if (arrows.length) add("minor", "directional-glyphs-to-review", `confirm each points the right way in RTL (back/next mirrored, play ▶ not): ${arrows.join(" | ")}`);
}
fs.writeFileSync(path.join(out, "verify.json"), JSON.stringify({ issues, layout: lay }, null, 1));
await browser.close();
const order = { critical: 0, major: 1, minor: 2 };
console.log(`strings: ${src.items.length} source / ${tgt.items.length} target · pairs → ${out}/pairs.tsv\n`);
for (const i of issues.sort((a, b) => order[a.sev] - order[b.sev])) console.log(`${i.sev.toUpperCase().padEnd(8)} ${i.code.padEnd(34)} ${JSON.stringify(i.detail).slice(0, 190)}`);
const c = issues.filter((i) => i.sev === "critical").length;
console.log(c ? `\n${c} critical issue(s).` : "\nNo critical automated issues.", "Now READ pairs.tsv: meaning, tone and terminology cannot be verified by a script.");
process.exit(c ? 1 : 0);

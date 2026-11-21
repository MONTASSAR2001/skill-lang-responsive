#!/usr/bin/env node
/**
 * Independent localization judge. NOT part of any skill.
 *   node lab/harness/check-l10n.mjs --id l01-marketing --lang fr --out lab/results/<run>/l01-marketing-fr
 * Compares <base>/<id>/ (English source) with <base>/<id>/<lang>/ in real Chromium and classifies findings as
 * critical / major / minor. Linguistic *quality* is judged separately (lab/rubrics); this covers everything measurable.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? true : all[i + 1]]] : a), []));
const { id, lang } = args;
const base = args.base || "http://localhost:4173/l10n";
const out = args.out || `lab/results/adhoc/${id}-${lang}`;
const man = JSON.parse(fs.readFileSync("lab/manifest-l10n.json", "utf8")).cases.find((c) => c.id === id);
if (!man) { console.error("unknown case " + id); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const srcUrl = man.srcUrl || `${base}/${id}/`, tgtUrl = man.tgtUrl || `${base}/${id}/${lang}/`;
const R = { id, lang, critical: [], major: [], minor: [], notes: [], metrics: {} };
const add = (sev, code, detail) => R[sev].push({ code, detail });

const EN_WORDS = new Set("the and your you our with from this that will are have has was were been their they them what when where which would could should about into over also than then there these those just more most only some such very can't don't won't it's we're you're i'm let's we'll you'll isn't doesn't didn't".split(" "));

/** In-page: collect every translatable string (text nodes + user-facing attributes + head metadata). */
function collect() {
  const items = [];
  const attrs = ["alt", "title", "placeholder", "aria-label", "aria-description", "aria-roledescription", "value"];
  const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
  const pathOf = (el) => { const p = []; for (; el && el.nodeType === 1 && el !== document.documentElement; el = el.parentElement) p.unshift(el.tagName.toLowerCase() + ([...el.parentElement.children].filter((c) => c.tagName === el.tagName).indexOf(el) + 1)); return p.join(">"); };
  const walk = (n) => {
    if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, " ").trim(); if (t) items.push({ kind: "text", text: t, path: pathOf(n.parentElement), code: !!n.parentElement.closest("pre,code,kbd") }); return; }
    if (n.nodeType !== 1 || skip.has(n.tagName)) return;
    for (const a of attrs) {
      if (!n.hasAttribute(a)) continue;
      if (a === "value" && !(n.tagName === "INPUT" && /^(submit|button|reset)$/.test(n.type))) continue;
      const v = n.getAttribute(a).trim(); if (v) items.push({ kind: "attr:" + a, text: v, path: pathOf(n), code: false });
    }
    n.childNodes.forEach(walk);
  };
  walk(document.body);
  const t = document.title.trim(); if (t) items.push({ kind: "head:title", text: t, path: "head>title", code: false });
  document.querySelectorAll('meta[name="description"],meta[property^="og:"],meta[name^="twitter:"]').forEach((m) => { const c = (m.getAttribute("content") || "").trim(); if (c && !/^https?:|^article$|^website$/.test(c) && !/og:(url|type|image|locale)/.test(m.getAttribute("property") || "")) items.push({ kind: "head:" + (m.getAttribute("name") || m.getAttribute("property")), text: c, path: "head>meta:" + (m.getAttribute("name") || m.getAttribute("property")), code: false }); });
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s, i) => { try { const j = JSON.parse(s.textContent); const w = (o, k) => typeof o === "object" && o ? Object.entries(o).forEach(([kk, v]) => (typeof v === "string" && /^(description|headline|text|alternateName|slogan)$/.test(kk) ? items.push({ kind: "head:jsonld." + kk, text: v, path: `head>ld${i}.${kk}`, code: false }) : w(v, kk))) : 0; w(j); } catch {} });
  const pre = [...document.querySelectorAll("pre")].map((p) => p.textContent);
  return {
    items, pre,
    html: { lang: document.documentElement.lang, dir: document.documentElement.dir || getComputedStyle(document.documentElement).direction, dirAttr: document.documentElement.getAttribute("dir") },
    hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => l.hreflang + "=" + l.getAttribute("href")),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") || null,
    counts: Object.fromEntries(["a[href]", "button", "input", "select", "textarea", "option", "img", "h1,h2,h3,h4,h5,h6", "li", "form", "table", "nav", "dialog", "[role]", "pre", "code", "kbd"].map((s) => [s, document.querySelectorAll(s).length])),
    visibleText: document.body.innerText,
  };
}

/** In-page: layout defects visible at the current viewport (overflow / clipped text with amounts / offscreen). */
function layoutDefects(ignore = []) {
  const vw = document.documentElement.clientWidth, de = document.documentElement;
  const sel = (e) => (e.id ? "#" + e.id : e.tagName.toLowerCase() + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/)[0] : ""));
  const vis = (e) => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0; };
  const res = { overflow: Math.max(0, de.scrollWidth - de.clientWidth), clipped: [], clipAmounts: {}, offscreen: [] };
  const inFixed = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).position === "fixed") return true; return false; };
  for (const e of document.querySelectorAll("body *")) {
    if (!vis(e) || /^(SCRIPT|STYLE)$/.test(e.tagName)) continue;
    const s = getComputedStyle(e);
    const clipX = /(hidden|clip)/.test(s.overflowX), clipY = /(hidden|clip)/.test(s.overflowY);
    if (ignore.some((q) => e.matches(q))) continue;
    if ((clipX || clipY) && e.textContent.trim() && !e.matches("pre,video,img,svg,.progress") && s.textOverflow !== "ellipsis" && e !== document.body && e !== de) {
      const box = e.getBoundingClientRect();
      if (box.width <= 2 || box.height <= 2) continue; // visually-hidden (sr-only) helpers are clipped on purpose
      let worst = 0, sample = "";
      const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim() || !vis(n.parentElement)) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const r of rg.getClientRects()) {
          const cutX = clipX ? Math.max(0, r.right - box.right, box.left - r.left) : 0, cutY = clipY ? Math.max(0, r.bottom - box.bottom, box.top - r.top) : 0;
          if (r.width > 0 && Math.max(cutX, cutY) > worst) { worst = Math.max(cutX, cutY); sample = n.textContent.trim().slice(0, 24); }
        }
      }
      if (worst > 1.5) { res.clipped.push(sel(e) + ":" + sample); res.clipAmounts[sel(e)] = Math.round(worst); }
    }
    const r = e.getBoundingClientRect();
    if ((r.right > vw + 2 || r.left < -2) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && s.position !== "fixed" && !inFixed(e) && !e.closest("pre,table,[style*='overflow']")) res.offscreen.push(sel(e));
  }
  return res;
}

const browser = await chromium.launch();
const failed = [], errors = [];
const open = async (url, w = 1280, h = 800) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && errors.push(`${url.slice(-30)} ${m.text().slice(0, 100)}`));
  page.on("pageerror", (e) => errors.push(`${url.slice(-30)} pageerror ${String(e).slice(0, 100)}`));
  page.on("requestfailed", (r) => failed.push(r.url()));
  page.on("response", (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));
  const resp = await page.goto(url, { waitUntil: "load" }).catch(() => null);
  await page.waitForTimeout(300);
  return { ctx, page, status: resp?.status() };
};

const S = await open(srcUrl), T = await open(tgtUrl);
if (T.status !== 200) { add("critical", "target-missing", `${tgtUrl} → ${T.status}`); finish(); }
const src = await S.page.evaluate(collect), tgt = await T.page.evaluate(collect);

// --- html lang/dir/hreflang
const isRtl = lang === "ar";
if (!new RegExp("^" + lang, "i").test(tgt.html.lang)) add("critical", "html-lang", `lang="${tgt.html.lang}" expected ${lang}`);
if (isRtl && tgt.html.dirAttr !== "rtl") add("critical", "html-dir", `dir="${tgt.html.dirAttr}" expected rtl`);
if (!isRtl && tgt.html.dirAttr === "rtl") add("critical", "html-dir", "dir=rtl on an LTR language");
R.metrics.hreflang = tgt.hreflang; R.metrics.canonical = tgt.canonical;

// --- structure preserved (nothing deleted)
for (const [k, n] of Object.entries(src.counts)) {
  if (tgt.counts[k] < n) add("critical", "structure-lost", `${k}: source ${n} → target ${tgt.counts[k]}`);
  else if (tgt.counts[k] > n && !["li", "option", "[role]"].includes(k)) add("minor", "structure-added", `${k}: ${n} → ${tgt.counts[k]}`);
}

// --- pair strings
const key = (i) => i.kind + "|" + i.path;
const tmap = new Map(); tgt.items.forEach((i) => tmap.set(key(i), i));
const pairs = []; let unpaired = 0;
if (src.items.length === tgt.items.length) src.items.forEach((s, i) => pairs.push([s, tgt.items[i]]));
else src.items.forEach((s) => { const t = tmap.get(key(s)); t ? pairs.push([s, t]) : (unpaired++, pairs.push([s, null])); });
if (src.items.length !== tgt.items.length) add("minor", "string-count-differs", `${src.items.length} source strings vs ${tgt.items.length} target (${unpaired} unpaired)`);
fs.writeFileSync(path.join(out, "pairs.tsv"), pairs.map(([s, t]) => `${s.kind}\t${s.text}\t${t ? t.text : "<<MISSING>>"}`).join("\n"));

const allow = new Set((man.noTranslate || []).map((x) => x.toLowerCase()));
const isAllowed = (txt) => { const l = txt.toLowerCase(); return [...allow].some((a) => l === a || l.replace(new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "").replace(/[\W\d_]+/g, "") === ""); };
const words = (t) => t.toLowerCase().match(/[a-z']{2,}/g) || [];

// --- English leakage + untranslated strings
const leaks = [], identical = [];
for (const [s, t] of pairs) {
  if (!t) continue;
  if (s.code) continue; // code is verified separately
  const txt = t.text;
  const enHits = words(txt).filter((w) => EN_WORDS.has(w));
  const same = s.text === t.text;
  if (isAllowed(txt)) continue;
  if (/^[\d\s.,:%$€£°/\-–—+()#⌘⋯✓←→▶▾›‹]*$/.test(txt)) continue;
  if (/^\S+@\S+\.\S+$/.test(txt) || /^(https?:\/\/|www\.)\S+$/.test(txt) || /^[A-Z0-9_\-]{3,}$/.test(txt)) continue;
  if ((man.allowIdentical || []).some((w) => txt === w || txt.includes(w) && txt.replace(w, "").replace(/[\W\d_]+/g, "") === "")) continue;
  if (enHits.length >= 2 || (same && words(txt).length >= 3)) leaks.push({ kind: s.kind, text: txt.slice(0, 80) });
  else if (same && words(txt).length >= 1 && /[a-z]{3,}/i.test(txt) && !/^(https?:|www\.)/.test(txt)) identical.push({ kind: s.kind, text: txt.slice(0, 50) });
}
if (leaks.length) add("critical", "untranslated-sentences", leaks.slice(0, 6));
if (identical.length) add("major", "untranslated-words", identical.slice(0, 10));
R.metrics.leakCount = leaks.length; R.metrics.identicalWords = identical.length; R.metrics.stringsPaired = pairs.length;

// --- manifest content rules
const inputValues = await T.page.evaluate(() => [...document.querySelectorAll("input,textarea")].map((e) => e.value).join("\n"));
const flat = tgt.items.map((i) => i.text).join("\n") + "\n" + tgt.visibleText + "\n" + inputValues;
for (const b of man.badLiteral?.[lang] || []) if (flat.toLowerCase().includes(b.toLowerCase())) add("critical", "known-bad-literal", b);
for (const re of man.mustNotContain?.[lang] || []) if (new RegExp(re, "i").test(flat)) add("critical", "forbidden-pattern", re);
for (const v of man.verbatim?.[lang] || []) if (!flat.includes(v)) add("critical", "protected-term-changed", v);
for (const grp of man.mustContainAny?.[lang] || []) if (!grp.some((g) => flat.includes(g))) add("major", "expected-convention-missing", grp.join(" | "));

// --- terminology consistency (families of morphological variants; whole-word matching; protected names removed first)
{
  let scrub = flat;
  for (const t of (man.noTranslate || []).sort((x, y) => y.length - x.length)) scrub = scrub.split(t).join(" ");
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const lead = lang === "ar" ? "" : "(?<![\\p{L}\\p{M}])"; // Arabic clitics (و ف ب ل) attach to the word
  const count = (term) => (scrub.match(new RegExp(lead + esc(term) + "(?:s|x|es)?(?![\\p{L}\\p{M}])", "giu")) || []).length;
  for (const g of man.termGroups || []) {
    const fams = (g[lang] || []).map((f) => (Array.isArray(f) ? f : [f]));
    const used = fams.map((f) => [f[0], f.reduce((n, v) => n + count(v), 0)]).filter(([, n]) => n > 0);
    const total = used.reduce((n, [, c]) => n + c, 0);
    if (!total) add("major", "term-not-found", `${g.source} (none of ${fams.map((f) => f[0]).join(", ")})`);
    else if (used.length > 1) { const top = Math.max(...used.map(([, c]) => c)); if (top / total < 0.9) add("major", "term-inconsistent", `${g.source}: ${used.map(([v, c]) => `${v}×${c}`).join(", ")}`); }
  }
}

// --- code/pre blocks
if (man.preBlocksVerbatimExceptComments) {
  const strip = (p) => p.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
  src.pre.forEach((p, i) => { if (strip(p) !== strip(tgt.pre[i] || "")) add("critical", "code-block-altered", `pre #${i + 1}`); });
  const codeSrc = src.items.filter((i) => i.code && !/\s{2,}|\n/.test(i.text)).map((i) => i.text);
  const codeTgt = new Set(tgt.items.filter((i) => i.code).map((i) => i.text));
  for (const c of codeSrc) if (!codeTgt.has(c) && !src.pre.some((p) => p.includes(c))) add("critical", "inline-code-altered", c);
}
if (man.noTranslate?.some((t) => /^Order|Payment/.test(t))) for (const c of man.noTranslate) if (!flat.includes(c)) add("critical", "identifier-changed", c);

// --- French typography (minor)
if (lang === "fr") {
  const bad = (flat.match(/[A-Za-zÀ-ÿ0-9)»][ ]?[:;?!»]/g) || []).filter((m) => !/[  ]/.test(m) && !/https?:/.test(m));
  const lone = (tgt.visibleText.match(/\w[:;?!](?=\s|$)/g) || []).filter(() => true);
  if (lone.length > 0) add("minor", "fr-punctuation-spacing", `${lone.length} spots without (narrow) no-break space before : ; ? !`);
  void bad;
}
// --- Arabic digits policy
if (isRtl) {
  const w = (tgt.visibleText.match(/[0-9]/g) || []).length, a = (tgt.visibleText.match(/[٠-٩]/g) || []).length;
  R.metrics.digits = { western: w, arabicIndic: a };
  if (w > 3 && a > 3) add("minor", "mixed-digit-systems", `${w} Western vs ${a} Arabic-Indic digits on the same page`);
}

// --- rendering integrity
const bodyStyle = (p) => p.evaluate(() => { const s = getComputedStyle(document.body); return s.backgroundColor + "|" + s.fontFamily.slice(0, 12); });
if ((await bodyStyle(S.page)) !== (await bodyStyle(T.page))) add("critical", "styles-lost", "body style differs from source (stylesheet path broken?)");
const brokenImgs = await T.page.evaluate(async () => { const bad = []; for (const i of [...document.images].filter((x) => !x.complete || !x.naturalWidth)) { const u = i.currentSrc || i.src; const ok = u && (await fetch(u, { method: "HEAD" }).then((r) => r.ok).catch(() => false)); if (!ok) bad.push(i.getAttribute("src")); } return bad; }); // lazy images are not broken; a failing HEAD is
if (brokenImgs.length) add("critical", "broken-images", brokenImgs);
const f404 = [...new Set(failed.filter((f) => f.includes(`/${id}/`)))];
if (f404.length) add("critical", "failed-requests", f404.slice(0, 4));
if (errors.length) add("major", "console-errors", [...new Set(errors)].slice(0, 3));

// --- layout at several widths: only defects NEW in the translation count
const layoutRows = [];
for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1280, 800]]) {
  const row = {};
  for (const [name, P] of [["src", S], ["tgt", T]]) { await P.page.setViewportSize({ width: w, height: h }); await P.page.waitForTimeout(150); row[name] = await P.page.evaluate(layoutDefects, man.ignoreClip || []); }
  layoutRows.push({ w, src: row.src, tgt: row.tgt });
  if (row.tgt.overflow > 2 && row.tgt.overflow > row.src.overflow + 2) add("critical", "overflow-after-translation", `${w}px: +${row.tgt.overflow - row.src.overflow}px page overflow`);
  const worse = Object.entries(row.tgt.clipAmounts).filter(([k, v]) => v > (row.src.clipAmounts[k] || 0) + 8);
  if (worse.length) add("critical", "text-clipped-after-translation", `${w}px: ` + worse.slice(0, 3).map(([k, v]) => `${k} cuts ${v}px of text (source: ${row.src.clipAmounts[k] || 0}px)`).join(" | "));
  if (row.tgt.offscreen.length > row.src.offscreen.length) add("major", "offscreen-after-translation", `${w}px: ${row.tgt.offscreen.slice(0, 3).join(", ")}`);
}
R.metrics.layout = layoutRows.map((r) => ({ w: r.w, srcOverflow: r.src.overflow, tgtOverflow: r.tgt.overflow, srcClipped: r.src.clipped.length, tgtClipped: r.tgt.clipped.length }));

// --- button/label expansion
const labelLen = (p) => p.evaluate(() => [...document.querySelectorAll("button,.btn,[role=tab],nav a")].map((e) => (e.innerText || "").trim().length));
{ const a = await labelLen(S.page), b = await labelLen(T.page); const worst = a.reduce((m, n, i) => (n > 3 && b[i] ? Math.max(m, b[i] / n) : m), 0); R.metrics.maxLabelExpansion = +worst.toFixed(2); if (man.buttonMaxExpansion && worst > man.buttonMaxExpansion) add("major", "label-too-long", `max label expansion ×${worst.toFixed(2)}`); }

// --- SEO/a11y coverage (l07)
if (man.seoAttrs) {
  const kinds = ["head:title", "head:description", "head:og:title", "head:og:description", "head:twitter:title"];
  for (const k of kinds) { const p = pairs.find(([s]) => s.kind === k); if (!p || !p[1]) add("critical", "seo-missing", k); else if (p[0].text === p[1].text && k !== "head:twitter:title") add("critical", "seo-untranslated", k); }
  const att = pairs.filter(([s]) => /^attr:(alt|aria-label|title|placeholder)/.test(s.kind));
  const un = att.filter(([s, t]) => t && s.text === t.text && !isAllowed(s.text)); if (un.length) add("critical", "a11y-attr-untranslated", un.map(([s]) => s.kind + ":" + s.text).slice(0, 5));
  const sr = pairs.filter(([s]) => /sr-only|visually/.test(s.path) || s.text.includes("items in cart") || s.text.startsWith("Enter your postcode")); void sr;
  if (!tgt.hreflang.length) add("major", "hreflang-missing", "no <link rel=alternate hreflang>"); else if (!tgt.hreflang.some((h) => h.startsWith(lang + "="))) add("major", "hreflang-incomplete", tgt.hreflang.join(","));
  if (tgt.canonical === src.canonical) add("minor", "canonical-not-localized", tgt.canonical);
  const ld = pairs.find(([s]) => s.kind.startsWith("head:jsonld.description")); if (ld && ld[1] && ld[0].text === ld[1].text) add("major", "jsonld-untranslated", ld[0].text);
}

// --- functional probes
async function probe() {
  const p = T.page;
  await p.setViewportSize({ width: 1280, height: 900 });
  if (id === "l04-forms") {
    const msgs = new Set();
    const run = async (setup) => { await p.goto(tgtUrl); await p.evaluate(setup); await p.click("button[type=submit]"); await p.waitForTimeout(80); return p.evaluate(() => { const e = document.getElementById("err"), o = document.getElementById("ok"); return { err: e && !e.hidden ? e.textContent.trim() : "", ok: o && !o.hidden ? o.textContent.trim() : "" }; }); };
    const set = (f) => `(${f})()`;
    const r1 = await run(set(() => { document.getElementById("f").reset(); }));
    const r2 = await run(set(() => { fn.value = "A"; em.value = "bad"; }));
    const r3 = await run(set(() => { fn.value = "A"; em.value = "a@b.co"; pw.value = "short"; }));
    const r4 = await run(set(() => { fn.value = "A"; em.value = "a@b.co"; pw.value = "longenough1"; terms.checked = false; }));
    const r5 = await run(set(() => { fn.value = "A"; em.value = "a@b.co"; pw.value = "longenough1"; terms.checked = true; }));
    [r1, r2, r3, r4].forEach((r, i) => { if (!r.err) add("critical", "validation-message-missing", `case ${i + 1}`); else { msgs.add(r.err); if (/Please|must|Your password/i.test(r.err) && words(r.err).filter((w) => EN_WORDS.has(w)).length >= 1) add("critical", "validation-message-english", r.err); } });
    if (msgs.size < 4) add("critical", "validation-messages-collapsed", `${msgs.size} distinct messages for 4 cases`);
    if (!r5.ok) add("critical", "success-message-missing", ""); else if (words(r5.ok).filter((w) => EN_WORDS.has(w)).length >= 2) add("critical", "success-message-english", r5.ok);
    await p.goto(tgtUrl); await p.fill("#bio", "abcde"); const c = await p.textContent("#counter");
    if (!/5\s*\/\s*140|140.*5|٥/.test(c) || /characters/.test(c)) add("critical", "counter-broken", c);
    R.metrics.probe = { r1, r2, r3, r4, r5: r5.ok, counter: c };
  }
  if (id === "l05-dynamic") {
    const t = await p.evaluate(() => ({ g: greeting.textContent, s: [...summary.children].map((l) => l.textContent), c: [...counts.children].map((l) => ({ n: +l.dataset.n, t: l.textContent })), p: promo.textContent }));
    R.metrics.probe = t;
    const all = t.s.join("\n");
    if (!t.g.includes("Amélie")) add("critical", "variable-lost", "name missing in greeting: " + t.g);
    if (!/(?<![\d,.])5(?![\d])|٥/.test(t.s[0])) add("critical", "variable-lost", "unread count missing: " + t.s[0]);
    if (lang === "fr" && /\$\s?1,?234\.50|1,234\.5/.test(all)) add("critical", "number-format-us-in-target", all.match(/.{0,12}1,?234\.5.{0,6}/)?.[0]);
    if (lang === "fr" && !/234,5/.test(all)) add("major", "number-format", "balance not shown with locale decimal separator");
    if (/03\/14\/2026|04\/01\/2026|\bMarch\b|\bApril\b/.test(all)) add("critical", "date-format-us-in-target", all.match(/.{0,20}(03\/14|04\/01|March|April).{0,12}/)?.[0]);
    if (lang === "fr") {
      const forms = Object.fromEntries(t.c.map((x) => [x.n, x.t]));
      for (const n of [0, 1]) if (/fichiers/.test(forms[n])) add("critical", "plural-wrong", `fr n=${n}: ${forms[n]} (French: 0 and 1 are singular)`);
      for (const n of [2, 5, 11, 21, 101]) if (!/fichiers/.test(forms[n]) && !/fichier/.test(forms[n])) add("major", "plural-unexpected-noun", `n=${n}: ${forms[n]}`); else if (!/fichiers/.test(forms[n])) add("critical", "plural-wrong", `fr n=${n}: ${forms[n]}`);
      if (!/72,4\s?%/.test(all.replace(/ | /g, " "))) add("major", "percent-format", "72,4 % expected");
      if (!/mars/i.test(all)) add("major", "date-format", "French month name expected in 'Last login'");
      if (!/jours?/.test(all) || /days/.test(all)) add("critical", "relative-time-untranslated", all.match(/.{0,10}days.{0,5}/)?.[0] || "");
    } else {
      const stems = new Set(t.c.map((x) => x.t.replace(/[0-9٠-٩]+/g, "").replace(/[\s ]+/g, " ").trim()));
      R.metrics.arPluralForms = stems.size;
      if (stems.size < 4) add("major", "plural-forms-collapsed", `Arabic needs ≥4 distinct noun phrasings across 0,1,2,5,11,101 – got ${stems.size}`);
      if (t.c.some((x) => /files|selected/.test(x.t))) add("critical", "plural-english-leftover", t.c.find((x) => /files|selected/.test(x.t)).t);
    }
    if (!/Pro/.test(t.p)) add("major", "conditional-text", t.p); else if (words(t.p).filter((w) => EN_WORDS.has(w)).length) add("critical", "conditional-english", t.p);
  }
  if (id === "l02-ui") {
    const r = await p.evaluate(() => [...document.querySelectorAll(".nbtn")].map((b) => ({ t: b.textContent.trim(), clipped: b.scrollWidth > b.clientWidth + 1, h: b.scrollHeight > b.clientHeight + 1, title: b.title, al: b.getAttribute("aria-label") })));
    R.metrics.probe = r;
    r.filter((b) => b.clipped || b.h).forEach((b) => add("critical", "button-text-clipped", b.t));
    if (!r.every((b) => !b.title || b.title !== "Copy the shareable link to your clipboard")) add("critical", "tooltip-untranslated", "Copy link title");
  }
  if (id === "l11-restaurant") {
    await p.goto(tgtUrl); await p.click("#r button[type=submit]"); await p.waitForTimeout(80);
    const conf = await p.textContent("#conf"), opts = await p.$$eval("#ps option", (o) => o.map((x) => x.textContent));
    R.metrics.probe = { conf, opts };
    if (/guests?|March|Friday/.test(conf + opts.join(" "))) add("critical", "dynamic-text-english", conf + " | " + opts.join(","));
    if (/\bp\.m\.|\ba\.m\./.test(conf)) add("critical", "time-format", conf);
    if (lang === "fr" && !/(1 personne|1 convive|1 couvert)/i.test(opts[0])) add("major", "plural-or-term", opts[0]);
  }
  if (id === "hale") {
    const ENG = /\b(Size|Add to bag|Added to bag|Fabric|Made in|Front|Back|selected|Fits true|Free shipping|Returns in|Pick a size|Your bag|Checkout|Subtotal|Nothing here|away from|Shipping is on us|drag to turn|Back to the rail|Previous piece|Next piece|Taxes and)\b/;
    await p.goto(tgtUrl); await p.waitForTimeout(2500);
    await p.click(".rk-buy button"); await p.waitForTimeout(2300);
    const v1 = await p.innerText(".pv"); const hit1 = v1.match(ENG);
    if (hit1) add("critical", "viewer-english", hit1[0]);
    await p.click(".pv-add"); await p.waitForTimeout(300);
    const warn = await p.innerText(".pv-sizehead");
    if (ENG.test(warn)) add("critical", "viewer-warning-english", warn);
    await p.click(".pv-sizes button:not(.is-out)"); await p.click(".pv-add"); await p.waitForTimeout(300);
    const added = await p.innerText(".pv-add");
    if (ENG.test(added)) add("critical", "added-english", added);
    await p.click(".pv-close"); await p.waitForTimeout(1800);
    await p.click(".hd-bag"); await p.waitForTimeout(900);
    const bag = await p.innerText(".bag"); const hit2 = bag.match(ENG);
    if (hit2) add("critical", "bag-english", hit2[0]);
    if (/\$\d|\d\.\d\d/.test(bag + v1)) add("major", "money-format-us", (bag + v1).match(/.{0,8}(\$\d|\d\.\d\d).{0,6}/)?.[0]);
    R.metrics.probe = { viewer: v1.slice(0, 300).replace(/\s+/g, " "), added, bag: bag.slice(0, 260).replace(/\s+/g, " ") };
  }
  if (id === "l07-seo-a11y") {
    const sr = await p.$$eval(".sr-only, .skip", (e) => e.map((x) => x.textContent.trim()));
    if (sr.some((t) => words(t).filter((w) => EN_WORDS.has(w)).length >= 1 || /Skip to|items in cart|Enter your/.test(t))) add("critical", "sr-only-untranslated", sr.join(" | "));
  }
}

// --- RTL checks
async function rtlChecks() {
  const r = man.rtl; if (!r) return;
  const p = T.page, s = S.page;
  await p.setViewportSize({ width: 1280, height: 900 }); await s.setViewportSize({ width: 1280, height: 900 });
  const rect = (pg, q) => pg.$eval(q, (e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, w: b.width, vw: document.documentElement.clientWidth }; }).catch(() => null);
  let fails = [];
  for (const q of r.mirror) {
    const a = await rect(s, q), b = await rect(p, q);
    if (!a || !b) { fails.push(q + " (missing)"); continue; }
    const full = a.w > a.vw * 0.8; // full-width blocks mirror onto themselves
    const gapL = a.l, gapR = a.vw - a.r;
    const tol = Math.max(28, a.vw * 0.03);
    if (full || Math.abs(gapL - gapR) < tol) continue; // centred or full width: nothing to mirror
    if (gapL < gapR) { if (Math.abs((b.vw - b.r) - gapL) > tol) fails.push(`${q}: source hugs the left (${Math.round(gapL)}px) but target right-gap is ${Math.round(b.vw - b.r)}px`); }
    else if (Math.abs(b.l - gapR) > tol) fails.push(`${q}: source hugs the right (${Math.round(gapR)}px) but target left-gap is ${Math.round(b.l)}px`);
  }
  R.metrics.mirror = { checked: r.mirror.length, failed: fails };
  if (fails.length >= 3) add("critical", "layout-not-mirrored", fails.slice(0, 5)); else if (fails.length) add("major", "layout-partly-mirrored", fails);
  for (const q of r.ltrControls) { const d = await p.$eval(q, (e) => getComputedStyle(e).direction).catch(() => null); if (d !== "ltr") add("major", "ltr-control-not-ltr", `${q} direction=${d}`); }
  for (const ic of r.flipIcons) {
    const info = await p.$eval(ic.sel, (e) => ({ t: e.textContent.trim(), tr: getComputedStyle(e).transform })).catch(() => null);
    if (!info) { add("major", "icon-missing", ic.sel); continue; }
    const flipped = info.t !== ic.en || (info.tr !== "none" && /matrix\(-1/.test(info.tr));
    if (ic.mustFlip && !flipped) add("critical", "directional-icon-not-mirrored", `${ic.sel} still ${ic.en}`);
    if (!ic.mustFlip && flipped) add("major", "non-directional-icon-mirrored", `${ic.sel} → ${info.t}`);
  }
  if (r.progressFillsFromRight) { const a = await p.$eval(r.progressFillsFromRight, (e) => { const b = e.getBoundingClientRect(), pb = e.parentElement.getBoundingClientRect(); return { gapL: b.left - pb.left, gapR: pb.right - b.right }; }); if (a.gapR > 4) add("major", "progress-direction", `fill starts ${Math.round(a.gapR)}px from the right edge`); }
  const phys = await p.evaluate(() => { let n = 0, tot = 0; for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; } const scan = (rs) => { for (const r of rs) { if (r.cssRules && !r.selectorText) scan(r.cssRules); if (!r.style) continue; tot++; if (/(^|[\s;])(margin-left|margin-right|padding-left|padding-right|border-left|border-right|left|right)\s*:|text-align:\s*(left|right)|float:\s*(left|right)/.test(r.style.cssText) && !/\[dir|:dir\(|:lang\(/.test(r.selectorText || "")) n++; } }; scan(rules); } return { physicalRules: n, totalRules: tot }; });
  R.metrics.physicalCss = phys;
  // visual: text alignment of the main heading should start at the right
  const hAlign = await p.$eval("h1", (e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, vw: document.documentElement.clientWidth, ta: getComputedStyle(e).textAlign, dir: getComputedStyle(e).direction }; });
  if (hAlign.dir !== "rtl") add("critical", "heading-not-rtl", JSON.stringify(hAlign));
  const mixed = await p.evaluate(() => [...document.querySelectorAll("p,li,td")].filter((e) => /[؀-ۿ]/.test(e.textContent) && /[A-Za-z]{2,}/.test(e.textContent)).filter((e) => !e.querySelector("bdi,[dir=ltr],[dir=auto],bdo") && !/unicode-bidi:\s*(isolate|embed|bidi-override)/.test(e.innerHTML)).length);
  if (mixed) add("minor", "mixed-script-not-isolated", `${mixed} elements mix Arabic with Latin runs without <bdi>/dir=ltr isolation`);
}

await probe().catch((e) => add("major", "probe-error", String(e).slice(0, 160)));
if (isRtl) await rtlChecks().catch((e) => add("major", "rtl-probe-error", String(e).slice(0, 160)));

// screenshots for the visual reviewer
for (const [w, h] of [[390, 844], [1280, 800]]) { await T.page.setViewportSize({ width: w, height: h }); await T.page.goto(tgtUrl); await T.page.waitForTimeout(200); await T.page.screenshot({ path: path.join(out, `t${w}.png`), fullPage: true }); }
finish();

async function finish() {
  await browser.close();
  fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(R, null, 1));
  console.log(`${id}/${lang}: critical ${R.critical.length} | major ${R.major.length} | minor ${R.minor.length} | ${[...R.critical].slice(0, 4).map((c) => c.code).join(", ")}`);
  process.exit(0);
}

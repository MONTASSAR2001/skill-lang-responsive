#!/usr/bin/env node
/**
 * Independent responsive judge. NOT part of any skill. Measures a page in real Chromium across a viewport matrix
 * and a fine width sweep, and classifies defects by severity.
 *
 *   node lab/harness/check-responsive.mjs --url http://localhost:4173/responsive/r01-hero/ --id r01-hero \
 *        --out lab/results/<run>/r01-hero [--manifest lab/manifest.json] [--quick]
 *
 * Output: <out>/report.json (+ screenshots). Exit 0 always; read summary.critical for gating.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? true : all[i + 1]]] : a), []));
const url = args.url, id = args.id || "page", out = args.out || `lab/results/adhoc/${id}`;
const manifestPath = args.manifest || "lab/manifest.json";
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : { responsive: [] };
const spec = (manifest.responsive || []).find((c) => c.id === id) || {};
fs.mkdirSync(out, { recursive: true });

const MATRIX = [
  [320, 640], [360, 740], [375, 812], [390, 844], [430, 932], [480, 854], [600, 960], [768, 1024], [820, 1180],
  [1024, 768], [1280, 800], [1440, 900], [1920, 1080], [2560, 1440],
  // special profiles
  [844, 390, "landscape-phone"], [1280, 600, "short-laptop"], [640, 450, "zoom200", 2],
];
const TOUCH_MAX = 1024; // widths <= this are tested with touch emulation too (hasTouch/isMobile)
const SHOT_WIDTHS = new Set([360, 768, 1280]);

/** Runs inside the page. Everything is measured, nothing is assumed from markup. */
function measure(spec) {
  const vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const sel = (el) => {
    if (el.id) return `#${el.id}`;
    const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".") : "";
    return el.tagName.toLowerCase() + (cls ? "." + cls : "");
  };
  const cs = (el) => getComputedStyle(el);
  const visible = (el) => {
    const s = cs(el), r = el.getBoundingClientRect();
    return s.display !== "none" && s.visibility !== "hidden" && +s.opacity > 0 && r.width > 0 && r.height > 0;
  };
  const intentional = (spec.intentionalScrollers || []).map((q) => [...document.querySelectorAll(q)]).flat();
  const inScroller = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      if (intentional.includes(p)) return true;
      const s = cs(p);
      if (p !== el && /(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 1) return true; // a real scroll container contains it
    }
    return false;
  };
  const inFixed = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (cs(p).position === "fixed") return true; return false; };
  const deco = (e) => !!e.closest("[aria-hidden='true']") && !e.matches("input,button,a,select,textarea");
  const all = [...document.querySelectorAll("body *")].filter((e) => !/^(SCRIPT|STYLE|LINK|META|BR|WBR|NOSCRIPT|TEMPLATE|DEFS|PATH|G|LINE|RECT|POLYLINE|CIRCLE|MASK|USE)$/i.test(e.tagName) && visible(e) && !deco(e));
  const hasOwnText = (e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
  const m = { vw, vh };

  // 1. page-level overflow, including overflow hidden by overflow-x:hidden/clip on html/body
  const de = document.documentElement;
  m.docOverflowPx = Math.max(0, de.scrollWidth - de.clientWidth);
  const clipsX = [de, document.body].some((e) => /(hidden|clip)/.test(cs(e).overflowX));
  let maxRight = 0, widest = null;
  for (const e of all) {
    if (inScroller(e)) continue;
    if (cs(e).position === "fixed" || inFixed(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.right > maxRight) { maxRight = r.right; widest = e; }
  }
  m.hiddenOverflowPx = clipsX ? Math.max(0, Math.round(maxRight - vw)) : 0;
  m.contentRightEdgePx = Math.round(maxRight);
  m.widestElement = widest ? sel(widest) : null;

  // 2. elements beyond the viewport horizontally (excluding scrollers/fixed)
  m.offscreen = [];
  for (const e of all) {
    if (inScroller(e) || cs(e).position === "fixed" || inFixed(e)) continue;
    const r = e.getBoundingClientRect();
    if ((r.right > vw + 2 || r.left < -2) && (hasOwnText(e) || /^(IMG|VIDEO|INPUT|BUTTON|SELECT|TEXTAREA|SVG|TABLE)$/i.test(e.tagName))) m.offscreen.push({ el: sel(e), left: Math.round(r.left), right: Math.round(r.right) });
  }
  m.offscreen = m.offscreen.slice(0, 12);

  // 3. text clipped by overflow:hidden/clip — measured on the rendered text boxes themselves
  m.clipped = [];
  const cutOff = (box, r) => r.width > 0 && (r.right > box.right + 1.5 || r.left < box.left - 1.5 || r.bottom > box.bottom + 1.5 || r.top < box.top - 1.5);
  for (const e of all) {
    const s = cs(e);
    const clipX = /(hidden|clip)/.test(s.overflowX), clipY = /(hidden|clip)/.test(s.overflowY);
    if (!(clipX || clipY) || e === document.body || e === de || e.matches("video,img,picture,svg,canvas")) continue;
    if ((spec.ignoreClip || []).some((q) => e.matches(q))) continue;
    if (e.getBoundingClientRect().width <= 2 || e.getBoundingClientRect().height <= 2) continue; // sr-only helpers
    if (/^(auto|scroll)$/.test(s.overflowX) || (s.textOverflow === "ellipsis" && !spec.noEllipsis)) continue;
    const box = e.getBoundingClientRect();
    const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    let bad = null;
    for (let n = walker.nextNode(); n && !bad; n = walker.nextNode()) {
      if (!n.textContent.trim() || !visible(n.parentElement) || n.parentElement.closest("[aria-hidden='true']")) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) {
        const hitsX = clipX && (r.right > box.right + 1.5 || r.left < box.left - 1.5);
        const hitsY = clipY && (r.bottom > box.bottom + 1.5 || r.top < box.top - 1.5);
        if (r.width > 0 && (hitsX || hitsY)) { bad = n.textContent.trim().slice(0, 40); break; }
      }
    }
    if (bad) m.clipped.push({ el: sel(e), sample: bad });
  }
  m.clipped = m.clipped.slice(0, 12);

  // 4. overlaps between sibling-ish content elements (not ancestors), excluding allowlisted pairs
  const content = all.filter((e) => (hasOwnText(e) || /^(IMG|VIDEO|INPUT|SELECT|TEXTAREA|BUTTON)$/i.test(e.tagName)) && cs(e).position !== "fixed" && !inFixed(e) && !e.closest("svg"));
  const allow = (spec.intentionalOverlaps || []).map(([a, b]) => [[...document.querySelectorAll(a)], [...document.querySelectorAll(b)]]);
  m.overlaps = [];
  for (let i = 0; i < content.length && m.overlaps.length < 12; i++) {
    const a = content[i], ra = a.getBoundingClientRect();
    for (let j = i + 1; j < content.length; j++) {
      const b = content[j];
      if (a.contains(b) || b.contains(a)) continue;
      if (spec.overlapIgnoreMedia && (/^(IMG|VIDEO)$/.test(a.tagName) || /^(IMG|VIDEO)$/.test(b.tagName))) continue;
      const rb = b.getBoundingClientRect();
      const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ix <= 2 || iy <= 2) continue;
      const area = ix * iy, small = Math.min(ra.width * ra.height, rb.width * rb.height);
      if (area < 120 || area / small < 0.2) continue;
      if (allow.some(([A, B]) => (A.some((x) => x.contains(a)) && B.some((x) => x.contains(b))) || (A.some((x) => x.contains(b)) && B.some((x) => x.contains(a))))) continue;
      m.overlaps.push({ a: sel(a), b: sel(b), px: Math.round(area) });
    }
  }

  // 5. touch targets
  m.smallTargets = [];
  const inter = all.filter((e) => e.matches("a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[tabindex]:not([tabindex='-1'])"));
  for (const e of inter) {
    if (inScroller(e) && !e.closest("table")) { /* still checked */ }
    const r = e.getBoundingClientRect();
    const inline = e.tagName === "A" && cs(e).display === "inline" && e.closest("p,li,address,span,small,label,figcaption");
    if (inline) continue;
    const lbl = e.closest("label");
    const rr = lbl && e.matches("input[type=checkbox],input[type=radio]") ? lbl.getBoundingClientRect() : r;
    if (Math.min(rr.width, rr.height) < 44 - 0.5) m.smallTargets.push({ el: sel(e), w: Math.round(rr.width), h: Math.round(rr.height), critical: Math.min(rr.width, rr.height) < 24 });
  }
  m.smallTargetCount = m.smallTargets.length;
  m.smallTargets = m.smallTargets.slice(0, 15);

  // 6. text too small
  m.tinyText = [];
  for (const e of all) if (hasOwnText(e) && parseFloat(cs(e).fontSize) < 12) m.tinyText.push({ el: sel(e), px: parseFloat(cs(e).fontSize) });
  m.tinyText = m.tinyText.slice(0, 8);

  // 7. image distortion
  m.distorted = [];
  for (const e of all.filter((x) => x.tagName === "IMG" && x.naturalWidth)) {
    const r = e.getBoundingClientRect(), fit = cs(e).objectFit;
    if (fit && fit !== "fill") continue;
    const nat = e.naturalWidth / e.naturalHeight, ren = r.width / r.height;
    if (Math.abs(nat - ren) / nat > 0.03) m.distorted.push({ el: sel(e), natural: +nat.toFixed(2), rendered: +ren.toFixed(2) });
  }

  // 8. fixed/sticky elements that eat the viewport
  m.fixedCover = [];
  for (const e of all) {
    const s = cs(e);
    if (s.position !== "fixed" && s.position !== "sticky") continue;
    const r = e.getBoundingClientRect();
    const iw = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)), ih = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    if (iw * ih / (vw * vh) > 0.28) m.fixedCover.push({ el: sel(e), pct: Math.round((iw * ih / (vw * vh)) * 100) });
  }

  // 9. must-remain-accessible content (catches "fixed it by hiding it")
  const bodyText = (e) => (e.innerText || e.textContent || "").toLowerCase();
  m.contentStatus = {};
  for (const want of spec.mustRemainAccessible || []) {
    const w = want.toLowerCase();
    const hits = [...document.querySelectorAll("body *")].filter((e) => !e.children.length && bodyText(e).includes(w) || (hasOwnText(e) && bodyText(e).includes(w) && e.children.length === 0));
    const textHits = [...document.querySelectorAll("body *")].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.toLowerCase().includes(w)) || (e.getAttribute("aria-label") || "").toLowerCase().includes(w));
    const pool = textHits.length ? textHits : hits;
    m.contentStatus[want] = !pool.length ? "missing" : pool.some((e) => visible(e) && !e.closest("[hidden],[inert]") && (inScroller(e) || true)) ? "visible" : "hidden";
  }

  // line-length proxy (readability): longest rendered line in paragraphs
  m.maxCharsPerLine = 0;
  for (const p of document.querySelectorAll("p")) {
    const r = p.getBoundingClientRect(); const fs = parseFloat(cs(p).fontSize);
    if (r.width && fs) m.maxCharsPerLine = Math.max(m.maxCharsPerLine, Math.round(r.width / (fs * 0.5)));
  }
  return m;
}

/** Is `want` rendered and inside the viewport right now? */
const shownNow = (page, want) => page.evaluate((w) => [...document.querySelectorAll("body *")].some((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.toLowerCase().includes(w.toLowerCase())) && (() => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && r.right > 0 && r.left < innerWidth && r.bottom > 0; })()), want);

/** Dropdown-style reveal: hover, focus, then click the first link/button of the nearest visible ancestor of the hidden text. */
async function dropdownProbe(page, wants, result) {
  for (const want of wants) {
    if (result[want] === "reachable") continue;
    const handle = await page.evaluateHandle((w) => {
      const el = [...document.querySelectorAll("body *")].find((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.toLowerCase().includes(w.toLowerCase())));
      for (let p = el?.parentElement; p; p = p.parentElement) { const r = p.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && getComputedStyle(p).display !== "none") return p.querySelector(":scope > a, :scope > button, :scope > summary") || p; }
      return null;
    }, want);
    const el = handle.asElement(); if (!el) continue;
    for (const how of ["hover", "focus", "click"]) {
      try { if (how === "hover") await el.hover({ timeout: 800 }); else if (how === "focus") await el.focus({ timeout: 800 }); else await el.click({ timeout: 800 }); } catch { continue; }
      await page.waitForTimeout(250);
      if (await shownNow(page, want)) { result[want] = "reachable"; break; }
    }
  }
}

/** Generic probe: for content hidden at this width, try to reveal it through a menu toggle and/or a dropdown trigger. */
async function revealViaToggle(page, hiddenTexts) {
  const result = {};
  for (const want of hiddenTexts) result[want] = "hidden";
  await dropdownProbe(page, hiddenTexts, result);
  const toggles = await page.$$("button, [role=button], [aria-expanded], [aria-controls], summary, label[for]");
  for (const t of toggles) {
    if (hiddenTexts.every((w) => result[w] === "reachable")) break;
    const meta = await t.evaluate((e) => ({ vis: !!(e.getBoundingClientRect().width && getComputedStyle(e).visibility !== "hidden" && getComputedStyle(e).display !== "none"), label: ((e.getAttribute("aria-label") || "") + " " + (e.textContent || "") + " " + (e.getAttribute("aria-controls") || "") + " " + (e.id || "") + " " + (e.className || "")).toLowerCase() }));
    if (!meta.vis || !/menu|nav|burger|hamburger|toggle|sidebar|☰|≡|filters|open/.test(meta.label)) continue;
    try { await t.click({ timeout: 800 }); await page.waitForTimeout(350); } catch { continue; }
    for (const want of hiddenTexts) if (result[want] !== "reachable" && (await shownNow(page, want))) result[want] = "reachable";
    await dropdownProbe(page, hiddenTexts, result);
    try { await t.click({ timeout: 800 }); await page.waitForTimeout(150); } catch {}
  }
  return result;
}

/** Scroll the whole page once so scroll-triggered reveals (opacity 0 → 1) have fired, then return to the top. */
async function warm(page) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 600) { await page.evaluate((yy) => scrollTo({ top: yy, behavior: "instant" }), y); await page.waitForTimeout(90); }
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" })); await page.waitForTimeout(500);
}

const browser = await chromium.launch();
const consoleErrors = [], failed = [];
const viewports = [];
for (const [w, h, label, dpr] of MATRIX) {
  for (const touch of w <= TOUCH_MAX ? [true] : [false]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr || 1, hasTouch: touch, isMobile: touch && w < 820 });
    const page = await ctx.newPage();
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(`${w}: ${m.text().slice(0, 120)}`));
    page.on("requestfailed", (r) => failed.push(`${r.url().slice(-60)}`));
    await page.goto(url, { waitUntil: "load" });
    await page.waitForTimeout(args.quick ? 150 : 450);
    if (spec.warmScroll) await warm(page);
    const m = await page.evaluate(measure, spec);
    // reveal probe for content hidden at this width
    const hiddenWants = Object.entries(m.contentStatus).filter(([, v]) => v === "hidden").map(([k]) => k);
    if (hiddenWants.length) {
      const r = await revealViaToggle(page, hiddenWants);
      for (const [k, v] of Object.entries(r)) if (v === "reachable") m.contentStatus[k] = "reachable";
    }
    if (!args.quick && SHOT_WIDTHS.has(w) && !label) {
      await page.screenshot({ path: path.join(out, `w${w}.png`), fullPage: true });
    }
    viewports.push({ w, h, label: label || null, dpr: dpr || 1, touch, ...m });
    await ctx.close();
  }
}

// fine sweep: where does horizontal overflow begin/end (finds gaps the fixed matrix misses)
const sweep = [];
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" });
  if (spec.warmScroll) await warm(page);
  for (let w = 320; w <= 1600; w += args.quick ? 64 : 16) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.waitForTimeout(40);
    const r = await page.evaluate(measure, spec);
    sweep.push({ w, overflow: Math.max(r.docOverflowPx, r.hiddenOverflowPx), clipped: r.clipped.length, overlaps: r.overlaps.length, offscreen: r.offscreen.length });
  }
  await ctx.close();
}
await browser.close();

const bad = (s) => s.overflow > 2 || s.clipped > 0 || s.overlaps > 0 || s.offscreen > 0;
const ranges = [];
for (const s of sweep) if (bad(s)) { const last = ranges.at(-1); last && s.w - last.to <= 16 ? (last.to = s.w) : ranges.push({ from: s.w, to: s.w }); }

// severity summary
const crit = (v) => {
  const c = [];
  if (v.docOverflowPx > 2) c.push(`overflow:${v.docOverflowPx}px`);
  if (v.hiddenOverflowPx > 2) c.push(`hidden-overflow:${v.hiddenOverflowPx}px`);
  if (v.offscreen.length) c.push(`offscreen:${v.offscreen.length}`);
  if (v.clipped.length) c.push(`clipped:${v.clipped.length}`);
  if (v.overlaps.length) c.push(`overlap:${v.overlaps.length}`);
  if (v.distorted.length) c.push(`distorted-img:${v.distorted.length}`);
  if (v.smallTargets.some((t) => t.critical)) c.push(`tap<24:${v.smallTargets.filter((t) => t.critical).length}`);
  const gone = Object.entries(v.contentStatus).filter(([, s]) => s === "missing" || s === "hidden").map(([k]) => k);
  if (gone.length) c.push(`content-unreachable:${gone.join("|")}`);
  return c;
};
const perVp = viewports.map((v) => ({ w: v.w, h: v.h, label: v.label, touch: v.touch, critical: crit(v), tapMajor: v.touch ? v.smallTargetCount : 0, tiny: v.tinyText.length, fixedCover: v.fixedCover.length }));
const summary = {
  id, url,
  criticalViewports: perVp.filter((p) => p.critical.length).length,
  totalViewports: perVp.length,
  failingSweepRanges: ranges,
  sweepFailingWidths: sweep.filter(bad).length,
  sweepTotalWidths: sweep.length,
  tapMajorTotal: perVp.reduce((a, p) => a + p.tapMajor, 0),
  tinyTextViewports: perVp.filter((p) => p.tiny).length,
  fixedCoverViewports: perVp.filter((p) => p.fixedCover).length,
  consoleErrors: [...new Set(consoleErrors)].slice(0, 5),
  failedRequests: [...new Set(failed)].slice(0, 5),
};
fs.writeFileSync(path.join(out, "report.json"), JSON.stringify({ summary, perViewport: perVp, viewports, sweep }, null, 1));
console.log(`${id}: criticalViewports ${summary.criticalViewports}/${summary.totalViewports} | sweep ${summary.sweepFailingWidths}/${summary.sweepTotalWidths} bad widths ${JSON.stringify(ranges).slice(0, 90)} | tapMajor ${summary.tapMajorTotal} | tiny ${summary.tinyTextViewports} | fixedCover ${summary.fixedCoverViewports} | errors ${summary.consoleErrors.length}`);

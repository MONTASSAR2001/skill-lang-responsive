#!/usr/bin/env node
/**
 * Inventory the translatable strings of a site.
 *   node extract-strings.mjs --url <url> --out strings.json [--steps "click:.open;wait:1500"] [--source-dir ./src]
 *
 * 1. Rendered strings: text nodes, alt/title/placeholder/aria-label, <title>, meta, JSON-LD — at load and again after `--steps`
 *    (so dialogs, drawers, viewers and menus that only exist after interaction are captured; run it several times with different steps).
 * 2. --source-dir: scans .js/.jsx/.ts/.tsx/.html/.json/.vue/.svelte files for human-looking string literals that the rendered inventory
 *    did NOT contain (validation messages, toasts, plural/conditional branches, templates, error states). These are the strings
 *    most often forgotten. The list is candidates, not truth: skim it and decide.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

async function loadPlaywright() {
  for (const t of [process.env.PLAYWRIGHT_MODULE, "playwright", "playwright-core"].filter(Boolean)) { try { return await import(t.startsWith("/") ? t + "/index.mjs" : t); } catch {} }
  try { return await import(createRequire(process.cwd() + "/").resolve("playwright")); } catch {}
  console.error("Playwright not found (npm i -D playwright, or PLAYWRIGHT_MODULE=/path/to/playwright)."); process.exit(2);
}
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]]] : a), []));
if (!args.url) { console.error("usage: extract-strings.mjs --url <url> [--out strings.json] [--steps ...] [--source-dir dir]"); process.exit(2); }
const { chromium } = await loadPlaywright();
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto(args.url, { waitUntil: "load" }); await p.waitForTimeout(600);

const grab = (stage) => p.evaluate((stage) => {
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

let items = await grab("load");
for (const st of String(args.steps || "").split(";").filter(Boolean)) {
  const [k, ...v] = st.split(":"); const val = v.join(":");
  try { if (k === "click") await p.click(val, { timeout: 2500 }); else if (k === "wait") await p.waitForTimeout(+val); else if (k === "press") await p.keyboard.press(val); else if (k === "fill") { const [s, t] = val.split("="); await p.fill(s, t); } } catch { console.error("step failed:", st); }
}
if (args.steps) items = items.concat(await grab("after-steps"));
await b.close();
const seen = new Set(); items = items.filter((i) => { const k = i.type + "|" + i.text; if (seen.has(k)) return false; seen.add(k); return true; });

let candidates = [];
if (args["source-dir"]) {
  const known = new Set(items.map((i) => i.text.toLowerCase()));
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
const file = args.out || "strings.json";
fs.writeFileSync(file, JSON.stringify({ rendered: items, sourceCandidates: candidates }, null, 1));
const by = items.reduce((a, i) => ((a[i.type] = (a[i.type] || 0) + 1), a), {});
console.log(`${items.length} rendered strings → ${file}`, by);
if (args["source-dir"]) { console.log(`${candidates.length} candidate strings found in source but NOT in the rendered inventory (check these):`); candidates.slice(0, 25).forEach((c) => console.log("  ", path.relative(process.cwd(), c.file) + ":", c.text)); if (candidates.length > 25) console.log(`  … ${candidates.length - 25} more in ${file}`); }

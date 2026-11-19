#!/usr/bin/env node
// Inventory the translatable strings of a rendered page.
//   node extract-strings.mjs --url http://localhost:3000/ --out strings.json
import fs from "node:fs";
import { createRequire } from "node:module";

async function loadPlaywright() {
  for (const t of [process.env.PLAYWRIGHT_MODULE, "playwright", "playwright-core"].filter(Boolean)) { try { return await import(t.startsWith("/") ? t + "/index.mjs" : t); } catch {} }
  try { return await import(createRequire(process.cwd() + "/").resolve("playwright")); } catch {}
  console.error("Playwright not found (npm i -D playwright, or set PLAYWRIGHT_MODULE)."); process.exit(2);
}
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]]] : a), []));
if (!args.url) { console.error("usage: extract-strings.mjs --url <url> [--out strings.json]"); process.exit(2); }
const { chromium } = await loadPlaywright();
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto(args.url, { waitUntil: "load" }); await p.waitForTimeout(500);
const items = await p.evaluate(() => {
  const out = [], skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);
  const walk = (n) => {
    if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, " ").trim(); if (t) out.push({ type: "text", text: t, tag: n.parentElement.tagName.toLowerCase() }); return; }
    if (n.nodeType !== 1 || skip.has(n.tagName)) return;
    for (const a of ["alt", "title", "placeholder", "aria-label"]) if (n.getAttribute(a)) out.push({ type: "attr:" + a, text: n.getAttribute(a), tag: n.tagName.toLowerCase() });
    n.childNodes.forEach(walk);
  };
  walk(document.body);
  out.push({ type: "head:title", text: document.title });
  document.querySelectorAll('meta[name=description],meta[property^="og:"]').forEach((m) => out.push({ type: "head:" + (m.name || m.getAttribute("property")), text: m.content }));
  return out;
});
await b.close();
const file = args.out || "strings.json";
fs.writeFileSync(file, JSON.stringify(items, null, 1));
const by = items.reduce((a, i) => ((a[i.type] = (a[i.type] || 0) + 1), a), {});
console.log(`${items.length} strings → ${file}`, by);

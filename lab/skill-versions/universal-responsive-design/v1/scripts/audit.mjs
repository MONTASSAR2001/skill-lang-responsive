#!/usr/bin/env node
// Responsive audit: renders a URL across a viewport matrix in Chromium and reports layout problems.
//   node audit.mjs --url http://localhost:3000/ --out ./responsive-audit/before [--widths 320,375,768,1280]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

async function loadPlaywright() {
  const tries = [process.env.PLAYWRIGHT_MODULE, "playwright", "playwright-core"].filter(Boolean);
  for (const t of tries) { try { return await import(t.startsWith("/") ? t + "/index.mjs" : t); } catch {} }
  try { return createRequire(process.cwd() + "/").call ? await import(createRequire(process.cwd() + "/").resolve("playwright")) : null; } catch {}
  console.error("Playwright not found. Run `npm i -D playwright && npx playwright install chromium` or set PLAYWRIGHT_MODULE."); process.exit(2);
}
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]]] : a), []));
if (!args.url) { console.error("usage: audit.mjs --url <url> --out <dir> [--widths a,b,c]"); process.exit(2); }
const out = args.out || "responsive-audit";
fs.mkdirSync(out, { recursive: true });
const widths = (args.widths || "320,360,375,390,430,480,600,768,820,1024,1280,1440,1920,2560").split(",").map(Number);
const heightFor = (w) => (w < 500 ? 800 : w < 900 ? 1000 : 900);
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const results = [];

for (const w of widths) {
  const touch = w <= 1024;
  const ctx = await browser.newContext({ viewport: { width: w, height: heightFor(w) }, hasTouch: touch, isMobile: touch && w < 820, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 120)));
  await page.goto(args.url, { waitUntil: "load" });
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const sel = (e) => (e.id ? "#" + e.id : e.tagName.toLowerCase() + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/)[0] : ""));
    const vis = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden"; };
    const all = [...document.querySelectorAll("body *")].filter(vis);
    const overflowPx = Math.max(0, document.documentElement.scrollWidth - vw);
    const outside = all.filter((e) => e.getBoundingClientRect().right > vw + 1 && getComputedStyle(e).position !== "fixed").slice(0, 10).map((e) => sel(e) + " right=" + Math.round(e.getBoundingClientRect().right));
    const small = all.filter((e) => e.matches("a,button,input,select,textarea,summary")).filter((e) => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height) < 44; }).length;
    const tiny = all.filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12).length;
    return { overflowPx, outside, smallTargets: small, tinyText: tiny };
  });
  const shot = path.join(out, `w${w}.jpg`);
  const half = await browser.newContext({ viewport: { width: w, height: heightFor(w) }, deviceScaleFactor: 0.5 });
  const hp = await half.newPage(); await hp.goto(args.url, { waitUntil: "load" }); await hp.waitForTimeout(300);
  await hp.screenshot({ path: shot, fullPage: true, type: "jpeg", quality: 45 }); await half.close();
  results.push({ width: w, touch, ...m, consoleErrors: errors.length });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(out, "audit.json"), JSON.stringify(results, null, 1));
console.log("width  overflow  outside  smallTargets  tinyText");
for (const r of results) console.log(String(r.width).padEnd(6), String(r.overflowPx).padEnd(9), String(r.outside.length).padEnd(8), String(r.smallTargets).padEnd(13), r.tinyText);
const bad = results.filter((r) => r.overflowPx > 1 || r.outside.length);
console.log(bad.length ? `\n${bad.length} viewport(s) with overflow/outside elements: ${bad.map((b) => b.width).join(", ")}` : "\nNo horizontal overflow in the tested widths.");

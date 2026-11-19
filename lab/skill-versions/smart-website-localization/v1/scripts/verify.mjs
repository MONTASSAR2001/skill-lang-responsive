#!/usr/bin/env node
// Compare a localized page with its source page.
//   node verify.mjs --source http://localhost:3000/ --target http://localhost:3000/fr/ --lang fr
import { createRequire } from "node:module";

async function loadPlaywright() {
  for (const t of [process.env.PLAYWRIGHT_MODULE, "playwright", "playwright-core"].filter(Boolean)) { try { return await import(t.startsWith("/") ? t + "/index.mjs" : t); } catch {} }
  try { return await import(createRequire(process.cwd() + "/").resolve("playwright")); } catch {}
  console.error("Playwright not found."); process.exit(2);
}
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]]] : a), []));
if (!args.source || !args.target || !args.lang) { console.error("usage: verify.mjs --source <url> --target <url> --lang <code>"); process.exit(2); }
const { chromium } = await loadPlaywright();
const b = await chromium.launch();
const STOP = new Set("the and your you our with from this that will are have has was were their they what when where which would could about into also than then there these those just more most only some such very".split(" "));
const grab = async (url, w = 1280) => {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  const failed = []; p.on("requestfailed", (r) => failed.push(r.url())); p.on("response", (r) => r.status() >= 400 && failed.push(r.url()));
  await p.goto(url, { waitUntil: "load" }); await p.waitForTimeout(400);
  const d = await p.evaluate(() => ({
    lang: document.documentElement.lang, dir: document.documentElement.getAttribute("dir"),
    text: document.body.innerText, title: document.title,
    counts: Object.fromEntries(["a[href]", "button", "input", "img", "h1,h2,h3", "li", "form"].map((s) => [s, document.querySelectorAll(s).length])),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    brokenImgs: [...document.images].filter((i) => !i.naturalWidth).length,
  }));
  return { p, failed, ...d };
};
const S = await grab(args.source), T = await grab(args.target);
const issues = [];
if (!T.lang.startsWith(args.lang)) issues.push(`html lang is "${T.lang}", expected ${args.lang}`);
if (["ar", "he", "fa", "ur"].includes(args.lang) && T.dir !== "rtl") issues.push('dir="rtl" missing');
for (const [k, n] of Object.entries(S.counts)) if (T.counts[k] < n) issues.push(`structure: ${k} ${n} → ${T.counts[k]}`);
const lines = T.text.split("\n").map((l) => l.trim()).filter(Boolean);
const english = lines.filter((l) => (l.toLowerCase().match(/[a-z']{3,}/g) || []).filter((w) => STOP.has(w)).length >= 2);
if (english.length) issues.push(`${english.length} line(s) still look English: ${english.slice(0, 3).map((l) => JSON.stringify(l.slice(0, 50))).join(", ")}`);
if (T.title === S.title) issues.push("document title unchanged");
if (T.brokenImgs) issues.push(`${T.brokenImgs} broken image(s)`);
if (T.failed.length) issues.push(`failed requests: ${[...new Set(T.failed)].slice(0, 3).join(", ")}`);
for (const w of [390, 768]) { const t = await grab(args.target, w); if (t.overflow > 1) issues.push(`horizontal overflow ${t.overflow}px at ${w}px`); }
await b.close();
console.log(issues.length ? "ISSUES:\n- " + issues.join("\n- ") : "No automated issues found.");

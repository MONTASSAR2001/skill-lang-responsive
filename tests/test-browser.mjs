// Real-browser tests: every bundled script is executed against purpose-built fixtures (tests/fixtures).
// Positive AND negative cases: the tools must flag broken pages and stay quiet on good ones.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { suite, ROOT, SKILLS_DIR, node, nodeAsync, mktemp } from "./lib.mjs";

const t = suite("browser");
const AUDIT = path.join(SKILLS_DIR, "universal-responsive-design", "scripts", "audit.mjs");
const VERIFY = path.join(SKILLS_DIR, "smart-website-localization", "scripts", "verify.mjs");
const EXTRACT = path.join(SKILLS_DIR, "smart-website-localization", "scripts", "extract-strings.mjs");
const FIX = path.join(ROOT, "tests", "fixtures");

// is a browser available at all? (a missing browser is a SKIP, never a pass)
const probe = node([AUDIT, "--url", "file:///does-not-matter", "--widths", "320", "--no-sweep", "--out", mktemp()], { timeout: 60000 });
if (/Playwright is not installed|Could not start Chromium/.test(probe.stderr)) { t.skip("all browser tests", probe.stderr.split("\n")[0] + " (run: npm i && npx playwright install chromium)"); t.finish(); }

const server = http.createServer((req, res) => {
  const f = path.join(FIX, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!f.startsWith(FIX) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("404"); }
  res.writeHead(200, { "Content-Type": f.endsWith(".html") ? "text/html; charset=utf-8" : f.endsWith(".js") ? "text/javascript" : "text/plain" });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const out = (n) => path.join(mktemp("slr-out-"), n);
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

try {
  // ---------------- responsive audit ----------------
  const A = ["--widths", "320,390,768,1280", "--wait", "200"];
  const bDir = out("broken");
  const broken = await nodeAsync([AUDIT, "--url", `${base}/responsive/broken.html`, "--out", bDir, ...A], { timeout: 180000 });
  t.check("audit (broken page): runs and writes audit.json", broken.status === 0 && fs.existsSync(path.join(bDir, "audit.json")), broken.stderr);
  const bj = fs.existsSync(path.join(bDir, "audit.json")) ? read(path.join(bDir, "audit.json")) : { issues: [], sweep: [] };
  const cats = new Set(bj.issues.map((i) => i.cat));
  t.check("audit (broken): reports horizontal overflow", cats.has("overflow") || cats.has("offscreen"), [...cats].join(","));
  t.check("audit (broken): reports clipped text measured on text boxes", cats.has("clipped-text"), [...cats].join(","));
  t.check("audit (broken): reports touch targets below 24 px as critical", bj.issues.some((i) => i.cat === "tap<24"), [...cats].join(","));
  t.check("audit (broken): the width sweep lists failing widths", bj.sweep.some((s) => s.bad), "no bad width in sweep");
  t.check("audit (broken): writes screenshots", fs.readdirSync(bDir).some((f) => f.endsWith(".jpg")));

  const fDir = out("fixed");
  const fixed = await nodeAsync([AUDIT, "--url", `${base}/responsive/fixed.html`, "--out", fDir, "--compare", path.join(bDir, "audit.json"), ...A], { timeout: 180000 });
  const fj = read(path.join(fDir, "audit.json"));
  t.check("audit (fixed page): zero critical issues (no false positives)", fixed.status === 0 && fj.issues.filter((i) => i.sev === "critical").length === 0, fj.issues.filter((i) => i.sev === "critical").map((i) => i.cat + ":" + i.detail).join("; "));
  const cmp = fixed.stdout.match(/COMPARE .*?: (\d+) fixed, (\d+) NEW/);
  t.check("audit --compare: reports fixed issues and 0 NEW", !!cmp && +cmp[1] > 0 && +cmp[2] === 0, cmp ? cmp[0] : fixed.stdout.slice(-200));
  t.check("audit (fixed page): sweep is clean", fj.sweep.every((s) => !s.bad), "bad widths: " + fj.sweep.filter((s) => s.bad).map((s) => s.w).join(","));

  const unreachable = await nodeAsync([AUDIT, "--url", "http://127.0.0.1:9/", "--widths", "320", "--no-sweep", "--out", out("u")], { timeout: 90000 });
  t.check("audit: unreachable URL exits 2 with a clear message (no stack trace)", unreachable.status === 2 && /Cannot load/.test(unreachable.stderr) && !/\n\s+at /.test(unreachable.stderr), `exit ${unreachable.status}: ${unreachable.stderr.slice(0, 160)}`);

  // ---------------- string extraction ----------------
  const eFile = path.join(mktemp("slr-ex-"), "strings.json");
  const ex = await nodeAsync([EXTRACT, "--url", `${base}/l10n/en.html`, "--out", eFile, "--source-dir", path.join(FIX, "l10n")], { timeout: 120000 });
  const ej = fs.existsSync(eFile) ? read(eFile) : { rendered: [], sourceCandidates: [] };
  t.check("extract-strings: finds rendered text, attributes and head metadata", ej.rendered.some((i) => i.text === "Clothes that last") && ej.rendered.some((i) => i.type === "attr:placeholder") && ej.rendered.some((i) => i.type === "head:title"), ex.stderr);
  t.check("extract-strings --source-dir: surfaces a string that never renders", ej.sourceCandidates.some((c) => /valid email address/.test(c.text)), JSON.stringify(ej.sourceCandidates).slice(0, 200));

  // ---------------- localization verifier ----------------
  const V = async (target, lang, extra = []) => { const d = out("v"); const r = await nodeAsync([VERIFY, "--source", `${base}/l10n/en.html`, "--target", `${base}/l10n/${target}.html`, "--lang", lang, "--out", d, ...extra], { timeout: 180000 }); const rep = fs.existsSync(path.join(d, "verify.json")) ? read(path.join(d, "verify.json")) : { issues: [] }; return { r, d, codes: rep.issues.filter((i) => i.sev === "critical").map((i) => i.code) }; };
  const good = await V("fr-good", "fr");
  t.check("verify (good French): exit 0, no critical issue", good.r.status === 0 && good.codes.length === 0, good.codes.join(",") + good.r.stderr);
  t.check("verify: writes pairs.tsv for the mandatory read-through", fs.existsSync(path.join(good.d, "pairs.tsv")) && fs.readFileSync(path.join(good.d, "pairs.tsv"), "utf8").split("\n").length >= 8);
  const bad = await V("fr-bad", "fr");
  t.check("verify (untranslated page tagged lang=fr): exit 1 + untranslated-sentences", bad.r.status === 1 && bad.codes.includes("untranslated-sentences"), bad.codes.join(","));
  const clip = await V("fr-clip", "fr");
  t.check("verify (longer French in a fixed-height box): flags text-clipped-after-translation", clip.codes.includes("text-clipped-after-translation"), clip.codes.join(","));
  const brand = await V("fr-brand", "fr", ["--protect", "Acme"]);
  t.check("verify --protect: flags a translated/renamed protected term", brand.codes.includes("protected-term-changed"), brand.codes.join(","));
  const noLang = await (async () => { const d = out("v"); const r = await nodeAsync([VERIFY, "--source", `${base}/l10n/en.html`, "--target", `${base}/l10n/fr-good.html`, "--lang", "de", "--out", d]); const j = read(path.join(d, "verify.json")); return j.issues.filter((i) => i.sev === "critical").map((i) => i.code); })();
  t.check("verify: wrong lang attribute is critical", noLang.includes("html-lang"), noLang.join(","));

  // ---------------- Arabic / RTL ----------------
  const arGood = await V("ar-good", "ar");
  t.check("verify (good Arabic RTL): exit 0, dir=rtl and mirrored layout accepted", arGood.r.status === 0 && arGood.codes.length === 0, arGood.codes.join(",") + arGood.r.stderr);
  const arBad = await V("ar-bad", "ar");
  t.check("verify (Arabic without dir=rtl): flags html-dir", arBad.r.status === 1 && arBad.codes.includes("html-dir"), arBad.codes.join(","));
  const arUn = await V("ar-unmirrored", "ar");
  t.check("verify (dir=rtl but layout not mirrored): flags layout-not-mirrored", arUn.codes.includes("layout-not-mirrored"), arUn.codes.join(","));
  const arJson = read(path.join(arGood.d, "verify.json"));
  t.check("verify (Arabic): LTR-field and directional-glyph reviews are produced without crashing", Array.isArray(arJson.issues));
} finally { server.close(); }
t.finish();

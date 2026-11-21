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

const API = { en: ["Water the plant every week", "Keep it away from direct sunlight", "Repot it in early spring", "Wipe the leaves with a damp cloth"], fr: ["Arrosez la plante chaque semaine", "Gardez-la à l’abri du soleil direct", "Rempotez-la au début du printemps", "Essuyez les feuilles avec un chiffon humide"] };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/l10n/api/items") { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ items: (API[u.searchParams.get("lang")] || API.en).map((title, id) => ({ id, title })) })); }
  if (u.pathname === "/gated/dashboard.html" && !/(^|; )sid=ok/.test(req.headers.cookie || "")) { res.writeHead(302, { Location: "/gated/login.html" }); return res.end(); }
  const f = path.join(FIX, decodeURIComponent(u.pathname));
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

  // ---------------- content that comes from the API, crawling and residue (the "only the interface was translated" failure) ----------------
  const readAll = (d) => (fs.existsSync(path.join(d, "verify.json")) ? read(path.join(d, "verify.json")) : { issues: [] }).issues;
  const dApi = out("vapi"); await nodeAsync([VERIFY, "--source", `${base}/l10n/api-en.html`, "--target", `${base}/l10n/api-fr-bad.html`, "--lang", "fr", "--out", dApi], { timeout: 180000 });
  t.check("verify: French UI over an English-only API is flagged api-content-not-localized", readAll(dApi).some((i) => i.code === "api-content-not-localized"), JSON.stringify(readAll(dApi).map((i) => i.code)));
  const dApiOk = out("vapi2"); await nodeAsync([VERIFY, "--source", `${base}/l10n/api-en.html`, "--target", `${base}/l10n/api-fr-good.html`, "--lang", "fr", "--out", dApiOk], { timeout: 180000 });
  t.check("verify: a localized API response is NOT flagged (no false positive)", !readAll(dApiOk).some((i) => i.code === "api-content-not-localized") && !readAll(dApiOk).some((i) => i.sev === "critical"), JSON.stringify(readAll(dApiOk).map((i) => i.code)));

  const xFile = path.join(mktemp("slr-api-"), "s.json");
  await nodeAsync([EXTRACT, "--url", `${base}/l10n/api-en.html`, "--out", xFile], { timeout: 120000 });
  const xj = read(xFile);
  t.check("extract-strings: records strings that only exist in a JSON API response, with endpoint and path", xj.apiStrings.some((a) => a.endpoint === "/l10n/api/items" && a.path === "$.items[].title" && /Water the plant/.test(a.text)), JSON.stringify(xj.apiStrings).slice(0, 200));

  const rBad = path.join(mktemp("slr-res-"), "r.json");
  const resBad = await nodeAsync([EXTRACT, "--url", `${base}/l10n/api-fr-bad.html`, "--residue", "fr", "--out", rBad], { timeout: 120000 });
  const rb = read(rBad);
  t.check("extract-strings --residue: English API text behind a French page is reported and exits 1", resBad.status === 1 && rb.residue.api.length >= 3, `exit ${resBad.status} api=${rb.residue && rb.residue.api.length}`);
  const rGood = path.join(mktemp("slr-res-"), "r.json");
  const resGood = await nodeAsync([EXTRACT, "--url", `${base}/l10n/api-fr-good.html`, "--residue", "fr", "--out", rGood], { timeout: 120000 });
  t.check("extract-strings --residue: a fully French page with a French API exits 0", resGood.status === 0, `exit ${resGood.status}: ${resGood.stdout.slice(-300)}`);

  const cFile = path.join(mktemp("slr-crawl-"), "c.json");
  const crawl = await nodeAsync([EXTRACT, "--url", `${base}/l10n/site-fr.html`, "--crawl", "6", "--residue", "fr", "--out", cFile], { timeout: 180000 });
  const cj = read(cFile);
  t.check("extract-strings --crawl: follows same-origin links only", cj.pages.length === 3 && cj.pages.every((p) => p.url.startsWith(base)), cj.pages.map((p) => p.url).join(" "));
  t.check("extract-strings --crawl --residue: finds the untranslated page deeper in the site", crawl.status === 1 && cj.residue.dom.some((d) => d.page === "/l10n/fr-bad.html") && !cj.residue.dom.some((d) => d.page === "/l10n/site-fr.html"), `exit ${crawl.status}: ` + JSON.stringify(cj.residue.perPage));

  // ---------------- pages behind a login ----------------
  const stateFile = path.join(mktemp("slr-auth-"), "auth.json");
  fs.writeFileSync(stateFile, JSON.stringify({ cookies: [{ name: "sid", value: "ok", domain: "127.0.0.1", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] }));
  const aOut = path.join(mktemp("slr-auth-"), "a.json");
  const noAuth = await nodeAsync([EXTRACT, "--url", `${base}/gated/dashboard.html`, "--out", aOut], { timeout: 120000 });
  t.check("without --storage-state a login redirect is detected and warned about (not silently audited)", /redirected to a login screen/.test(noAuth.stderr) && read(aOut).rendered.some((i) => i.text === "Sign in"), noAuth.stderr.slice(0, 200));
  const withAuth = await nodeAsync([EXTRACT, "--url", `${base}/gated/dashboard.html`, "--storage-state", stateFile, "--out", aOut], { timeout: 120000 });
  t.check("extract-strings --storage-state: reads the authenticated page, no login warning", withAuth.status === 0 && read(aOut).rendered.some((i) => i.text === "Secret dashboard") && !/login/.test(withAuth.stderr), withAuth.stderr.slice(0, 200));
  const aAudit = out("aa"); const auditAuth = await nodeAsync([AUDIT, "--url", `${base}/gated/dashboard.html`, "--storage-state", stateFile, "--widths", "390", "--no-sweep", "--wait", "100", "--out", aAudit], { timeout: 120000 });
  t.check("audit --storage-state: audits the authenticated page without the login warning", auditAuth.status === 0 && !/login/.test(auditAuth.stderr), auditAuth.stderr.slice(0, 200));
  const vAuth = out("va"); await nodeAsync([VERIFY, "--source", `${base}/gated/dashboard.html`, "--target", `${base}/gated/dashboard.html`, "--lang", "en", "--storage-state", stateFile, "--out", vAuth], { timeout: 120000 });
  t.check("verify --storage-state: loads gated pages for both source and target", fs.existsSync(path.join(vAuth, "pairs.tsv")) && /Secret dashboard/.test(fs.readFileSync(path.join(vAuth, "pairs.tsv"), "utf8")), "pairs.tsv missing or showing the login page");
  const missing = await nodeAsync([EXTRACT, "--url", `${base}/gated/dashboard.html`, "--storage-state", path.join(stateFile, "..", "nope.json")], { timeout: 60000 });
  t.check("--storage-state with a missing file: exit 2 and an actionable message", missing.status === 2 && /playwright codegen --save-storage/.test(missing.stderr), `exit ${missing.status}: ${missing.stderr.slice(0, 160)}`);
} finally { server.close(); }
t.finish();

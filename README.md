# Agent Skills: responsive design + website localization

Two production-oriented [Agent Skills](https://docs.claude.com/en/docs/claude-code/skills) for Claude Code that work from **real browser measurements**, not from reading code:

| Skill | What it does |
|---|---|
| [`universal-responsive-design`](skills/universal-responsive-design) | Audits an existing site across 17 viewports plus a 320→1600 px width sweep, finds overflow, clipped text, overlaps, distorted media, tiny touch targets and content that became unreachable, applies a per-component fix strategy, and proves the result with a before/after regression diff. |
| [`smart-website-localization`](skills/smart-website-localization) | Localizes a whole site (tested: French, Arabic/RTL) with context, tone, glossary, locale conventions, plurals/dates/numbers, SEO + accessibility text, hreflang, RTL mirroring, and a verifier that catches layout damage caused by longer text. Includes a mandatory side-by-side review step. |

They are independent. When both are installed, localization hands layout fallout (text expansion, RTL) to the responsive skill, which re-audits every locale.

## Install

Each skill is a standard directory (`SKILL.md` + `references/` + `scripts/`). Copy it into one of:

```bash
cp -r skills/universal-responsive-design skills/smart-website-localization ~/.claude/skills/        # all projects
cp -r skills/universal-responsive-design skills/smart-website-localization <project>/.claude/skills/  # one project
```
(`.claude/skills/` in this repo already contains the same copies.) Start a new Claude Code session so they are discovered.

**Requirements:** Node ≥ 18 and Playwright with Chromium for the bundled scripts:
```bash
npm i -D playwright && npx playwright install chromium     # or: export PLAYWRIGHT_MODULE=/path/to/playwright
```

## Use

In Claude Code, invoke by name or just describe the task (both are also triggered by their descriptions):

```
/universal-responsive-design  Make http://localhost:3000 responsive; code is in ./src. Check the nav and pricing table.
/smart-website-localization   Localize this site into French (vous) and Arabic. Brand names stay Latin. Source in ./src.
```

The scripts also run standalone:

```bash
node skills/universal-responsive-design/scripts/audit.mjs --url http://localhost:3000/ --out ./audit/before
node skills/universal-responsive-design/scripts/audit.mjs --url http://localhost:3000/ --out ./audit/after --compare ./audit/before/audit.json
node skills/smart-website-localization/scripts/extract-strings.mjs --url http://localhost:3000/ --source-dir ./src --out strings.json
node skills/smart-website-localization/scripts/verify.mjs --source http://localhost:3000/ --target http://localhost:3000/fr/ --lang fr --out ./l10n-verify
```
Options for each script are documented at the top of the file (`--intentional`, `--steps`, `--glossary`, `--scroll-shots`, …).

## What has been proven (and what has not)

Measured by independent judge scripts (`lab/harness`, frozen copies included) against 13 responsive and 11 localization benchmark cases with planted defects, split into dev and held-out sets:

* **Responsive, dev (10 cases):** viewports with a critical defect 163 → 2 (the 2 are an adjudicated judge false positive); touch targets under 44 px 608 → 0.
* **Responsive, held-out (3 unseen pages):** critical viewports 11/17/17 → 0/0/0 after the frozen workflow.
* **Localization, dev (14 case/language pairs):** the one failing class (French text clipped by fixed-height cards) fixed; a review pass caught a meaning change no script can detect.
* **Localization, held-out (docs, restaurant; fr + ar):** no real critical issues after the frozen workflow.
* Real-world check: a scroll-driven Next.js shop (since removed from this repo, see below) — mobile navigation that had no replacement, a footer rail cut off at 760–930 px (found only by the width sweep), hotspot and touch-target defects, and its French build — all fixed and verified.

**Not proven:** native-speaker quality (French/Arabic wording was reviewed by the same model family), real devices, Safari/Firefox, screen readers, languages other than fr/ar. Full details, caveats and the false-positive adjudications: [`docs/06-final-assessment.md`](docs/06-final-assessment.md).

## Repository layout

```
skills/            the two skills (canonical source)
.claude/skills/    the same skills, installed for this repo
lab/               reusable benchmark: cases, manifests, judges, rubrics, baselines,
                   per-version outputs and results of every run (see docs/02)
docs/              testing strategy, benchmark environment, per-skill reports with
                   evolution, combined test, final assessment
```

Skill versions: responsive v1 → v2 → v3, localization v1 → v2 → v2.1 → v2.2 (`lab/skill-versions/`, checksums in `FREEZE-before-heldout.md5` and `FINAL-skills.md5`).

## About the test website

The real-world test subject was a Next.js replica of a third-party demo shop (built with the Pixel Clone skill). It has been **removed from the current tree** because it is not part of the skills; it is preserved in git history at commit `2cfc203` (`git checkout 2cfc203 -- hale-site`). Its results remain documented in `docs/` and `lab/results/` (entries marked `real` in the manifests); the benchmark commands below do not need it. Note: some benchmark pages (`lab/assets`) and result screenshots still show imagery from that third-party demo template — replace them with your own images before any reuse beyond this evidence repo.

## Run the benchmark

See [`docs/02-benchmark-environment.md`](docs/02-benchmark-environment.md): `node lab/serve.mjs`, then `lab/harness/run-responsive.mjs` / `run-l10n.mjs` against `dev` or `heldout` cases, and `compare.mjs` to diff two runs. Held-out cases must be run once, on a frozen skill version.

## License

No license file is included yet; add the one you want before publishing for reuse.

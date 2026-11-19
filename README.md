# Two tested Agent Skills: responsive design + website localization

| | |
|---|---|
| `skills/universal-responsive-design/` | Analyze, fix and verify the responsiveness of any existing site, from real browser measurements |
| `skills/smart-website-localization/` | Localize a whole site (French, Arabic/RTL, …) with context, terminology, locale conventions, SEO/a11y and RTL layout |
| `hale-site/` | The real-world test subject: Next.js replica of https://studio.smartduke.com/demo/hale built with the (untouched) Pixel Clone skill; also hosts the French build at `/fr` |
| `lab/` | The reusable benchmark: 13 responsive cases, 11 localization cases, independent judges, rubrics, frozen results of every skill version |
| `docs/` | Strategy, environment, per-skill reports with evolution, combined test, honest final assessment |

Start with `docs/06-final-assessment.md`, then the two skill reports. Raw evidence: `lab/results/`.

## Invoke the skills

The skills are standard Agent Skills directories (`SKILL.md` + `references/` + `scripts/`). Copy or symlink them into `~/.claude/skills/` (all projects) or
`<project>/.claude/skills/` (one project; already done in this repo) and start a new Claude Code session so they are discovered. Then:

```
/universal-responsive-design  Make http://localhost:3000 responsive; the code is in ./src. Check the nav and the pricing table especially.
/smart-website-localization   Localize this site into French (vous) and Arabic. Brand names stay Latin. Source in ./src, dev server on :3000.
```
Both are also triggered by description (e.g. "this page breaks on mobile", "translate the site to French"). They are independent; when both are available the
localization skill hands layout fallout (text expansion, RTL) to the responsive skill, which re-audits each locale.
Requirements: Node ≥ 18 and Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`, or `PLAYWRIGHT_MODULE=/path/to/playwright`).

> In the session that built these skills the Skill tool could not see skills created mid-session (the registry is loaded at start). The skills were therefore *executed by following
> their SKILL.md and bundled scripts literally*; see the limitations in `docs/06-final-assessment.md`.

## Use the benchmark

See `docs/02-benchmark-environment.md` (4 commands to run a new skill version against the same tests and compare).

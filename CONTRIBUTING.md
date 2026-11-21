# Contributing

Thanks for helping. The short version:

1. Fork, then `npm install && npx playwright install chromium`.
2. Edit skills only in `skills/` (never in `plugins/`, which is generated). Run `npm run sync`.
3. Run `npm test`. All checks must pass; do not weaken a check to make it pass. If a tool you lack (claude, gemini) skips a test, say so in the pull request.
4. Keep the Agent Skills spec rules: `name` equals the directory, `description` says what it does and when to use it, SKILL.md under 500 lines, references one level deep, relative paths only, no platform-specific features in the core.
5. Behaviour changes to a skill should come with evidence: a failing fixture or benchmark case first, then the fix (`docs/development.md`, `lab/`).
6. Compatibility claims need a source (vendor docs link) and a status (`Executed` or `Documented`, `docs/compatibility.md`).

Full guide: [`docs/development.md`](docs/development.md). Security issues: [`SECURITY.md`](SECURITY.md).

# Development, testing and releasing

## Layout and the one rule

Edit skills **only** in `skills/`. Then regenerate the Claude Code plugin payloads:

```bash
npm install            # installs the pinned dev dependency (playwright)
npx playwright install chromium
npm run sync           # regenerates plugins/ and .claude-plugin/marketplace.json
npm test               # everything this machine can run
```

## Tests

| Command | What runs | Needs |
|---|---|---|
| `npm run check` (`--static`) | Agent Skills spec rules (frontmatter, name/directory, lengths, links, references), plugin + marketplace integrity and sync, script hygiene (syntax, `--help`, error exits, no eval/hardcoded paths, identical bootstrap), installer for 7 targets x 2 scopes | Node |
| `npm run test:browser` | Each script against fixtures in real Chromium: broken vs fixed responsive page, `--compare`, string extraction, French good/bad/clipped/brand, Arabic good/no-dir/unmirrored | Playwright + Chromium |
| `npm run test:claude` | `claude plugin validate` + isolated-HOME marketplace add, install, discovery, uninstall for all 3 plugins (`TEST_REMOTE=1` installs from GitHub instead) | `claude` CLI |
| `npm run test:gemini` | Gemini CLI installs and lists both skills | `gemini` CLI |
| `node tests/run.mjs --strict` | all of the above; a skipped check fails the run | |

Every check prints `PASS`, `FAIL` or `SKIP`; a skipped check is never a pass.

### Adding a skill

1. Create `skills/<name>/SKILL.md` (frontmatter: `name` = directory, `description`, `license`, `compatibility`, `metadata.version`), plus `references/` and `scripts/` as needed.
2. Add it to `PLUGINS` in `tools/sync-plugins.mjs` (and `SKILL_BLURB`), run `npm run sync`.
3. Add fixtures and browser tests if it ships scripts; update `docs/compatibility.md` if platform behaviour matters.
4. `npm test`.

### Benchmark (lab/)

`lab/` is the evidence base: planted-defect cases, independent judges, rubrics and every run's results. Changing a skill's behaviour should be justified there: run the dev cases, compare with `lab/harness/compare.mjs`, and run held-out cases once on a frozen version. See `docs/evaluation/02-benchmark-environment.md`.

## Versioning

Semantic Versioning, one version in `package.json`.

- **patch**: wording, docs, bug fixes in scripts.
- **minor**: new checks, options, references, targets.
- **major**: breaking changes to script flags, output formats, skill names or plugin identifiers.

Claude Code plugins pin `version`; users only receive an update when it changes, so **every release must bump the version**.

## Release process

```bash
git checkout main && git pull
node tools/bump-version.mjs <patch|minor|major>   # package.json + metadata.version in every SKILL.md + regenerates plugins/
npm test                                            # full suite (needs claude, gemini and chromium locally; otherwise rely on CI)
$EDITOR CHANGELOG.md                                # move "Unreleased" notes under the new version
git add -A && git commit -m "Release vX.Y.Z" && git tag vX.Y.Z
git push origin main --tags
```
Pushing the tag triggers `.github/workflows/release.yml`: it checks that the tag equals the package version, runs the full suite, zips `skills/`, and creates the GitHub release with generated notes.

After the release, verify installation from GitHub:

```bash
TEST_REMOTE=1 node tests/run.mjs --claude
```

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request: static checks and browser tests on Ubuntu, macOS and Windows, and a Claude Code plugin job (validator + isolated install) on Ubuntu, with `--strict` where all tools are present.

# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning: [SemVer](https://semver.org/).

## [1.1.0] - 2026-11-22

Fixes from a real-world run of the skills on a full-stack app (React storefront + API + admin app).

### Fixed
- **Localization skill only covered the markup.** On a real app the interface was translated while headings, tables and cards stayed English because they came from the API, from strings in page code and from bundled content, and new text typed in the admin app would have stayed English too. The skill now requires a content-source inventory (markup, JS strings, API/CMS data, bundled content, content added later, authenticated screens), has a new reference `references/dynamic-content.md` (server-side localization, fallback, caching, a translation queue with human approval for sensitive text, a build-time coverage check), and a rule that the work is not finished until a crawl of the running site shows no source-language residue.
- **Scripts could not audit pages behind a login.** All three scripts accept `--storage-state <file>` (Playwright storage state, scoped per origin) and warn loudly when a run lands on a login page instead of measuring it silently.
- Docs: how to recover when a plugin installed mid-session is not offered by the `Skill` tool (`/reload-plugins`, namespaced names).

### Added
- `extract-strings.mjs`: records strings returned by JSON API calls (endpoint + JSON path), `--crawl N` to inventory every route, `--residue <lang>` to list text still in the source language per page and per endpoint (exit 1 if any), `--protect`.
- `verify.mjs`: `api-content-not-localized` when the localized page receives the same human text from the API as the source page.
- 12 new real-browser tests (API-backed good/bad pages, crawl, residue, login redirect, storage state, missing state file) and a drift check for the shared auth block.
- `.gitignore`: `auth*.json`, `storage-state*.json`.

## [1.0.0] - 2026-11-21

### Removed
- Benchmark screenshots and recordings (~200 MB, 866 files) from the working tree, because a 123 MB shallow clone took 85-110 s on a ~1 MB/s link and exceeded Claude Code's 120 s marketplace clone timeout. They remain in git history (tag `evidence-media-v1.0.0`; see `lab/MEDIA.md`).
- Duplicate `.claude/skills/` copy of the skills.

### Added
- Claude Code plugin marketplace `skill-lang-responsive` with three plugins: `responsive-localization` (both skills), `universal-responsive-design`, `smart-website-localization`.
- Cross-agent installer `scripts/install.mjs` (targets: claude, agents, cursor, vscode, codex, antigravity, gemini) with copy/link modes, dry run, uninstall and overwrite protection.
- Validation suite (`tests/`): Agent Skills spec rules, plugin/marketplace integrity and sync, script hygiene, installer, real-browser tests (responsive, localization, Arabic RTL), Claude Code and Gemini CLI install/discovery tests; GitHub Actions CI (Linux, macOS, Windows) and release workflow.
- Documentation: compatibility matrix, per-platform install guides, architecture, troubleshooting, development/release guide, security policy, audit report.
- MIT license, `package.json`, `.gitattributes` (LF endings), pinned Playwright dev dependency.
- Skill scripts: `--help`, URL validation, friendly errors with exit code 2, cross-platform Playwright resolution (local, global, `PLAYWRIGHT_MODULE`).

### Changed
- `SKILL.md` frontmatter now includes `license`, `compatibility`, `metadata`; scripts are referenced as `<skill-dir>/scripts/...` with an explicit Setup section instead of an unresolvable `<skill>` placeholder.
- Evaluation reports moved to `docs/evaluation/`; benchmark judges import `playwright` instead of a machine-specific path.
- `skills/` is the single source of truth; plugin payloads are generated and checked for drift.

### Removed
- Duplicate `.claude/skills/` copy (replaced by the plugin and the installer).
- The Hale test site (earlier, still in git history at commit `2cfc203`).

### Fixed
- Playwright loader failed on absolute Windows paths and gave raw stack traces for unreachable URLs or a missing browser.
- A dangling reference to material outside the skill ("lab-style questions") in the responsive skill.

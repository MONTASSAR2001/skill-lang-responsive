# Audit of the original repository (v0, commit `e7485d0`) and what changed

Scope: both skills, every script and reference, plugin/installation story, cross-platform behaviour, security and documentation. Everything below was measured or executed; nothing is inferred from the file names.

## Findings

| # | Area | Finding | Severity | Resolution (v1.0.0) |
|---|---|---|---|---|
| 1 | Distribution | No plugin or marketplace manifest. Claude Code users had to copy folders by hand; the README claimed discovery that was never tested | High | `.claude-plugin/marketplace.json` + 3 generated plugins; validated with `claude plugin validate`; install and discovery executed in an isolated HOME |
| 2 | Spec compliance | `SKILL.md` frontmatter had only `name` and `description`; no `license`, `compatibility` or `metadata`; no check that name = directory, lengths, links or references | Medium | Spec-complete frontmatter; `tests/validate-skills.mjs` enforces the published rules (46 checks) |
| 3 | Portability | Commands used `node <skill>/scripts/...`, a placeholder no agent can resolve; nothing said where scripts live for non-Claude agents | High | `<skill-dir>` defined in a Setup section of each skill; a test forbids the old placeholder |
| 4 | Windows | Playwright loader tested `t.startsWith("/")` for absolute paths, which fails on `C:\...`; resolution only looked next to the script | High | Shared bootstrap: `PLAYWRIGHT_MODULE`, normal import, project `node_modules`, global npm root; uses `path`/`pathToFileURL` |
| 5 | Error handling | Unreachable URL or missing Chromium produced raw stack traces; no URL validation; no `--help` | Medium | Friendly messages, exit code 2 for setup errors, `--help`, only `http(s)`/`file` URLs; covered by tests |
| 6 | Dangling reference | The responsive skill pointed to "`lab`-style questions", a document outside the skill | Low | Inlined the checklist |
| 7 | Duplication | A third copy of both skills in `.claude/skills/` besides `skills/` and `lab/skill-versions/` | Medium | Removed; `skills/` is the single source, plugins are generated and drift-checked |
| 8 | Hardcoded paths | The benchmark judges imported Playwright from an absolute path on the author's machine | Medium | Now `import "playwright"` (declared dev dependency); frozen copies kept byte-identical |
| 9 | Quality gates | Tests existed only as benchmark harnesses; no CI, no clean-install test, no cross-OS run | High | `tests/` (validators, installer, real browser, Claude Code, Gemini CLI) and GitHub Actions on Linux/macOS/Windows |
| 10 | Legal / metadata | No LICENSE, no package manifest, no `.gitattributes` (CRLF risk on Windows) | Medium | MIT license, `package.json` with pinned Playwright, `.gitattributes` forcing LF |
| 11 | Docs | One README mixing evidence and usage; no platform-specific instructions, no compatibility matrix, no security or contribution guidance | Medium | README rewritten; `docs/compatibility.md`, `docs/install/*`, architecture, troubleshooting, development, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md` |
| 12 | Security | `PLAYWRIGHT_MODULE` loads code from an env path; scripts navigate to arbitrary URLs and run page JavaScript; `--steps` clicks | Informational | Documented with guidance in `SECURITY.md`; no process spawning other than the fixed `npm root -g`; tests assert it |
| 13 | Accuracy | Evaluation reports described the real-world site and the Skill tool limitation but mixed them with usage docs | Low | Moved to `docs/evaluation/`, unchanged in content |

Checked and found **fine**: no hardcoded user paths in the skills; no `eval`; all scripts pass `node --check`; `claude plugin validate` accepted the skills directory even before the changes; the skills contain no Claude-specific features (no `${CLAUDE_*}` variables), so the content already worked in any agent.

## Not changed on purpose

- Skill behaviour, workflows, references and measurement logic were **not rewritten**. The scripts' checks and output formats are as benchmarked (`docs/evaluation/`); only the shared bootstrap (loading Playwright, errors, `--help`) changed.
- Benchmark evidence (`lab/`) is preserved as history.

## Honest limits of this audit

- Cursor, VS Code Copilot, Antigravity and Codex were **not executable** here; their support is documented, not tested (`docs/compatibility.md`).
- The official `skills-ref` validator could not be installed; `tests/validate-skills.mjs` is our implementation of the published rules.
- Windows and macOS behaviour is covered by CI configuration, but only Linux was executed locally.

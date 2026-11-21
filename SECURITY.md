# Security

## What these skills do

They instruct an AI coding agent and ship three Node.js scripts (`audit.mjs`, `verify.mjs`, `extract-strings.mjs`) that open a URL in a local Chromium via Playwright and read the rendered page. A skill's instructions become part of your agent's context, so treat installing one like installing code: read `SKILL.md` first.

## Properties you can verify (`npm run check`)

- No Node-side `eval`/`new Function`; the only process the scripts spawn is the fixed command `npm root -g` (to find a global Playwright). No network access except the URL you pass; no telemetry.
- Scripts accept only `http:`, `https:` and `file:` URLs, write only inside `--out` (default: a local folder) and read only the directories you pass (`--source-dir`, `--source-files`).
- The Claude Code plugins contain skills only: **0 hooks, 0 MCP servers, 0 commands, 0 agents** (see `claude plugin details`). Nothing runs on install.
- The installer only copies into skill directories and refuses to overwrite or delete a directory that is not a skill (tested).

## Risks and guidance

| Risk | Guidance |
|---|---|
| The browser executes the target page's JavaScript | Run the scripts only against sites you own or may test; use a dev server, not production with credentials. Chromium runs with its default sandbox |
| `PLAYWRIGHT_MODULE` and a project's `node_modules` are loaded as code | Only point it at a package you trust |
| `--steps "click:..."` clicks things on the page | Do not use it on pages where a click has side effects (checkout, delete); use a staging copy |
| Skills influence agent behaviour (prompt injection via page content) | The agent reads page text; do not give it production secrets while auditing untrusted pages. Skills never ask for credentials |
| Agent permission prompts | Keep your tool's shell/command confirmation enabled; the scripts need no elevated rights |
| Supply chain | `playwright` is pinned in `devDependencies` with a lockfile; the skills themselves have no runtime dependencies |

## Reporting a vulnerability

Please open a private security advisory at https://github.com/MONTASSAR2001/skill-lang-responsive/security/advisories/new (or an issue without exploit details if advisories are unavailable). Include the version, the platform, and steps to reproduce.

# Install in Claude Code (native plugin marketplace)

**Status: ✅ executed** with Claude Code 2.1.325: validator, marketplace add, install, discovery and uninstall in an isolated HOME (`npm run test:claude`).

## Install

```bash
claude plugin marketplace add MONTASSAR2001/skill-lang-responsive
claude plugin install responsive-localization@skill-lang-responsive
```

Identifiers (marketplace `skill-lang-responsive`, owner `MONTASSAR2001`):

| Plugin | Contains | Install |
|---|---|---|
| `responsive-localization` | both skills | `claude plugin install responsive-localization@skill-lang-responsive` |
| `universal-responsive-design` | responsive skill only | `claude plugin install universal-responsive-design@skill-lang-responsive` |
| `smart-website-localization` | localization skill only | `claude plugin install smart-website-localization@skill-lang-responsive` |

Inside a session the equivalents are `/plugin marketplace add MONTASSAR2001/skill-lang-responsive` and `/plugin install responsive-localization@skill-lang-responsive` (the latter opens a panel where you choose the scope: user, project or local).

## Verify

```bash
claude plugin list                                                     # shows version and "enabled"
claude plugin details responsive-localization@skill-lang-responsive    # Component inventory -> Skills (2)
```

## Use

Plugin skills are namespaced by the plugin name:

```
/responsive-localization:universal-responsive-design   Make http://localhost:3000 responsive. Code is in ./src.
/responsive-localization:smart-website-localization    Localize this site into French and Arabic. Source in ./src.
```
Claude also loads them automatically when your request matches their descriptions.

## Requirements for the bundled scripts

Node.js 18+ and Playwright with Chromium in the project you are working on: `npm i -D playwright && npx playwright install chromium`. Without it the skills still work but must report their results as unverified.

## If the skill does not show up
Plugins are loaded when a session starts or when you reload them, so a plugin installed during a running session may not be active yet. Run `/reload-plugins` (or restart Claude Code), confirm with `claude plugin list`, and invoke the skill by its namespaced name, for example `/responsive-localization:smart-website-localization`. More in [troubleshooting](../troubleshooting.md).

## Update / remove

```bash
claude plugin marketplace update skill-lang-responsive
claude plugin update responsive-localization@skill-lang-responsive
claude plugin uninstall responsive-localization@skill-lang-responsive
```
The manifest pins a `version`, so you receive an update only when a new release bumps it.

## Try it without installing

```bash
git clone https://github.com/MONTASSAR2001/skill-lang-responsive && cd skill-lang-responsive
claude --plugin-dir ./plugins/responsive-localization
```

## Install as plain skills (no plugin)

```bash
node scripts/install.mjs --target claude                      # ~/.claude/skills
node scripts/install.mjs --target claude --scope project      # ./.claude/skills
```
Skills installed this way are **not** namespaced: use `/universal-responsive-design` and `/smart-website-localization`.

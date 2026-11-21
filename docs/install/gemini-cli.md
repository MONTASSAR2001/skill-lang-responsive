# Install in Gemini CLI

**Status: ✅ executed** with Gemini CLI 0.68.0 (`npm run test:gemini`): both skills were installed, listed `[Enabled]` with their descriptions, and also discovered when placed by `scripts/install.mjs --target gemini`.

## Install

```bash
# from a clone of this repository
gemini skills install ./skills/universal-responsive-design --scope user --consent
gemini skills install ./skills/smart-website-localization   --scope user --consent
# or, without gemini's own prompts
node scripts/install.mjs --target gemini                                  # -> ~/.gemini/skills/
node scripts/install.mjs --target gemini --scope project --project-dir .  # -> ./.gemini/skills/
```
`--scope workspace` installs into `<project>/.gemini/skills/`. `--consent` acknowledges Gemini's warning that skills inject instructions into the agent's system prompt; review `SKILL.md` before consenting.

## Verify

```bash
gemini skills list        # both skills should show [Enabled]
```
Manage with `gemini skills enable|disable|link|uninstall <name>`.

Gemini CLI loads project skills only from trusted folders.

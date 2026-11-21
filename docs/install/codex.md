# Install in OpenAI Codex

**Status: 📖 documented, not executed.** Codex was not installed on the build machine. Source: https://learn.chatgpt.com/docs/build-skills (the target of the `developers.openai.com/codex/skills` redirect, read 2026-11-21; part of the page reached us through a summary).

## Install

```bash
# project-level: every directory from the working directory up to the repo root is scanned
node scripts/install.mjs --target codex --scope project --project-dir /path/to/your/repo   # -> .agents/skills/
# personal, all repositories
node scripts/install.mjs --target codex                                                      # -> ~/.agents/skills/
```
Admin-wide skills live in `/etc/codex/skills` (not handled by the installer).

## Verify and use

In the Codex CLI or IDE extension run `/skills` or type `$` to list skills; invoke one explicitly with `$universal-responsive-design` or `$smart-website-localization`, or let Codex pick it by description. Codex loads only names and descriptions at start and the full `SKILL.md` when a skill is selected. It detects file changes, but restart Codex if a new skill does not show up.

## Notes

- `name` and `description` are both required by Codex; ours have them.
- The initial skills list is capped by a context budget (about 2 % of the context window); Codex shortens descriptions first. Our descriptions are under 1024 characters.
- Optional `agents/openai.yaml` (UI metadata, implicit-invocation policy) is not shipped; implicit invocation is on by default.
- Not implemented: Codex plugins and `$skill-installer` distribution (format not verified).

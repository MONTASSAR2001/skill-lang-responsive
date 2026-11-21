# Install in Google Antigravity

**Status: 📖 documented, not executed.** Source: https://antigravity.google/docs/skills (read verbatim 2026-11-21). The `antigravity` launcher exists on the build machine, but no agent session or `agy` CLI was run.

## Install

```bash
# project-level (workspace root; also read from parent folders up to the repo root)
node scripts/install.mjs --target antigravity --scope project --project-dir /path/to/your/project   # -> .agents/skills/
# user-level (App, CLI and IDE)
node scripts/install.mjs --target antigravity                                                        # -> ~/.gemini/config/skills/
```

Antigravity "defaults to `.agents/skills`, but still maintains backward compatibility for `.agent/skills`".

## Verify

- **IDE:** open the Customizations menu in the agent side panel to see active skills.
- **CLI:** each skill becomes a slash command; run `/skills reload` (or start a new conversation) after adding one.
- **App:** type `/<skill-name>` or mention the skill by name.

The agent also sees every skill's name and description on each turn and reads the full `SKILL.md` when it is relevant.

## Notes

- `name` is optional in Antigravity (defaults to the folder name) and `description` is required; ours provide both.
- The Antigravity CLI can install plugins from a GitHub URL (`agy plugin install https://github.com/<owner>/<repo>`). Whether this repository's layout satisfies the plugin format was **not verified**; use the installer above.
- Gemini CLI users: see `gemini-cli.md` (executed and verified).

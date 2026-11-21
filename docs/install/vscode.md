# Install in VS Code with GitHub Copilot

**Status: 📖 documented, not executed.** VS Code 1.147.0 exists on the build machine, but Copilot agent mode was not driven. Sources: https://code.visualstudio.com/docs/copilot/customization/agent-skills (page dated 2026-11-18) and GitHub's agent-skills docs.

## Install

```bash
# project-level (commit it)
node scripts/install.mjs --target vscode --scope project --project-dir /path/to/your/project   # -> .github/skills/
# personal
node scripts/install.mjs --target vscode                                                         # -> ~/.copilot/skills/
```

`.github/skills` and `~/.copilot/skills` are the locations that both the VS Code page and GitHub's docs list. The two sources disagree about `.claude/skills` and `.agents/skills` (see `docs/compatibility.md`), so the installer avoids relying on them.

## Verify

Open Copilot Chat in agent mode, type `/` to see skills, or ask for a task that matches a skill description. Invalid skill names "silently fail to load" per the docs, so if a skill is missing, check that the folder name equals the `name` in `SKILL.md` (ours do).

## Limits and notes

- Skills work in chat and agent mode; experimental features (`context: fork`, MCP-supplied skills) need settings we do not rely on.
- The local harness is deprecated (removal announced for February 2027).
- Organization policies can restrict skills and the customization marketplace.
- Not implemented: VS Code agent plugins, the `chatSkills` extension contribution point, `gh skill install` (public preview, needs GitHub CLI 2.90+). They were mentioned in the docs but not verified.

Requirements for the scripts: Node.js 18+, Playwright with Chromium; the agent must be allowed to run terminal commands (VS Code asks for confirmation per its own settings).

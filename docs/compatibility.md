# Compatibility matrix

Researched against each vendor's **official documentation on 2026-11-21** (sources at the bottom). Vendors change these paths and features; re-check before relying on them.

## How to read the status column

| Status | Meaning |
|---|---|
| ✅ **Executed** | The install and skill discovery were run for real by this repository's tests, with the tool version shown (`npm test`). |
| 📖 **Documented** | The vendor's official docs describe this location and format and the installer targets it, but the tool was **not available or not run** here. Treat as "should work", and tell us if it doesn't. |
| ⚠️ **Experimental / not implemented** | Mentioned by vendor docs but unverified; no adapter is shipped. |

Nothing is listed as supported unless it appears in one of the first two categories.

## Platforms

| Platform | Agent Skills (`SKILL.md`) | Project skills dir | User skills dir | How to install this repo | Status |
|---|---|---|---|---|---|
| **Claude Code** | Native | `.claude/skills/` | `~/.claude/skills/` | **Plugin marketplace** (`claude plugin marketplace add MONTASSAR2001/skill-lang-responsive`, then `claude plugin install responsive-localization@skill-lang-responsive`), or `install.mjs --target claude` | ✅ Executed: Claude Code 2.1.325: `claude plugin validate` (marketplace + 3 plugins), isolated-HOME marketplace add, install, uninstall, and `claude plugin details` listing both skills |
| **Gemini CLI** | Native (`gemini skills`) | `.gemini/skills/` | `~/.gemini/skills/` | `gemini skills install <path>` or `install.mjs --target gemini` | ✅ Executed: Gemini CLI 0.68.0: both skills installed, listed `[Enabled]` with descriptions, also when placed by our installer |
| **Cursor** | Native | `.cursor/skills/`, `.agents/skills/` (also reads `.claude/skills/`, `.codex/skills/`) | `~/.cursor/skills/`, `~/.agents/skills/` | `install.mjs --target cursor` (or `agents`) | 📖 Documented. Cursor not installed here |
| **VS Code + GitHub Copilot** | Native (chat / agent mode) | `.github/skills/` (Copilot harness) | `~/.copilot/skills/` | `install.mjs --target vscode` | 📖 Documented. VS Code 1.147.0 is installed here but Copilot agent mode was not driven. Vendor sources disagree about `.claude/` and `.agents/` (see note 2) |
| **Google Antigravity** | Native | `.agents/skills/` (legacy `.agent/skills/`) | `~/.gemini/config/skills/` | `install.mjs --target antigravity` | 📖 Documented. The `antigravity` launcher exists here but no agent session or `agy` CLI was run |
| **OpenAI Codex** (CLI / IDE / app) | Native | `.agents/skills/` (cwd up to repo root) | `~/.agents/skills/` (admin: `/etc/codex/skills`) | `install.mjs --target codex` (or `agents`) | 📖 Documented (parts of the Codex page were read through a summary). Codex not installed here |
| **Any client that follows the `.agents/skills` convention** | Per the Agent Skills client guide | `.agents/skills/` | `~/.agents/skills/` | `install.mjs --target agents` | 📖 The spec *recommends* these paths but does not mandate them |

### Frontmatter requirements per platform (our skills satisfy all of them)

| Platform | `name` | `description` | Notes |
|---|---|---|---|
| Agent Skills spec | required, 1-64 chars, `a-z0-9-`, must match directory | required, 1-1024 chars | optional `license`, `compatibility`, `metadata`, `allowed-tools` |
| Cursor | required, must match folder | required | extras (`paths`, `disable-model-invocation`, ...) are optional |
| VS Code / Copilot | required, ≤64, must match directory (**invalid names silently fail to load**) | required, ≤1024 | extras (`argument-hint`, `user-invocable`, `context`) optional |
| Antigravity | optional (defaults to folder name) | required | |
| Codex | required | required | optional `agents/openai.yaml` for UI/policy; not shipped |
| Claude Code | optional (defaults to directory) | recommended | plugin skills are namespaced: `/<plugin>:<skill>` |

We only use spec fields (`name`, `description`, `license`, `compatibility`, `metadata`), so the same files work everywhere; there are no platform-specific copies.

## Notes and known conflicts

1. **Skills are instructions plus scripts.** The scripts need Node.js 18+ and Playwright with Chromium. Whether a given agent may run shell commands (and may open a browser) is up to its own permission model.
2. **VS Code / GitHub docs conflict.** The VS Code page lists `.github/skills` and `~/.copilot/skills` for the Copilot harness, while GitHub's docs also list `.claude/skills` and `.agents/skills` (and `~/.agents/skills`). The deprecated local harness (removal announced for Feb 2027) reads the latter. Our installer uses the one location both sources agree on.
3. **`.claude/skills` is not read by every tool.** Cursor and VS Code's local harness read it; the Antigravity and Codex pages we read do not mention it. Use `--target agents` for a neutral location.
4. **Cloud / remote agents.** Cursor documents that personal skill directories are not copied to cloud agents unless synced; project-level skills committed to a repository are the portable choice.
5. **Not implemented because unverified:** Cursor's plugin marketplace (`.cursor-plugin/marketplace.json`), VS Code agent plugins and the `chatSkills` extension contribution point, Antigravity `agy plugin install <github-url>`, Codex plugins and `$skill-installer`, and `gh skill install`. They are mentioned in vendor docs, but their manifest formats were not verified, so no adapter is shipped.
6. The Agent Skills client showcase (agentskills.io/clients) is rendered dynamically and could not be read, so the list of other compatible clients is **not** enumerated here.
7. The official reference validator `skills-ref` could not be installed from PyPI when this was written. `tests/validate-skills.mjs` implements the published rules itself and is not the official tool.

## Sources (read 2026-11-21)

- Agent Skills specification and client guide: https://agentskills.io/specification , https://agentskills.io/client-implementation/adding-skills-support.md
- Claude Code plugins and marketplaces: https://code.claude.com/docs/en/plugins , /plugin-marketplaces , /plugins/manifest-reference , /plugins/marketplace-reference , /plugins/cli-reference , /plugins/host-marketplace , /skills
- Cursor: https://cursor.com/docs/context/skills
- VS Code: https://code.visualstudio.com/docs/copilot/customization/agent-skills ; GitHub: https://docs.github.com/en/copilot/concepts/agents/about-agent-skills
- Antigravity: https://antigravity.google/docs/skills
- Codex: https://learn.chatgpt.com/docs/build-skills (redirect target of developers.openai.com/codex/skills)
- Gemini CLI: verified by running `gemini skills --help`, `install`, `list` (version 0.68.0); its online docs were not read.

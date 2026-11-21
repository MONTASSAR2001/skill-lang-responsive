# Install in Cursor

**Status: 📖 documented, not executed.** Cursor was not available when this was written. The paths below come from https://cursor.com/docs/context/skills (read 2026-11-21); `scripts/install.mjs` is tested to place the files exactly there.

## Install

From a clone of this repository:

```bash
# project-level (commit it so your team and cloud agents get the skills)
node scripts/install.mjs --target cursor --scope project --project-dir /path/to/your/project   # -> .cursor/skills/
# personal, all projects
node scripts/install.mjs --target cursor                                                         # -> ~/.cursor/skills/
# neutral location Cursor also reads
node scripts/install.mjs --target agents --scope project --project-dir /path/to/your/project   # -> .agents/skills/
```

Or copy by hand: `skills/universal-responsive-design` and `skills/smart-website-localization` into one of the directories above.

## Verify

Cursor discovers skills at startup: restart Cursor, then check that the skills appear in the Agent chat `/` menu (skills attach to a message when selected) or ask the agent which skills it has. They also activate automatically by description relevance.

## Known limits (from Cursor's docs)

- `~/.agents/skills/` and `~/.cursor/skills/` are not copied to Cloud Agents or remote/self-hosted workers unless synced (only `~/.cursor/skills/` syncs). Prefer project-level installation.
- Cursor requires `name` to match the folder name; ours do.
- Cursor can also load `.claude/skills/` and `.codex/skills/`, so a project that already contains them needs no extra step.
- Not implemented: Cursor plugins / team marketplace (`.cursor-plugin/marketplace.json`). That format was not verified.

Requirements for the scripts: Node.js 18+, Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`); the agent must be allowed to run shell commands.

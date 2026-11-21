# Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Playwright is not installed.` (exit 2) | The scripts need Playwright in the project, globally, or at `PLAYWRIGHT_MODULE` | `npm i -D playwright && npx playwright install chromium`, or `export PLAYWRIGHT_MODULE=/path/to/node_modules/playwright` |
| `Could not start Chromium` | Browser binary not downloaded, or missing system libraries | `npx playwright install chromium` (Linux CI: `npx playwright install --with-deps chromium`) |
| `Cannot load http://...: net::ERR_CONNECTION_REFUSED` (exit 2) | Your dev server is not running or the port is wrong | Start the app; open the URL in a browser first |
| `Not a valid http(s) or file URL` (exit 2) | Only `http:`, `https:` and `file:` are accepted | Use a full URL |
| Audit reports "outside"/"clipped" for a carousel, drawer or sticky scene | Intentional behaviour | Declare it: `--intentional ".carousel,#drawer"`; write one line why in your report |
| Audit finds content "unreachable" that is behind a menu | The toggle was not recognised | Make the toggle a `<button>` with a label containing menu/nav/filters, or pass `--must "Text"` to inspect specific texts |
| Page content appears only after scrolling | Scroll-reveal or lazy rendering | `--wait 1500` and `--scroll-shots 6` |
| `verify.mjs` flags `text-clipped-after-translation` on a scroll-driven stage | That container clips on purpose | `--intentional ".stage"` |
| `verify.mjs` flags a postal address or product name as untranslated | It must stay verbatim | add it to `protect` in the glossary or `--protect "Name,Address"` |
| `html-dir` / `layout-not-mirrored` for Arabic | `dir="rtl"` missing, or CSS forces LTR on containers | set `<html lang="ar" dir="rtl">`, convert physical to logical CSS (see the skill's `references/rtl.md`) |
| Claude Code: `Plugin ... not found in marketplace` | Marketplace cache is stale or the name is wrong | `claude plugin marketplace update skill-lang-responsive`; identifiers are `responsive-localization@skill-lang-responsive` |
| Claude Code: `Invalid marketplace source format` | Local path was not passed as a path | use `owner/repo`, a full URL, or an explicit path such as `./skill-lang-responsive` or `/abs/path` |
| Skill not offered in Cursor/VS Code/Codex | Tool scans skills at startup, or the folder name differs from `name` | restart the tool; check the directory in `docs/compatibility.md`; run `npm run check` |
| Claude Code: the `Skill` tool cannot load the skill, or it is not in the list, right after installing | Plugins load at session start or when reloaded (Claude Code docs); a plugin installed mid-session is not active yet. The cause in one reported case was not confirmed. | Run `/reload-plugins` (or restart Claude Code), check `claude plugin list`, then invoke it namespaced: `/responsive-localization:smart-website-localization`. If it still does not appear, uninstall and reinstall. As a stop-gap, point the agent at the installed `SKILL.md` and `references/` and have it follow them: the scripts work without the Skill tool. |
| The audit or `extract-strings` shows a login page / `WARNING: ... redirected to a login screen` | The page needs a session (admin app, account area) | `npx playwright codegen --save-storage=auth.json <login-url>`, sign in, close the window, then add `--storage-state auth.json`. The file holds live tokens: it is git-ignored (`auth*.json`); delete it afterwards. |
| The site is localized but headings, tables or cards are still in the source language | That text comes from an API/CMS, bundled content files or content added later, not from the templates | `extract-strings.mjs --url <site> --crawl 40 --residue fr` lists it per page and endpoint; see `references/dynamic-content.md` in the localization skill |
| `verify.mjs` reports `api-content-not-localized` | The backend returns the same (source-language) text for the localized page | Send the language on every data request and localize the data layer; protect names with `--protect` |
| Windows: `install.mjs --mode link` falls back to copy | Symlinks need developer mode or elevation | use the default copy mode |
| `gemini skills install` waits forever | It is asking for confirmation | add `--consent` |
| Tests print `SKIP` | A tool (claude, gemini, Chromium) is not installed | install it, or accept the skip; `--strict` (CI) turns skips into failures |

Run `npm run check` for the static validators (they print the exact failing rule) and `node tests/run.mjs` for everything your machine can run.

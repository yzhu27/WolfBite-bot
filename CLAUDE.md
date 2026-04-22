# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

WolfBite-bot is a Telegram/Discord chatbot that fetches the daily menu for NC State University dining halls from CBORD NetNutrition, translates it, and renders it to the user. Entry point is `main.py`, which currently starts only the Telegram bot (`start_discord_bot()` is commented out).

## Running

```bash
pip install -r requirements.txt
TELEGRAM_TOKEN=... python main.py         # Telegram (default)
# DISCORD_TOKEN=... and uncomment start_discord_bot() in main.py for Discord
```

Run the scraper standalone for quick debugging (the `__main__` block calls it for a hard-coded date/unit):

```bash
python -m services.menu_query
```

Docker: the `dockerfile` clones `main` from GitHub on every container start and runs `main.py`; it does not use the local working copy. To test local changes, run outside Docker.

There are no tests, linter config, or build step.

## Architecture

Request flow (Telegram is the canonical path):

1. `main.py` → `bots/telegram_bot.py:start_telegram_bot` wires a `ConversationHandler` with two states: `HALL` → `PERIOD`.
2. `config/config.py` loads halls, periods, languages from JSON in `config/`, and reads `TELEGRAM_TOKEN` / `DISCORD_TOKEN` from env.
3. User picks a hall (`halls.json` maps name → `pid`/`unitOid`) then a meal period.
4. `services/menu_query.py:fetch_menu_data(date, meal, unitOid)` scrapes CBORD in two steps:
   - GET `netmenu2.cbord.com/NetNutrition/ncstate-dining` to seed a session.
   - POST `Unit/SelectUnitFromUnitsList` → JSON `panels`; extract `menuPanel` HTML and parse `section.card` headers into a `{date: {meal: menuOid}}` map.
   - POST `Menu/SelectMenu` with `menuOid` → JSON; pass the `itemPanel` HTML to `utils/parser.py:parse_menu`, which walks `<tr>` rows keyed by class (`cbo_nn_itemGroupRow` for categories, `cbo_nn_itemPrimaryRow` / `cbo_nn_itemAlternateRow` for dishes) and returns `{category: [dish, ...]}`.
5. `utils/translator.py:translate_text` looks up strings in `translations/<Language>.json`. English is a no-op. Misses fall through unchanged and are appended to `translations/untranslated.json` — this file is how new strings get collected for later translation; review it before adding/removing entries.
6. `utils/formatter.py:format_menu` produces the Markdown reply (`*Category:*` + indented dish lines) that the bot sends with `parse_mode="markdown"`.

### Time-of-day rule

`telegram_bot.py:period_choice` uses `America/New_York`; when local hour ≥ 21, it queries the **next day's** menu instead of today's. Preserve this when changing date logic — recent commits (`e9a481e`, `6e7a90c`) exist specifically to enforce it.

### Per-user state

Telegram stores language preference in `context.bot_data[user_id]['language']` (default `'Chinese'`) and the current hall/period selection in `context.user_data`. Discord keeps everything in a module-level `user_state` dict keyed by user id.

### Deprecated code

- `services/menu_query_deprecated.py` and `utils/parser.py:parse_menu_deprecated` correspond to an older HTML layout (`div.dining-menu-category`) that returned `{category: [{dish, diets}]}`. The current parser returns `{category: [str]}`.
- `translations/Chinese_deprecated.json` is keyed for the old dict-of-dicts menu shape and should not be used by new code.
- `bots/discord_bot.py` has not been updated for the current API: it calls `fetch_menu_data(..., pid=...)` (should be `unitOid`) and indexes items as `item['dish']` (parser now returns strings). Expect to rewrite those call sites if re-enabling Discord.

## Pinned dependencies to watch

`python-telegram-bot==13.7` — v13 sync API (`Updater`, `CallbackContext`). Do not "upgrade-modernize" to v20+ async without rewriting every handler. `discord.py==2.4.0` is async and reaction-based.

## JS/TS port under `worker/`

A TypeScript port of the Telegram bot targeting Cloudflare Workers lives in `worker/` and runs alongside the Python code, which is untouched. Both implementations share `config/*.json` and `translations/*.json` as the single source of truth (the TS code imports them via relative paths).

- Entry: `worker/src/index.ts` → grammY `webhookCallback` at path `/tg`, validated by `TELEGRAM_WEBHOOK_SECRET`.
- State: **no KV / no persistent store.** Per-user language preference lives in a module-level `Map` in `worker/src/state.ts` (best-effort, resets on isolate eviction — user re-runs `/language` to switch again). In-flight hall/period selection is encoded directly in inline-keyboard `callback_data` (`hall:<pid>`, `period:<pid>:<meal>`, `lang:<code>`) so no session storage is needed.
- Untranslated strings: `console.warn` once per `(language, key)` pair — the Workers replacement for `translations/untranslated.json`. Inspect via the dashboard Logs tab. Other code paths avoid `console.warn` to keep the signal clean.
- CBORD scrape: `worker/src/cbord/client.ts` manually forwards `Set-Cookie` between the three CBORD calls (Workers `fetch` does not persist cookies). HTML parsing is done with the runtime-native `HTMLRewriter` — no cheerio.
- Time rule and Markdown output match the Python bot byte-for-byte.

Dev commands (run from `worker/`):

```bash
npm install
npx wrangler secret put TELEGRAM_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npm run dev                                  # local wrangler dev
npm run test                                 # vitest (workers pool)
npm run deploy                               # wrangler deploy

# Register the webhook after first deploy:
curl "https://api.telegram.org/bot$TELEGRAM_TOKEN/setWebhook" \
  -d "url=https://wolfbite-worker.<subdomain>.workers.dev/tg" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
  -d 'allowed_updates=["message","callback_query"]'
```

The Python bot and the Worker bot should not run against the same bot token simultaneously — polling (Python) and webhooks (Worker) are mutually exclusive.

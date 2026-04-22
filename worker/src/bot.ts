// Wires grammY routes. No session middleware — language lives in a
// module-level Map (src/state.ts) and conversation context rides along in
// callback_data. A fresh Bot is built per request (standard Workers pattern).

import { Bot } from "grammy";
import type { Env } from "./index";
import type { BotContext } from "./state";
import { cmdCancel, cmdStart } from "./handlers/start";
import { onHallChoice } from "./handlers/hall";
import { onPeriodChoice } from "./handlers/period";
import { cmdLanguage, onLanguageChoice } from "./handlers/language";

export function buildBot(env: Env): Bot<BotContext> {
  const bot = new Bot<BotContext>(env.TELEGRAM_TOKEN);

  bot.command("start", cmdStart);
  bot.command("cancel", cmdCancel);
  bot.command("language", cmdLanguage);

  bot.callbackQuery(/^hall:/, onHallChoice);
  bot.callbackQuery(/^period:/, onPeriodChoice);
  bot.callbackQuery(/^lang:/, onLanguageChoice);

  return bot;
}

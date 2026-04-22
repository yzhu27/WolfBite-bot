// Mirrors bots/telegram_bot.py:language_command + set_language.
// Writes to the in-isolate language map; if the isolate is later evicted, the
// user falls back to DEFAULT_LANGUAGE and can re-run /language to switch again.

import { InlineKeyboard } from "grammy";
import languages from "../../../config/languages.json";
import type { BotContext } from "../state";
import { getLanguage, setLanguage } from "../state";
import type { Language } from "../i18n/translator";
import { translateText } from "../i18n/translator";

const LANGUAGES = languages as Language[];

export async function cmdLanguage(ctx: BotContext): Promise<void> {
  const lang = getLanguage(ctx.from?.id);
  const kb = new InlineKeyboard();
  for (const l of LANGUAGES) kb.text(l, `lang:${l}`).row();
  await ctx.reply(translateText("Select your language:", lang), {
    reply_markup: kb,
  });
}

export async function onLanguageChoice(ctx: BotContext): Promise<void> {
  const picked = ctx.callbackQuery?.data?.split(":", 2)?.[1] as
    | Language
    | undefined;
  const uid = ctx.from?.id;
  if (!picked || !LANGUAGES.includes(picked) || uid === undefined) {
    await ctx.answerCallbackQuery();
    return;
  }
  setLanguage(uid, picked);
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    translateText(
      "Language set. You may use /start to search for menu today.",
      picked,
    ),
  );
}

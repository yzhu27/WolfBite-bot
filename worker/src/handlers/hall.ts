// Mirrors bots/telegram_bot.py:hall_choice — user tapped a hall inline button.
// We re-encode the hall pid into each period button's callback_data so the
// period handler has all the context it needs, without any session store.

import { InlineKeyboard } from "grammy";
import periods from "../../../config/periods.json";
import type { BotContext } from "../state";
import { getLanguage } from "../state";
import { translateText } from "../i18n/translator";

const PERIODS = periods as string[];

export async function onHallChoice(ctx: BotContext): Promise<void> {
  const pid = ctx.callbackQuery?.data?.split(":", 2)?.[1];
  if (!pid) {
    await ctx.answerCallbackQuery();
    return;
  }

  const lang = getLanguage(ctx.from?.id);
  const kb = new InlineKeyboard();
  for (const p of PERIODS) kb.text(p, `period:${pid}:${p}`).row();

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(translateText("When would you like to eat?", lang), {
    reply_markup: kb,
  });
}

// Handles /start and /cancel, and renders the hall picker keyboard.
// Mirrors bots/telegram_bot.py:start + display_halls.

import { InlineKeyboard } from "grammy";
import halls from "../../../config/halls.json";
import type { BotContext } from "../state";
import { getLanguage } from "../state";
import { translateText } from "../i18n/translator";

type Hall = { name: string; pid: string };
const HALLS = halls as Hall[];

export async function cmdStart(ctx: BotContext): Promise<void> {
  const lang = getLanguage(ctx.from?.id);

  await ctx.reply(
    translateText(
      "Welcome to the NCSU Dining Bot! This bot helps you check the daily menu for various dining halls in NCSU campus.",
      lang,
    ),
  );

  const kb = new InlineKeyboard();
  for (const hall of HALLS) kb.text(hall.name, `hall:${hall.pid}`).row();

  await ctx.reply(translateText("Where would you like to eat today?", lang), {
    reply_markup: kb,
  });
}

export async function cmdCancel(ctx: BotContext): Promise<void> {
  await ctx.reply("Cancelled.");
}

export function hallByPid(pid: string): Hall | undefined {
  return HALLS.find((h) => h.pid === pid);
}

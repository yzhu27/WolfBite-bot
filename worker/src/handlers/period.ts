// Mirrors bots/telegram_bot.py:period_choice — scrape CBORD, translate,
// format, edit the message with the rendered menu. All context (hall pid,
// period) comes from callback_data; hall display name is looked up from
// halls.json by pid.

import type { BotContext } from "../state";
import { getLanguage } from "../state";
import { translateText } from "../i18n/translator";
import { fetchMenuData } from "../cbord/client";
import { formatMenu } from "../util/format";
import { queryDateET } from "../util/time";
import { hallByPid } from "./start";

export async function onPeriodChoice(ctx: BotContext): Promise<void> {
  // callback_data shape: period:<pid>:<period>
  const parts = ctx.callbackQuery?.data?.split(":", 3);
  const pid = parts?.[1];
  const period = parts?.[2];
  if (!pid || !period) {
    await ctx.answerCallbackQuery();
    return;
  }

  const lang = getLanguage(ctx.from?.id);
  const hallName = hallByPid(pid)?.name ?? "Unknown Hall";

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(translateText("Searching...", lang));

  const dateStr = queryDateET();
  let menu: Record<string, string[]> | null = null;
  try {
    menu = await fetchMenuData(dateStr, period, pid);
  } catch {
    menu = null;
  }

  if (!menu || Object.keys(menu).length === 0) {
    await ctx.editMessageText(
      translateText(
        "Sorry, no menu data available. This hall may not be open during this period or your inquiry was incorrect.",
        lang,
      ),
    );
    return;
  }

  const translated: Record<string, string[]> = {};
  for (const [cat, items] of Object.entries(menu)) {
    translated[translateText(cat, lang)] = items.map((it) =>
      translateText(it, lang),
    );
  }

  const title =
    `*Date:* ${dateStr}\n` +
    `*Hall:* ${hallName}\n` +
    `*Period:* ${period}\n`;
  const body = formatMenu(translated);
  await ctx.editMessageText(`${title}\n${body}`, { parse_mode: "Markdown" });
}

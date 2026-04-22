// Worker entry. Telegram posts updates to /tg with an
// X-Telegram-Bot-Api-Secret-Token header that grammY's webhookCallback
// validates against env.TELEGRAM_WEBHOOK_SECRET.

import { webhookCallback } from "grammy";
import { buildBot } from "./bot";

export interface Env {
  TELEGRAM_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname !== "/tg") {
      return new Response("ok");
    }
    const bot = buildBot(env);
    const handle = webhookCallback(bot, "cloudflare-mod", {
      secretToken: env.TELEGRAM_WEBHOOK_SECRET,
    });
    return handle(req);
  },
} satisfies ExportedHandler<Env>;

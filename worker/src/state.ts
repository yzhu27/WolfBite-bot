// In-isolate per-user language preference. Best-effort: Cloudflare may evict
// or spin up fresh isolates at any time, in which case the preference resets
// to DEFAULT_LANGUAGE and the user re-runs /language to switch again.

import type { Context } from "grammy";
import type { Language } from "./i18n/translator";

export type BotContext = Context;

export const DEFAULT_LANGUAGE: Language = "Chinese";

const userLanguage = new Map<number, Language>();

export function getLanguage(userId: number | undefined): Language {
  if (userId === undefined) return DEFAULT_LANGUAGE;
  return userLanguage.get(userId) ?? DEFAULT_LANGUAGE;
}

export function setLanguage(userId: number, language: Language): void {
  userLanguage.set(userId, language);
}

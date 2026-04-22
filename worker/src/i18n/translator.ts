// Ports utils/translator.py. Dictionaries are bundled at build time via
// resolveJsonModule. Missing translations are logged to the Worker's console
// once per (language, text) pair — subsequent misses for the same key are
// silent, so logs stay readable even if the same dish appears in every menu.

import Chinese from "../../../translations/Chinese.json";
import Spanish from "../../../translations/Spanish.json";

export type Language = "English" | "Spanish" | "Chinese";

const DICT: Record<Language, Record<string, string>> = {
  English: {},
  Spanish: Spanish as Record<string, string>,
  Chinese: Chinese as Record<string, string>,
};

const warned = new Set<string>();

export function translateText(text: string, language: Language): string {
  if (language === "English") return text;
  const dict = DICT[language];
  const hit = dict?.[text];
  if (hit !== undefined) return hit;

  const key = `${language}::${text}`;
  if (!warned.has(key)) {
    warned.add(key);
    console.warn(`[i18n miss] ${language}: ${text}`);
  }
  return text;
}

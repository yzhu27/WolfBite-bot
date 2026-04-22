// Mirrors utils/formatter.py:format_menu. Emits legacy-Markdown output:
//   *Category:*
//       Dish 1
//       Dish 2
//
// The sanitize step neutralises stray `*` and `_` in translated strings to
// avoid breaking Telegram's Markdown parser — dish names occasionally contain
// them (e.g. rating asterisks from CBORD).
const sanitize = (s: string) => s.replace(/\*/g, "•").replace(/_/g, " ");

export function formatMenu(menu: Record<string, string[]>): string {
  let out = "";
  for (const [category, items] of Object.entries(menu)) {
    out += `*${sanitize(category)}:*\n`;
    for (const item of items) {
      out += `    ${sanitize(item)}\n`;
    }
    out += "\n";
  }
  return out;
}

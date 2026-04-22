// Mirrors bots/telegram_bot.py:period_choice — after 21:00 America/New_York,
// queries roll to the next day's menu. DST handled by the timezone-aware
// Intl formatter, no manual offset math.
export function queryDateET(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value]),
  );
  let y = Number(parts.year);
  let m = Number(parts.month);
  let d = Number(parts.day);
  const h = Number(parts.hour);

  if (h >= 21) {
    const t = new Date(Date.UTC(y, m - 1, d + 1));
    y = t.getUTCFullYear();
    m = t.getUTCMonth() + 1;
    d = t.getUTCDate();
  }
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

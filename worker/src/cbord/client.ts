// Ports services/menu_query.py. Three sequential calls to CBORD NetNutrition:
//   1. GET  /ncstate-dining                       → seeds ASP.NET session cookie
//   2. POST /Unit/SelectUnitFromUnitsList         → JSON panels; menuPanel HTML
//                                                   → {date: {meal: menuOid}}
//   3. POST /Menu/SelectMenu                      → JSON panels; itemPanel HTML
//                                                   → {category: [dish, ...]}
//
// Workers `fetch` does not persist cookies, so we capture Set-Cookie from the
// seed response into a local jar and forward it on subsequent POSTs.

import { parseItemPanel, parseMenuPanel } from "./parser";

const BASE = "https://netmenu2.cbord.com/NetNutrition/ncstate-dining";

const BASE_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0",
  "X-Requested-With": "XMLHttpRequest",
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
};

type CookieJar = Map<string, string>;

function absorbSetCookie(jar: CookieJar, res: Response): void {
  // `Headers.getSetCookie()` is not yet on every runtime's Headers type, so
  // probe it reflectively and fall back to a regex split for older targets.
  const headers = res.headers as unknown as {
    getSetCookie?: () => string[];
    get(name: string): string | null;
  };
  const list =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : splitLegacySetCookie(headers.get("set-cookie"));
  for (const raw of list) {
    const first = raw.split(";", 1)[0];
    if (!first) continue;
    const eq = first.indexOf("=");
    if (eq < 0) continue;
    const k = first.slice(0, eq).trim();
    const v = first.slice(eq + 1).trim();
    if (k) jar.set(k, v);
  }
}

// Fallback split when Headers.getSetCookie is unavailable. Works for single or
// comma-free Set-Cookie values (typical of ASP.NET_SessionId); imperfect for
// RFC-violating Expires=... dates that embed commas.
function splitLegacySetCookie(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(/,(?=\s*[A-Za-z0-9_\-]+=)/);
}

function cookieHeader(jar: CookieJar): string {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function seedSession(jar: CookieJar): Promise<void> {
  const res = await fetch(BASE, { headers: BASE_HEADERS });
  absorbSetCookie(jar, res);
  // Consume the body so the fetch connection closes.
  await res.arrayBuffer();
}

async function jsonPost(
  jar: CookieJar,
  url: string,
  form: Record<string, string>,
): Promise<unknown> {
  const body = new URLSearchParams(form).toString();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...BASE_HEADERS,
      Cookie: cookieHeader(jar),
    },
    body,
  });
  absorbSetCookie(jar, res);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.startsWith("application/json")) {
    const preview = (await res.text()).slice(0, 300);
    throw new Error(`Expected JSON from ${url}, got ${ct}. First 300 chars: ${preview}`);
  }
  return res.json();
}

function panelHtml(payload: unknown, panelId: string): string | null {
  if (!payload || typeof payload !== "object") return null;
  const panels = (payload as { panels?: Array<{ id: string; html: string }> }).panels;
  if (!Array.isArray(panels)) return null;
  const p = panels.find((x) => x.id === panelId);
  return p?.html ?? null;
}

export async function fetchMenuData(
  date: string, // "YYYY-MM-DD"
  meal: string, // "breakfast" | "lunch" | "dinner"
  unitOid: string | number,
): Promise<Record<string, string[]> | null> {
  const jar: CookieJar = new Map();
  await seedSession(jar);

  const unitResp = await jsonPost(jar, `${BASE}/Unit/SelectUnitFromUnitsList`, {
    unitOid: String(unitOid),
  });
  const menuPanelHtml = panelHtml(unitResp, "menuPanel");
  if (!menuPanelHtml) return null;

  const menusMap = await parseMenuPanel(menuPanelHtml);
  const mealKey = meal.charAt(0).toUpperCase() + meal.slice(1).toLowerCase();
  const menuOid = menusMap[date]?.[mealKey];
  if (menuOid === undefined) return null;

  const menuResp = await jsonPost(jar, `${BASE}/Menu/SelectMenu`, {
    menuOid: String(menuOid),
  });
  const itemPanelHtml = panelHtml(menuResp, "itemPanel");
  if (!itemPanelHtml) return null;

  return parseItemPanel(itemPanelHtml);
}

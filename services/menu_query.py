"""
services/menu_query.py
"""

import datetime
import re
import requests
from bs4 import BeautifulSoup
import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.parser import parse_menu


# Configuration
UNIT_MAP = {"fountain": 1, "clark": 2, "case": 3, "oval": 6}
HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
}


def _init_session() -> requests.Session:
    s = requests.Session()
    s.headers.update(HEADERS)
    home = "https://netmenu2.cbord.com/NetNutrition/ncstate-dining"
    s.get(home, timeout=10)
    return s

def _parse_unit_menu_panel(html: str) -> dict[str, dict[str, int]]:
    soup, out = BeautifulSoup(html, "html.parser"), {}
    for card in soup.select("section.card"):
        header = card.find("header", class_="card-title")
        if not header:
            continue
        date_key = datetime.datetime.strptime(
            header.get_text(strip=True), "%A, %B %d, %Y"
        ).strftime("%Y-%m-%d")

        out[date_key] = {}
        for link in card.select("a.cbo_nn_menuLink"):
            meal = link.get_text(strip=True)
            if m := re.search(r"\((\d+)\)", link.get("onclick", "")):
                out[date_key][meal] = int(m.group(1))
    return out

def _get_unit_menus(s: requests.Session, unitOid: int):
    url  = "https://netmenu2.cbord.com/NetNutrition/ncstate-dining/Unit/SelectUnitFromUnitsList"
    resp = s.post(url, data={"unitOid": unitOid}, timeout=10)

    if not resp.headers.get("Content-Type", "").startswith("application/json"):
        raise RuntimeError(
            f"Unit has no JSON, got {resp.headers.get('Content-Type')}\n"
            f"First 300 chars: {resp.text[:300]}"
        )

    menu_html = next(p["html"] for p in resp.json()["panels"] if p["id"] == "menuPanel")
    return _parse_unit_menu_panel(menu_html)


def fetch_menu_data(date: str, meal: str, unitOid: int):
    """
    date: 'YYYY-MM-DD', meal: 'breakfast'|'lunch'|'dinner', unit: 'fountain'|'clark'
    """
    s = _init_session()
    menus_map = _get_unit_menus(s, unitOid)

    try:
        oid = menus_map[date][meal.capitalize()]
    except KeyError:
        print(f"[WARN] {unitOid} {date} {meal} no menu")
        return None

    resp = s.post(
        "https://netmenu2.cbord.com/NetNutrition/ncstate-dining/Menu/SelectMenu",
        data={"menuOid": oid},
        timeout=10,
    )
    if not resp.headers.get("Content-Type", "").startswith("application/json"):
        raise RuntimeError("Menu has no JSON")

    item_html = next(p["html"] for p in resp.json()["panels"] if p["id"] == "itemPanel")
    return parse_menu(item_html)


if __name__ == "__main__":
    print(fetch_menu_data("2025-07-31", "dinner", 1))
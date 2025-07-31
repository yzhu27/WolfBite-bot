from bs4 import BeautifulSoup
import re
def parse_menu_deprecated(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    categories = soup.find_all("div", class_="dining-menu-category")
    
    menu_dict = {}
    for category in categories:
        category_name = category.h4.text.strip()
        items_list = []
        
        items = category.find_all("li")
        for item in items:
            dish_name = item.a.text.strip()
            dietary_icons = item.find_all("img", alt=True)
            diets = [icon['alt'] for icon in dietary_icons]
            
            items_list.append({"dish": dish_name, "diets": diets})
        
        menu_dict[category_name] = items_list

    return menu_dict

def parse_menu(html: str) -> dict[str, list[str]]:
    """
    Parse NetNutrition page HTML into
        {category name: [dish 1, dish 2, ...], ...}

    Parameters
    ----------
    html : str
        Raw HTML string

    Returns
    -------
    dict[str, list[str]]
    """
    soup = BeautifulSoup(html, "html.parser")

    menu: dict[str, list[str]] = {}
    current_category = None

    # Each row in NetNutrition is in <tr>; use class to determine type
    for row in soup.select("tr"):
        classes = row.get("class", [])

        # Category row: cbo_nn_itemGroupRow
        if any("cbo_nn_itemGroupRow" in c for c in classes):
            # Text is in <div role="button">, strip() to remove whitespace
            category_div = row.find("div", attrs={"role": "button"})
            if category_div:
                current_category = category_div.get_text(strip=True)
                # Initialize the category
                menu.setdefault(current_category, [])
            continue

        # Dish row (folded/expanded sub-row): cbo_nn_itemPrimaryRow or cbo_nn_itemAlternateRow
        if any("cbo_nn_itemPrimaryRow" in c or "cbo_nn_itemAlternateRow" in c for c in classes):
            if not current_category:
                # Skip if there's an exception
                continue

            # Each dish is in <a class="cbo_nn_itemHover">
            item_anchor = row.find("a", class_="cbo_nn_itemHover")
            if item_anchor:
                # Dish name has several <span> (icons), only keep pure text
                item_text = re.split(r"\s{2,}", item_anchor.get_text(" ", strip=True))[0]
                menu[current_category].append(item_text)

    # Remove categories that might be empty
    return {k: v for k, v in menu.items() if v}


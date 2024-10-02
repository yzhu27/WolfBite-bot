from bs4 import BeautifulSoup

def parse_menu(html_content):
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

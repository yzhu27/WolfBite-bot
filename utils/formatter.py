def format_menu(menu_data):
    """
    Takes a complex menu data structure and returns a formatted string
    with only the category names and dish names.
    """
    formatted_text = ""
    for category, items in menu_data.items():
        formatted_text += f"{category}:\n"  # Category name
        for item in items:
            formatted_text += f"    • {item}\n"  # Dish name
        formatted_text += "\n"  # Add a newline for better separation between categories
    return formatted_text

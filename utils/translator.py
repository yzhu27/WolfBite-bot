import json
import os

def load_translations(language):
    """
    Load translation dictionary for a given language.
    """
    path = f"translations/{language}.json"
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as file:
            return json.load(file)
    return {}

def translate_text(text, language):
    """
    Translate text using the loaded translations for the specified language.
    """
    translations = load_translations(language)
    return translations.get(text, text)  # Fallback to original text if no translation is found

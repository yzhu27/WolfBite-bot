import os
import json

def load_tg_config():
    """ Load token and other configurations from environment variables or secure storage. """
    return {
        'telegram_token': os.getenv('TELEGRAM_TOKEN')
    }

def load_halls():
    """ Load dining halls from a JSON file. """
    with open('config/halls.json', 'r') as file:
        return json.load(file)

def load_periods():
    """ Load meal periods from a JSON file. """
    with open('config/periods.json', 'r') as file:
        return json.load(file)

def load_languages():
    """ Load supported languages from a JSON file. """
    with open('config/languages.json', 'r') as file:
        return json.load(file)
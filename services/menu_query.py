import requests

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.parser import parse_menu

def fetch_menu_data(date, meal, pid):
    """
    Fetches dining menu data from the dining services API.
    """
    url = 'https://dining.ncsu.edu/wp-admin/admin-ajax.php'
    params = {
        'action': 'ncdining_ajax_menu_results',
        'date': date,
        'meal': meal,
        'pid': pid
    }
    response = requests.get(url, params=params)
    if response.status_code == 200:
        return parse_menu(response.content)
    else:
        
        return None

#test the function
fetch_menu_data('2024-10-01', 'dinner', 'fountain')
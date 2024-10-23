import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from bots.telegram_bot import start_telegram_bot
# from bots.discord_bot import start_discord_bot


if __name__ == '__main__':
    start_telegram_bot()
    # start_discord_bot()
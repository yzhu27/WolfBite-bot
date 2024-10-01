import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from datetime import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Updater, CommandHandler, CallbackContext, ConversationHandler, CallbackQueryHandler
import services.menu_query as menu_query
import config.config as cfg
from utils.formatter import format_menu
from utils.translator import translate_text

# Define stages of conversation
LANGUAGE, HALL, PERIOD = range(3)

def start(update: Update, context: CallbackContext):
    message = "Welcome to the NCSU Dining Bot! This bot helps you check the daily menu for various dining halls. Choose your language:"
    languages = cfg.load_languages()
    keyboard = []
    for lang in languages:
        keyboard.append([InlineKeyboardButton(lang, callback_data=lang)])
    reply_markup = InlineKeyboardMarkup(keyboard)
    update.message.reply_text(message, reply_markup=reply_markup)
    return LANGUAGE

def set_language(update: Update, context: CallbackContext):
    query = update.callback_query
    query.answer()
    context.user_data['language'] = query.data
    query.edit_message_text(text=f"Language set to {query.data}. Please choose a dining hall:")
    halls = cfg.load_halls()
    keyboard = []
    for hall in halls:
        keyboard.append([InlineKeyboardButton(hall['name'], callback_data=hall['pid'])])
    reply_markup = InlineKeyboardMarkup(keyboard)
    query.message.reply_text('Where would you like to eat today?', reply_markup=reply_markup)
    return HALL

def translate_menu(menu_data, language):
    translated_menu = {}
    for category, items in menu_data.items():
        translated_dishes = [translate_text(item['dish'], language) for item in items]
        translated_menu[category] = translated_dishes
    return "\n".join(f"{key}:\n" + "\n".join(f" - {dish}" for dish in value) for key, value in translated_menu.items())

def change_language(update: Update, context: CallbackContext):
    update.message.reply_text("Choose your language:")
    languages = cfg.load_languages()
    keyboard = []
    for lang in languages:
        keyboard.append([InlineKeyboardButton(lang, callback_data=lang)])
    reply_markup = InlineKeyboardMarkup(keyboard)
    update.message.reply_text('Select a language:', reply_markup=reply_markup)
    return LANGUAGE

def hall_choice(update: Update, context: CallbackContext):
    query = update.callback_query
    query.answer()
    # Store both hall name and PID in user_data
    selected_hall = next((hall for hall in cfg.load_halls() if hall['pid'] == query.data), None)
    context.user_data['hall_pid'] = query.data
    context.user_data['hall_name'] = selected_hall['name'] if selected_hall else 'Unknown Hall'
    keyboard = []
    for period in cfg.load_periods():
        keyboard.append([InlineKeyboardButton(period, callback_data=period) ])
    reply_markup = InlineKeyboardMarkup(keyboard)
    query.edit_message_text(text="When would you like to eat?", reply_markup=reply_markup)
    return PERIOD

def period_choice(update: Update, context: CallbackContext):
    query = update.callback_query
    query.answer()
    context.user_data['period'] = query.data
    # Get today's date in YYYY-MM-DD format
    today_date = datetime.now().strftime('%Y-%m-%d')
    query.edit_message_text(text=f"Fetching menu for {context.user_data['hall_name']} during {context.user_data['period']} on {today_date}...")
    # Fetch menu using today's date and hall PID
    menu = menu_query.fetch_menu_data(date=today_date, meal=context.user_data['period'], pid=context.user_data['hall_pid'])
    formatted_menu = format_menu(menu)
    if not menu:
        query.edit_message_text(text=f"Sorry, no menu data available. {context.user_data['hall_name']} may not be open during {context.user_data['period']} on {today_date}, or your inquiry was incorrect.")
        return ConversationHandler.END
    language = context.user_data.get('language', 'en')
    translated_menu = {category: [translate_text(item['dish'], language) for item in items]
                       for category, items in menu.items()}
    formatted_menu = format_menu(translated_menu)
    print(translated_menu)
    text = f"Today's menu:\n{formatted_menu}"
    query.edit_message_text(text)
    return ConversationHandler.END

def main():
    updater = Updater(cfg.load_tg_config()['telegram_token'], use_context=True)
    dispatcher = updater.dispatcher

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler('start', start)],
        states={
            LANGUAGE: [CallbackQueryHandler(set_language)],
            HALL: [CallbackQueryHandler(hall_choice)],
            PERIOD: [CallbackQueryHandler(period_choice)]
        },
        fallbacks=[CommandHandler('translate', change_language)]
    )

    dispatcher.add_handler(conv_handler)
    updater.start_polling()
    updater.idle()

if __name__ == '__main__':
    main()

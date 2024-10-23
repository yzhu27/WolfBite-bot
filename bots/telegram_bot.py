from datetime import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Updater, CommandHandler, CallbackContext, ConversationHandler, CallbackQueryHandler
import services.menu_query as menu_query
import config.config as cfg
from utils.formatter import format_menu
from utils.translator import translate_text

# Define stages of conversation
HALL, PERIOD = range(2)

def start(update: Update, context: CallbackContext):

    if context.chat_data.get('conversation_state') is not None:
        context.chat_data['conversation_state'] = None

    user_id = update.effective_user.id
    if user_id in context.bot_data and 'language' in context.bot_data[user_id]:
        language = context.bot_data[user_id]['language']
    else:
        language = 'English'
        context.bot_data[user_id] = {'language': language}
    welcome_message = "Welcome to the NCSU Dining Bot! This bot helps you check the daily menu for various dining halls in NCSU campus."
    update.message.reply_text(translate_text(welcome_message, language))
    return display_halls(update, context)

def display_halls(update: Update, context: CallbackContext):
    halls = cfg.load_halls()
    keyboard = []
    for hall in halls:
        keyboard.append([InlineKeyboardButton(hall['name'], callback_data=hall['pid'])])
    reply_markup = InlineKeyboardMarkup(keyboard)
    ask_hall_message = translate_text('Where would you like to eat today?', context.bot_data[update.effective_user.id]['language'])
    update.effective_message.reply_text(ask_hall_message, reply_markup=reply_markup)
    return HALL

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
    ask_period_message = translate_text('When would you like to eat?', context.bot_data[update.effective_user.id]['language'])
    query.edit_message_text(text=ask_period_message, reply_markup=reply_markup)
    return PERIOD

def period_choice(update: Update, context: CallbackContext):
    query = update.callback_query
    query.answer()
    context.user_data['period'] = query.data
    # Get today's date in YYYY-MM-DD format
    today_date = datetime.now().strftime('%Y-%m-%d')
    searching_message = translate_text("Searching...", context.bot_data[update.effective_user.id]['language'])
    query.edit_message_text(text=searching_message)
    # Fetch menu using today's date and hall PID
    menu = menu_query.fetch_menu_data(date=today_date, meal=context.user_data['period'], pid=context.user_data['hall_pid'])
    formatted_menu = format_menu(menu)
    if not menu:
        invalid_message = translate_text("Sorry, no menu data available. This hall may not be open during this period or your inquiry was incorrect.", context.bot_data[update.effective_user.id]['language'])
        query.edit_message_text(text=invalid_message)
        return ConversationHandler.END
    language = context.bot_data.get(update.effective_user.id, {}).get('language', 'English')
    translated_menu = {translate_text(category, language): [translate_text(item['dish'], language) for item in items]
                       for category, items in menu.items()}
    formatted_menu = format_menu(translated_menu)
    title = f"*Date:* {today_date}\n*Hall:* {context.user_data['hall_name']}\n*Period:* {context.user_data['period']}\n"
    text = f"{formatted_menu}"
    query.edit_message_text(text=title + '\n' + text, parse_mode="markdown")
    return ConversationHandler.END

def language_command(update: Update, context: CallbackContext):
    languages = cfg.load_languages()
    keyboard = []
    for lang in languages:
        keyboard.append([InlineKeyboardButton(lang, callback_data='lang_' + lang)])
    reply_markup = InlineKeyboardMarkup(keyboard)

    user_id = update.effective_user.id
    if not (user_id in context.bot_data and 'language' in context.bot_data[user_id]):
        context.bot_data[user_id] = {'language': 'English'}
    language_message = translate_text("Select your language:", context.bot_data[update.effective_user.id]['language'])
    update.message.reply_text(language_message, reply_markup=reply_markup)


def set_language(update: Update, context: CallbackContext):
    query = update.callback_query
    if not query.data.startswith('lang_'):
        return  # Ignore if the callback data doesn't indicate a language choice
    query.answer()
    language = query.data.split('_')[1]  # Extract the language from callback data
    user_id = query.from_user.id
    context.bot_data[user_id] = {'language': language}
    set_language_message = translate_text("Language set. You may use /start to search for menu today.", language)
    query.edit_message_text(text=set_language_message)


def cancel_command(update: Update, context: CallbackContext):
    return ConversationHandler.END

def start_telegram_bot():
    updater = Updater(cfg.load_tg_config()['telegram_token'], use_context=True)
    dispatcher = updater.dispatcher
    dispatcher.add_handler(CommandHandler('language', language_command))
    dispatcher.add_handler(CallbackQueryHandler(set_language, pattern='^lang_'))


    conv_handler = ConversationHandler(
        entry_points=[CommandHandler('start', start)],
        states={
            HALL: [CallbackQueryHandler(hall_choice)],
            PERIOD: [CallbackQueryHandler(period_choice)]
        },
        fallbacks=[CommandHandler('start', start)],  # Allow /start to interrupt and restart the conversation
        allow_reentry=True  # Allow re-entering the same state
    )
    dispatcher.add_handler(conv_handler)
    updater.start_polling()
    updater.idle()

if __name__ == '__main__':
    start_telegram_bot()

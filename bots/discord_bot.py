import discord
from discord.ext import commands
from datetime import datetime
import services.menu_query as menu_query
import config.config as cfg
from utils.formatter import format_menu
from utils.translator import translate_text
import logging

# Set up logging to print to console
logging.basicConfig(level=logging.INFO)

# Define intents and initialize the bot
intents = discord.Intents.default()
intents.messages = True
intents.message_content = True
intents.reactions = True  # Make sure reaction intents are enabled

bot = commands.Bot(command_prefix='!', intents=intents)

user_state = {}

# Constants for the conversation flow
HALL, PERIOD = range(2)

async def display_halls(user_id, ctx):
    halls = cfg.load_halls()
    hall_buttons = [f"{i+1}. {hall['name']}" for i, hall in enumerate(halls)]
    hall_message = translate_text("Where would you like to eat today?", user_state[user_id]['language'])
    
    # Present the halls as a message, reacting with numbers
    message = await ctx.send(hall_message + "\n" + "\n".join(hall_buttons))
    logging.info(f"Sent hall selection message: {message.content}")
    
    for i in range(len(halls)):
        await message.add_reaction(f"{i+1}\u20e3")  # Adds number emojis

    # Store the hall options in user_state
    user_state[user_id]['halls'] = halls
    user_state[user_id]['conversation_stage'] = HALL
    user_state[user_id]['message_id'] = message.id

async def display_periods(user_id, ctx):
    periods = cfg.load_periods()
    period_buttons = [f"{i+1}. {period}" for i, period in enumerate(periods)]
    period_message = translate_text("When would you like to eat?", user_state[user_id]['language'])
    
    message = await ctx.send(period_message + "\n" + "\n".join(period_buttons))
    logging.info(f"Sent period selection message: {message.content}")
    
    for i in range(len(periods)):
        await message.add_reaction(f"{i+1}\u20e3")

    # Store the periods in user_state
    user_state[user_id]['periods'] = periods
    user_state[user_id]['conversation_stage'] = PERIOD
    user_state[user_id]['message_id'] = message.id

async def process_hall_choice(user_id, ctx, hall_index):
    logging.info(f"Processing hall choice: index {hall_index}")
    selected_halls = user_state.get(user_id, {}).get('halls')

    if not selected_halls or len(selected_halls) <= hall_index:
        logging.error(f"Invalid hall choice or user state is missing for {user_id}")
        await ctx.send("An error occurred, please try again by starting a new conversation using `!start`.")
        return

    selected_hall = selected_halls[hall_index]
    user_state[user_id]['hall_pid'] = selected_hall['pid']
    user_state[user_id]['hall_name'] = selected_hall['name']
    await display_periods(user_id, ctx)

async def process_period_choice(user_id, ctx, period_index):
    logging.info(f"Processing period choice: index {period_index}")
    selected_periods = user_state.get(user_id, {}).get('periods')
    
    if not selected_periods or len(selected_periods) <= period_index:
        logging.error(f"Invalid period choice or user state is missing for {user_id}")
        await ctx.send("An error occurred, please try again by starting a new conversation using `!start`.")
        return

    selected_period = selected_periods[period_index]
    user_state[user_id]['period'] = selected_period

    today_date = datetime.now().strftime('%Y-%m-%d')
    language = user_state[user_id].get('language', 'English')
    searching_message = translate_text("Searching...", language)
    await ctx.send(searching_message)

    menu = menu_query.fetch_menu_data(date=today_date, meal=user_state[user_id]['period'], pid=user_state[user_id]['hall_pid'])
    
    if not menu:
        logging.warning(f"No menu data found for {user_state[user_id]['hall_name']} on {today_date}")
        no_menu_message = translate_text("Sorry, no menu data available. This hall may not be open during this period.", language)
        await ctx.send(no_menu_message)
        return

    translated_menu = {translate_text(category, language): [translate_text(item['dish'], language) for item in items]
                       for category, items in menu.items()}
    
    formatted_menu = format_menu(translated_menu)
    title = f"{today_date} - {user_state[user_id]['hall_name']} - {user_state[user_id]['period']}"
    
    logging.info(f"Displaying menu for {user_state[user_id]['hall_name']} on {today_date}")
    await ctx.send(f"{title}\n{formatted_menu}")
    user_state[user_id]['conversation_stage'] = None

@bot.command(name='start')
async def start(ctx):
    user_id = ctx.author.id
    # Ensure user_state is initialized
    if user_id not in user_state:
        user_state[user_id] = {
            'conversation_stage': None,
            'language': 'English'
        }
    
    welcome_message = "Welcome to the NCSU Dining Bot! This bot helps you check the daily menu for various dining halls in NCSU campus."
    await ctx.send(translate_text(welcome_message, user_state[user_id]['language']))

    await display_halls(user_id, ctx)

@bot.command(name='language')
async def language_command(ctx):
    languages = cfg.load_languages()
    language_buttons = [f"{i+1}. {lang}" for i, lang in enumerate(languages)]
    
    language_message = translate_text("Select your language:", user_state[ctx.author.id]['language'])
    message = await ctx.send(language_message + "\n" + "\n".join(language_buttons))
    logging.info(f"Sent language selection message: {message.content}")
    
    for i in range(len(languages)):
        await message.add_reaction(f"{i+1}\u20e3")
    
    user_state[ctx.author.id]['languages'] = languages
    user_state[ctx.author.id]['message_id'] = message.id

@bot.event
async def on_raw_reaction_add(payload):
    """This event triggers when a reaction is added."""
    logging.info(f"Reaction received from user: {payload.user_id} with emoji {payload.emoji}")

    # Ignore reactions from bots, including this bot
    if payload.user_id == bot.user.id:
        logging.info("Ignoring bot's own reaction.")
        return  # Exit early if the reaction comes from the bot itself

    # Retrieve the message from the channel
    channel = bot.get_channel(payload.channel_id)
    message = await channel.fetch_message(payload.message_id)



    # Ensure the user state is initialized
    user_id = payload.user_id
    if user_id not in user_state:
        logging.warning(f"User state missing for {user_id}, initializing state.")
        user_state[user_id] = {'conversation_stage': None, 'language': 'English'}  # Initialize default state

    if 'conversation_stage' not in user_state[user_id]:
        logging.warning(f"User {user_id} is not in a conversation")
        return  # Ignore if the user is not in a conversation

    # Make sure the reaction is on the correct message
    if payload.message_id != user_state[user_id]['message_id']:
        logging.warning(f"Reaction on the wrong message by user {user_id}")
        return  # Ignore reactions on other messages

    # Convert the emoji to a corresponding number
    try:
        choice = int(payload.emoji.name[0]) - 1  # Get the index from emoji (1-based index)
        logging.info(f"User {user_id} selected choice {choice}")
    except (ValueError, IndexError):
        logging.error(f"Invalid reaction emoji received: {payload.emoji}")
        return  # Ignore if the reaction is not a number emoji

    ctx = await bot.get_context(message)

    # Process the choice based on the current conversation stage
    if user_state[user_id]['conversation_stage'] == HALL:
        await process_hall_choice(user_id, ctx, choice)
    elif user_state[user_id]['conversation_stage'] == PERIOD:
        await process_period_choice(user_id, ctx, choice)
    elif 'languages' in user_state[user_id]:
        selected_language = user_state[user_id]['languages'][choice]
        user_state[user_id]['language'] = selected_language
        logging.info(f"Language set to {selected_language} for user {user_id}")
        await ctx.send(translate_text(f"Language set. You can now use `!start` to begin.", selected_language))

def start_discord_bot():
    discord_token = cfg.load_discord_config()['discord_token']
    logging.info("Starting the Discord bot...")
    bot.run(discord_token)

if __name__ == '__main__':
    start_discord_bot()
import os
import time
import asyncio
from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.tl.types import DocumentAttributeVideo
from pymongo import MongoClient

load_dotenv()

API_ID = os.getenv("TELEGRAM_API_ID", "")
API_HASH = os.getenv("TELEGRAM_API_HASH", "")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/studyflow")

mongo_client = MongoClient(MONGO_URI)
db = mongo_client.get_default_database()
if db.name is None:
    db = mongo_client["test"]

telegram_sessions_collection = db["telegramsessions"]
telegram_videos_collection = db["telegramvideos"]

async def sync_all_channels():
    # Find all sessions that have some kind of 'active_channels' setting if we had one
    # For simplicity, let's sync all channels we have in videos collection
    # A better approach is to have a User setting for 'synced_channels'
    print("Background worker: Nothing to sync automatically yet. Configure active_channels per user.")

if __name__ == "__main__":
    while True:
        try:
            asyncio.run(sync_all_channels())
        except Exception as e:
            print(f"Error in sync worker: {e}")
        time.sleep(3600)  # Run every hour

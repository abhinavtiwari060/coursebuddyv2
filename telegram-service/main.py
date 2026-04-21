import os
import asyncio
from fastapi import FastAPI, HTTPException, Body, Request, BackgroundTasks
from pydantic import BaseModel
from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import SessionPasswordNeededError, PhoneCodeExpiredError
from pymongo import MongoClient

load_dotenv()

app = FastAPI(title="Telegram Sync Microservice")

API_ID = os.getenv("TELEGRAM_API_ID", "")
API_HASH = os.getenv("TELEGRAM_API_HASH", "")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/studyflow")

if not API_ID or not API_HASH:
    print("WARNING: TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in .env")

# DB Connection
mongo_client = MongoClient(MONGO_URI)
db = mongo_client.get_default_database()
if db.name is None:
    db = mongo_client["test"] # fallback

telegram_sessions_collection = db["telegramsessions"]
telegram_videos_collection = db["telegramvideos"]

# Client Cache to keep connections alive
clients = {}

def get_client(user_id: str, session_string: str = None) -> TelegramClient:
    if user_id in clients:
        return clients[user_id]
        
    if session_string is None:
        doc = telegram_sessions_collection.find_one({"userId": user_id})
        if doc and "sessionString" in doc:
            session_string = doc["sessionString"]
            
    client = TelegramClient(StringSession(session_string), int(API_ID), API_HASH)
    clients[user_id] = client
    return client

class SendCodeRequest(BaseModel):
    user_id: str
    phone: str

class VerifyCodeRequest(BaseModel):
    user_id: str
    phone: str
    phone_code_hash: str
    code: str

@app.post("/api/auth/send_code")
async def send_code(req: SendCodeRequest):
    client = TelegramClient(StringSession(""), int(API_ID), API_HASH)
    await client.connect()
    try:
        sent = await client.send_code_request(req.phone)
        # We need to save the client instance temporarily or rely on string session
        # Telethon doesn't require same client instance if we pass the phone_code_hash, but we need an unauthenticated StringSession
        return {"phone_code_hash": sent.phone_code_hash, "session_string": client.session.save()}
    except Exception as e:
        await client.disconnect()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await client.disconnect()

@app.post("/api/auth/verify_code")
async def verify_code(req: VerifyCodeRequest, session_string: str = Body(..., embed=True)):
    client = TelegramClient(StringSession(session_string), int(API_ID), API_HASH)
    await client.connect()
    try:
        await client.sign_in(phone=req.phone, code=req.code, phone_code_hash=req.phone_code_hash)
        
        # Save session to MongoDB
        new_session_string = client.session.save()
        telegram_sessions_collection.update_one(
            {"userId": req.user_id},
            {"$set": {"userId": req.user_id, "phone": req.phone, "sessionString": new_session_string}},
            upsert=True
        )
        clients[req.user_id] = client # Cache it
        
        me = await client.get_me()
        return {"success": True, "telegram_id": me.id, "username": me.username}
    except SessionPasswordNeededError:
        # 2FA not fully supported in this simple version yet
        raise HTTPException(status_code=400, detail="2FA is enabled on this account, not supported at the moment.")
    except Exception as e:
        await client.disconnect()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/channels")
async def get_channels(user_id: str):
    client = get_client(user_id)
    if not client:
        raise HTTPException(status_code=401, detail="No session found")
    
    if not client.is_connected():
        await client.connect()
        
    try:
        dialogs = await client.get_dialogs()
        channels = []
        for d in dialogs:
            if d.is_channel or d.is_group:
                channels.append({
                    "id": d.id,
                    "title": d.title,
                    "is_channel": d.is_channel
                })
        return channels
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class SyncRequest(BaseModel):
    user_id: str
    channel_id: int
    limit: int = 50

@app.post("/api/sync")
async def sync_channel(req: SyncRequest, background_tasks: BackgroundTasks):
    client = get_client(req.user_id)
    if not client:
        raise HTTPException(status_code=401, detail="No session found")
        
    if not client.is_connected():
        await client.connect()
        
    downloads_dir = os.path.join(os.getcwd(), "downloads")
    os.makedirs(downloads_dir, exist_ok=True)
    
    async def perform_sync():
        try:
            from telethon.tl.types import DocumentAttributeVideo
            messages = await client.get_messages(req.channel_id, limit=req.limit)
            for msg in messages:
                if msg.video:
                    existing = telegram_videos_collection.find_one({"videoId": msg.id, "channelId": req.channel_id})
                    if existing:
                        continue
                        
                    attr = next((a for a in msg.video.attributes if isinstance(a, DocumentAttributeVideo)), None)
                    duration = attr.duration if attr else 0
                    
                    file_path = os.path.join(downloads_dir, f"{req.channel_id}_{msg.id}.mp4")
                    await client.download_media(msg, file=file_path)
                    
                    telegram_videos_collection.insert_one({
                        "userId": req.user_id,
                        "channelId": req.channel_id,
                        "videoId": msg.id,
                        "caption": msg.message or "Telegram Video",
                        "filePath": file_path,
                        "timestamp": msg.date,
                        "duration": duration,
                        "createdAt": asyncio.get_running_loop().time()
                    })
        except Exception as e:
            import traceback
            traceback.print_exc()

    background_tasks.add_task(perform_sync)
    return {"success": True, "message": "Sync started in background"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

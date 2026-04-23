import os
import asyncio
import uuid
import traceback
from fastapi import FastAPI, HTTPException, Body, Request, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import SessionPasswordNeededError, PhoneCodeExpiredError
from telethon.tl.types import DocumentAttributeVideo
from telethon.tl.functions.messages import GetDialogsRequest
from pymongo import MongoClient

load_dotenv()

app = FastAPI(title="Telegram Sync Microservice")

API_ID = os.getenv("TELEGRAM_API_ID", "")
API_HASH = os.getenv("TELEGRAM_API_HASH", "")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/studyflow")

if not API_ID or not API_HASH:
    print("WARNING: TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in .env")

os.makedirs("downloads", exist_ok=True)
app.mount("/downloads", StaticFiles(directory="downloads"), name="downloads")

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
    session_string: str

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
async def verify_code(req: VerifyCodeRequest):
    print("VERIFY ROUTE HIT. Payload:", req.dict())
    client = TelegramClient(StringSession(req.session_string), int(API_ID), API_HASH)
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
    print(f"GET CHANNELS ROUTE HIT for user_id: {user_id}")
    client = get_client(user_id)
    if not client:
        print("Error: No session found for user_id", user_id)
        raise HTTPException(status_code=401, detail="No session found. Please re-authenticate.")
    
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
        import traceback
        print("ERROR IN GET CHANNELS:")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/auth/status")
async def get_status(user_id: str):
    doc = telegram_sessions_collection.find_one({"userId": user_id})
    if not doc or "sessionString" not in doc:
        return {"connected": False}
        
    client = TelegramClient(StringSession(doc["sessionString"]), int(API_ID), API_HASH)
    
    try:
        await client.connect()
        if not await client.is_user_authorized():
            await client.disconnect()
            return {"connected": False}
            
        total_videos = telegram_videos_collection.count_documents({"user_id": user_id})
        await client.disconnect()
        return {
            "connected": True,
            "phone": doc.get("phone", ""),
            "total_videos": total_videos,
            "last_sync": doc.get("lastSync")
        }
    except Exception as e:
        await client.disconnect()
        return {"connected": False}

class SyncRequest(BaseModel):
    user_id: str
    channel_id: int
    limit: int = 50

# In-memory tracking for progress bar
sync_status_cache = {}

@app.get("/api/sync/status")
async def get_sync_status(user_id: str):
    if user_id in sync_status_cache:
        return sync_status_cache[user_id]
    return {
        "syncing": False,
        "total": 0,
        "completed": 0,
        "remaining": 0,
        "percent": 0,
        "current_video": ""
    }

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
            # Initialize tracker
            sync_status_cache[req.user_id] = {
                "syncing": True,
                "total": 0,
                "completed": 0,
                "remaining": 0,
                "percent": 0,
                "current_video": "Fetching messages..."
            }

            messages = await client.get_messages(req.channel_id, limit=req.limit)
            video_messages = [msg for msg in messages if msg.video]
            total_vids = len(video_messages)
            
            sync_status_cache[req.user_id]["total"] = total_vids
            sync_status_cache[req.user_id]["remaining"] = total_vids
            
            # Fetch channel name properly
            entity = await client.get_entity(req.channel_id)
            channel_name = getattr(entity, 'title', str(req.channel_id))
            
            # Record latest sync
            telegram_sessions_collection.update_one(
                {"userId": req.user_id}, 
                {"$set": {"lastSync": asyncio.get_running_loop().time()}}
            )

            completed = 0
            for msg in video_messages:
                    existing = telegram_videos_collection.find_one({
                        "user_id": req.user_id, 
                        "telegram_message_id": msg.id, 
                        "channel_id": req.channel_id
                    })
                    if existing:
                        continue
                        
                    attr = next((a for a in msg.video.attributes if isinstance(a, DocumentAttributeVideo)), None)
                    duration = attr.duration if attr else 0
                    size_mb = msg.video.size / (1024 * 1024) if msg.video and hasattr(msg.video, 'size') else 0
                    
                    vid_title = msg.message or f"Video {msg.id}"
                    
                    # Update cache state
                    sync_status_cache[req.user_id].update({
                        "current_video": vid_title[:50] + ("..." if len(vid_title)>50 else ""),
                    })

                    vid_id = str(uuid.uuid4())
                    file_name = f"{req.channel_id}_{msg.id}.mp4"
                    file_path = os.path.join(downloads_dir, file_name)
                    
                    thumb_name = f"{req.channel_id}_{msg.id}_thumb.jpg"
                    thumb_path = os.path.join(downloads_dir, thumb_name)
                    
                    # Download video and thumbnail safely
                    await client.download_media(msg, file=file_path)
                    try:
                        await client.download_media(msg, file=thumb_path, thumb=-1)
                    except:
                        thumb_path = "" # ignore thumbnail extraction bugs

                    link = f"https://t.me/c/{str(req.channel_id).replace('-100', '')}/{msg.id}"
                    
                    telegram_videos_collection.insert_one({
                        "video_id": vid_id,
                        "telegram_message_id": msg.id,
                        "user_id": req.user_id,
                        "channel_id": req.channel_id,
                        "channel_name": channel_name,
                        "caption": vid_title,
                        "file_path": file_path,
                        "file_name": file_name,
                        "thumbnail": thumb_path,
                        "telegram_link": link,
                        "upload_time": msg.date,
                        "duration": duration,
                        "size_mb": round(size_mb, 2),
                        "sync_date": asyncio.get_running_loop().time()
                    })

                completed += 1
                sync_status_cache[req.user_id].update({
                    "completed": completed,
                    "remaining": total_vids - completed,
                    "percent": int((completed / total_vids) * 100) if total_vids > 0 else 100
                })
        except Exception as e:
            traceback.print_exc()
        finally:
            if req.user_id in sync_status_cache:
                sync_status_cache[req.user_id]["syncing"] = False

    background_tasks.add_task(perform_sync)
    return {"success": True, "message": "Sync started in background"}

# ── AUTO SYNC LOOP ────────────────────────────
async def auto_sync_loop():
    while True:
        try:
            # wait 30 minutes
            await asyncio.sleep(1800)
            
            # Fetch all user sessions
            sessions = telegram_sessions_collection.find({})
            for session in sessions:
                user_id = session.get("userId")
                if not user_id: continue
                
                client = get_client(user_id, session.get("sessionString"))
                if not client.is_connected():
                    await client.connect()
                
                if not await client.is_user_authorized():
                    continue
                    
                # Find all channels the user has synced previously
                videos = telegram_videos_collection.find({"user_id": user_id}).distinct("channel_id")
                
                downloads_dir = os.path.join(os.getcwd(), "downloads")
                os.makedirs(downloads_dir, exist_ok=True)
                
                for ch_id in videos:
                    # Sync top 10 messages from each channel to catch up automatically
                    try:
                        messages = await client.get_messages(ch_id, limit=20)
                        entity = await client.get_entity(ch_id)
                        channel_name = getattr(entity, 'title', str(ch_id))
                        
                        for msg in messages:
                            if msg.video:
                                existing = telegram_videos_collection.find_one({"user_id": user_id, "telegram_message_id": msg.id, "channel_id": ch_id})
                                if existing: continue
                                
                                attr = next((a for a in msg.video.attributes if isinstance(a, DocumentAttributeVideo)), None)
                                duration = attr.duration if attr else 0
                                
                                vid_id = str(uuid.uuid4())
                                file_name = f"{ch_id}_{msg.id}.mp4"
                                file_path = os.path.join(downloads_dir, file_name)
                                thumb_name = f"{ch_id}_{msg.id}_thumb.jpg"
                                thumb_path = os.path.join(downloads_dir, thumb_name)
                                
                                await client.download_media(msg, file=file_path)
                                try:
                                    await client.download_media(msg, file=thumb_path, thumb=-1)
                                except:
                                    thumb_path = ""
                                
                                link = f"https://t.me/c/{str(ch_id).replace('-100', '')}/{msg.id}"
                                
                                telegram_videos_collection.insert_one({
                                    "video_id": vid_id,
                                    "telegram_message_id": msg.id,
                                    "user_id": user_id,
                                    "channel_id": ch_id,
                                    "channel_name": channel_name,
                                    "caption": msg.message or "Telegram Video",
                                    "file_path": file_path,
                                    "file_name": file_name,
                                    "thumbnail": thumb_path,
                                    "telegram_link": link,
                                    "upload_time": msg.date,
                                    "duration": duration,
                                    "sync_date": asyncio.get_running_loop().time()
                                })
                    except Exception as e:
                        print(f"Auto-sync failed for channel {ch_id}:", e)
        except Exception as e:
            traceback.print_exc()

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(auto_sync_loop())

@app.get("/api/health")
async def health_check():
    # Simple check to ensure service is up and db is reachable
    try:
        # Check mongo connection
        mongo_client.admin.command('ping')
        return {"status": "ok", "service": "Telegram Sync Microservice"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

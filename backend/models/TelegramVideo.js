import mongoose from 'mongoose';

const telegramVideoSchema = new mongoose.Schema({
  video_id: { type: String, required: true }, // unique string ID internal use
  telegram_message_id: { type: Number, required: true }, // from Telegram msg.id
  user_id: { type: String, required: true },
  
  file_path: { type: String, required: true },
  file_name: { type: String },
  thumbnail: { type: String }, // path to downloaded thumbnail
  
  channel_name: { type: String }, 
  channel_id: { type: Number, required: true },
  
  caption: { type: String, default: '' },
  telegram_link: { type: String },         // legacy – kept for backwards compat
  telegramDeepLink: { type: String },     // tg://resolve?domain=...&post=...
  telegramWebLink: { type: String },      // https://t.me/channel/msgid
  telegramPrivateLink: { type: String },  // https://t.me/c/channelid/msgid (private)
  
  duration: { type: Number, default: 0 },
  
  upload_time: { type: Date }, // from msg.date
  sync_date: { type: Date, default: Date.now },
});

// Prevent duplicates for same video/message inside the same channel for the same user
telegramVideoSchema.index({ user_id: 1, telegram_message_id: 1, channel_id: 1 }, { unique: true });

export default mongoose.model('TelegramVideo', telegramVideoSchema);

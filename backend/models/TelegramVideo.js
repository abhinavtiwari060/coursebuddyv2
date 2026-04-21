import mongoose from 'mongoose';

const telegramVideoSchema = new mongoose.Schema({
  userId: {
    type: String, // String representation of ObjectId, or ObjectId
    required: true,
  },
  channelId: {
    type: Number,
    required: true,
  },
  videoId: {
    type: Number,
    required: true,
  },
  caption: {
    type: String,
    default: '',
  },
  filePath: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
  },
  duration: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Avoid duplicates for same video in same channel
telegramVideoSchema.index({ channelId: 1, videoId: 1 }, { unique: true });

export default mongoose.model('TelegramVideo', telegramVideoSchema);

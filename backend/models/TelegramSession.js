import mongoose from 'mongoose';

const telegramSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  sessionString: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

telegramSessionSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model('TelegramSession', telegramSessionSchema);

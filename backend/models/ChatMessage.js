import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  room: {
    type: String,
    required: true,
    enum: ['government-exams', 'iit-neet', 'skills', 'other'],
    index: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderName: {
    type: String,
    required: true,
    trim: true,
  },
  senderAvatar: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: {
    type: Date,
    default: null,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // Exactly 48 hours
  },
});

// TTL index to automatically purge documents after expiresAt timestamp
chatMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
chatMessageSchema.index({ room: 1, createdAt: 1 });

export default mongoose.model('ChatMessage', chatMessageSchema);

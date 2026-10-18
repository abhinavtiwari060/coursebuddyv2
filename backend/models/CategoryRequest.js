import mongoose from 'mongoose';

const categoryRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  currentCategory: {
    type: String,
    required: true,
  },
  requestedCategory: {
    type: String,
    required: true,
    enum: ['government-exams', 'iit-neet', 'skills', 'other'],
  },
  reason: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

categoryRequestSchema.index({ userId: 1, status: 1 });

export default mongoose.model('CategoryRequest', categoryRequestSchema);

import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['government-exams', 'iit-neet', 'skills', 'other', 'general'], 
    default: 'general',
    index: true
  },
  subcategory: { type: String, default: '' },
  description: { type: String, default: '' },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date },
  isPendingDelete: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Course', courseSchema);

import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'active', 'ended'], default: 'draft' },
  duration: { type: Number, default: 30 }, // minutes
  isRetryAllowed: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, default: null },
  endTime: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('Quiz', quizSchema);

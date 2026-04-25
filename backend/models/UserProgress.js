import mongoose from 'mongoose';

const userProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  lastVideoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', default: null },
  watchedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
  progressPercent: { type: Number, default: 0 },
  watchPosition: { type: Number, default: 0 }, // seconds within lastVideo
}, { timestamps: true });

userProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export default mongoose.model('UserProgress', userProgressSchema);

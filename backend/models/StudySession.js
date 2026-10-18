import mongoose from 'mongoose';

const studySessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  videoId: {
    type: String,
    required: true,
  },
  courseId: {
    type: String,
    default: '',
  },
  playlistId: {
    type: String,
    default: '',
  },
  sessionId: {
    type: String,
    required: true,
  },
  durationSeconds: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  dateKey: {
    type: String, // YYYY-MM-DD
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

studySessionSchema.index({ userId: 1, createdAt: -1 });
studySessionSchema.index({ createdAt: -1 });
studySessionSchema.index({ userId: 1, sessionId: 1 });

export default mongoose.model('StudySession', studySessionSchema);

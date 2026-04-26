import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: String, required: true }, // Using static string mapping to course name to keep it simple, or reference ID
  title: { type: String, required: true },
  link: { type: String, required: true },
  youtubeVideoId: { type: String, default: '' },
  playlistId: { type: String },
  platform: { type: String, required: true },
  duration: { type: Number, default: 0 },
  tag: { type: String, default: '' },
  notes: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  isPendingDelete: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  order: { type: Number, default: Date.now }
});

export default mongoose.model('Video', videoSchema);

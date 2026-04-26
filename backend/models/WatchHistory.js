import mongoose from 'mongoose';

/**
 * WatchHistory Model
 * Tracks per-user, per-video watch progress for the new YouTube player system.
 * Used for "continue watching", progress bars, and history view.
 */
const watchHistorySchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  playlistId:  { type: String, required: true },  // YouTube playlist ID
  videoId:     { type: String, required: true },  // YouTube video ID
  videoTitle:  { type: String, default: '' },

  // Playback state
  watchedSeconds:    { type: Number, default: 0 },   // seconds watched (last known position)
  durationSeconds:   { type: Number, default: 0 },   // total duration of the video
  completed:         { type: Boolean, default: false }, // true when >=90% watched
  completedAt:       { type: Date, default: null },

  // Progress percentage (0-100)
  progressPercent: { type: Number, default: 0 },

  lastWatchedAt: { type: Date, default: Date.now },
  watchCount:    { type: Number, default: 1 },       // number of times this video was opened
}, { timestamps: true });

// Compound unique index — one record per user/playlist/video
watchHistorySchema.index({ userId: 1, playlistId: 1, videoId: 1 }, { unique: true });
watchHistorySchema.index({ userId: 1, playlistId: 1 });
watchHistorySchema.index({ userId: 1, lastWatchedAt: -1 });

export default mongoose.model('WatchHistory', watchHistorySchema);

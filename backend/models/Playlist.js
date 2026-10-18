import mongoose from 'mongoose';

/**
 * Playlist Model
 * Stores YouTube playlist metadata imported by admin.
 * Each playlist is linked to a course and contains cached video data.
 */
const playlistSchema = new mongoose.Schema({
  // Admin-defined fields
  courseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  courseName:   { type: String, required: true },
  category:     { 
    type: String, 
    enum: ['government-exams', 'iit-neet', 'skills', 'other', 'general'], 
    default: 'general',
    index: true 
  },
  subcategory:  { type: String, default: '' },
  playlistId:   { type: String, required: true, unique: true }, // YouTube playlist ID
  playlistUrl:  { type: String, required: true },
  title:        { type: String, required: true },
  description:  { type: String, default: '' },
  thumbnail:    { type: String, default: '' },
  channelTitle: { type: String, default: '' },
  videoCount:   { type: Number, default: 0 },
  totalDuration:{ type: Number, default: 0 }, // total seconds of all videos

  // Cached video list (avoids repeated API calls)
  videos: [{
    videoId:      { type: String, required: true },
    title:        { type: String, required: true },
    description:  { type: String, default: '' },
    thumbnail:    { type: String, default: '' },
    duration:     { type: Number, default: 0 }, // seconds
    position:     { type: Number, default: 0 }, // playlist order index
    channelTitle: { type: String, default: '' },
    publishedAt:  { type: Date },
  }],

  // Cache management
  lastFetchedAt: { type: Date, default: Date.now },
  cacheTtlHours: { type: Number, default: 24 }, // refresh after this many hours

  // Which users this playlist is assigned to
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Index for fast lookup
playlistSchema.index({ courseId: 1 });
playlistSchema.index({ assignedTo: 1 });

export default mongoose.model('Playlist', playlistSchema);

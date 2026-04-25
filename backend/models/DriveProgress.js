import mongoose from 'mongoose';

const driveProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileId: { type: String, required: true },       // DriveVideo.fileId
  driveFolderId: { type: String, required: true }, // root folder
  watchPosition: { type: Number, default: 0 },    // seconds
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  lastWatched: { type: Date, default: Date.now },
}, { timestamps: true });

driveProgressSchema.index({ userId: 1, fileId: 1 }, { unique: true });
driveProgressSchema.index({ userId: 1, driveFolderId: 1 });

export default mongoose.model('DriveProgress', driveProgressSchema);

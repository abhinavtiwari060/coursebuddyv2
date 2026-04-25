import mongoose from 'mongoose';

const driveFolderSchema = new mongoose.Schema({
  folderId: { type: String, required: true, unique: true }, // Google Drive folder ID
  folderName: { type: String, required: true },             // Display / course name (editable)
  folderUrl: { type: String, default: '' },
  description: { type: String, default: '' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastSynced: { type: Date, default: null },
  syncStatus: { type: String, enum: ['idle', 'syncing', 'done', 'error'], default: 'idle' },
  syncError: { type: String, default: '' },
  totalVideos: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('DriveFolder', driveFolderSchema);

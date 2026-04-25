import mongoose from 'mongoose';

const driveVideoSchema = new mongoose.Schema({
  driveFolderId: { type: String, required: true, index: true }, // root DriveFolder.folderId
  fileId: { type: String, required: true, unique: true },        // Google Drive file ID
  title: { type: String, required: true },
  mimeType: { type: String, default: '' },
  // Hierarchy breadcrumb: ['CourseName', 'SubjectName', 'ChapterName']
  pathParts: { type: [String], default: [] },
  // Denormalized for fast querying
  courseName: { type: String, default: '' },   // pathParts[0]
  subjectName: { type: String, default: '' },  // pathParts[1]
  chapterName: { type: String, default: '' },  // pathParts[2]
  thumbnail: { type: String, default: '' },
  duration: { type: Number, default: 0 },       // seconds (Drive doesn't always provide)
  size: { type: Number, default: 0 },           // bytes
  driveOrder: { type: Number, default: 0 },     // order within parent folder
  // Player state per-user is handled in UserProgress; this is global metadata
  createdAtDrive: { type: Date, default: null },
}, { timestamps: true });

driveVideoSchema.index({ driveFolderId: 1, courseName: 1, subjectName: 1 });

export default mongoose.model('DriveVideo', driveVideoSchema);

import mongoose from 'mongoose';

const driveVideoSchema = new mongoose.Schema({
  driveFolderId: { type: String, required: true, index: true }, // root DriveFolder.folderId
  fileId: { type: String, required: true, unique: true },        // Google Drive file ID
  title: { type: String, required: true },
  mimeType: { type: String, default: '' },
  // Hierarchy breadcrumb: ['CourseName', 'SubjectName', 'ChapterName']
  pathParts: { type: [String], default: [] },
  // Denormalized for fast querying
  courseName: { type: String, default: '' },   
  subjectName: { type: String, default: '' },  
  chapterName: { type: String, default: '' },  
  parentFolderId: { type: String, default: '' }, // Direct parent folder ID
  thumbnail: { type: String, default: '' },
  duration: { type: Number, default: 0 },       
  size: { type: Number, default: 0 },           
  driveOrder: { type: Number, default: 0 },     
  createdAtDrive: { type: Date, default: null },
}, { timestamps: true });

driveVideoSchema.index({ driveFolderId: 1, courseName: 1, subjectName: 1 });

export default mongoose.model('DriveVideo', driveVideoSchema);

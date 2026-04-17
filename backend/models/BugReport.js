import mongoose from 'mongoose';

const bugReportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  severity: { type: String, default: 'medium' },
  steps: { type: String, default: '' },
  browser: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('BugReport', bugReportSchema);

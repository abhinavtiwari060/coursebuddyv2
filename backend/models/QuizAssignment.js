import mongoose from 'mongoose';

const quizAssignmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedAt: { type: Date, default: Date.now },
  accessStatus: { type: String, enum: ['active', 'revoked'], default: 'active' }
});

export default mongoose.model('QuizAssignment', quizAssignmentSchema);

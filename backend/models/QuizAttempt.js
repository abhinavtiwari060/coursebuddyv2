import mongoose from 'mongoose';

const quizAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selected: { type: String, default: '' },
  }],
  score: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  timeTaken: { type: Number, default: 0 }, // seconds
  rank: { type: Number, default: 0 },
  rankScore: { type: Number, default: 0 }, // computed: (score * 10) + speed bonus
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// ensure one attempt per user per quiz (unless retry allowed)
quizAttemptSchema.index({ userId: 1, quizId: 1 });

export default mongoose.model('QuizAttempt', quizAttemptSchema);

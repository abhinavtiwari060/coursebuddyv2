import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' }, // URL or base64
  fcmToken: { type: String, default: null }, // For Push Notifications
  isOnline: { type: Boolean, default: false },
  features: {
    type: Object,
    default: {
      canAddCourse: true,
      canDeleteCourse: true,
      canUsePomodoro: true,
      canUseCommunity: true,
      canUseLeaderboard: true,
      canReportBug: true
    }
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);

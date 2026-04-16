import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Models
import User from './models/User.js';
import Video from './models/Video.js';
import Course from './models/Course.js';
import Streak from './models/Streak.js';

dotenv.config();

const app = express();
app.use(express.json());

import cors from "cors";

app.use(cors({
  origin: "*", // temporarily allow all
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Global Logger for Debugging 404s
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Root Route
app.get('/', (req, res) => {
  res.send('API is running successfully 🚀');
});

// ── Database Connection ───────────────────────────────────────
mongoose.set('bufferCommands', false); // Disable global buffering

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/studyflow', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  family: 4, // Force IPv4
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('DB Connection Error:', err));

// ── Middleware ────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admins only' });
  }
  next();
};

// ── Auth Routes ───────────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    // Automatically assign admin if it's a specific admin email or let them be users
    const role = email === 'admin@studyflow.com' ? 'admin' : 'user';

    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();

    // sign token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'super_secret', { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name, email, role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (user.status === 'blocked') return res.status(403).json({ error: 'Your account has been blocked by an administrator.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'super_secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── User Application Routes ───────────────────────────────────

// Course Routes
app.get('/api/courses', authMiddleware, async (req, res) => {
  try {
    const courses = await Course.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/courses', authMiddleware, async (req, res) => {
  try {
    const existing = await Course.findOne({ userId: req.user.id, name: req.body.name });
    if (existing) return res.status(400).json({ error: 'Course already exists' });
    const course = new Course({ name: req.body.name, userId: req.user.id });
    await course.save();
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/courses/:id', authMiddleware, async (req, res) => {
  try {
    await Course.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Streak Routes
app.get('/api/streak', authMiddleware, async (req, res) => {
  try {
    let streak = await Streak.findOne({ userId: req.user.id });
    if (!streak) {
      streak = new Streak({ userId: req.user.id, currentStreak: 0, lastActiveDate: null });
      await streak.save();
    }
    res.json(streak);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/streak/update', authMiddleware, async (req, res) => {
  try {
    let streak = await Streak.findOne({ userId: req.user.id });
    if (!streak) {
      streak = new Streak({ userId: req.user.id, currentStreak: 1, lastActiveDate: new Date() });
    } else {
      const today = new Date();
      const lastActive = streak.lastActiveDate ? new Date(streak.lastActiveDate) : null;

      if (!lastActive) {
        streak.currentStreak = 1;
      } else {
        const diffTime = Math.abs(today - lastActive);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1 || diffDays === 0) {
          // It's technically next day or same day, update streak if diffDays == 1,
          if (today.toDateString() !== lastActive.toDateString()) {
            streak.currentStreak += 1;
          }
        } else if (diffDays > 1) {
          streak.currentStreak = 1; // Streak broken
        }
      }
      streak.lastActiveDate = today;
    }
    await streak.save();
    res.json(streak);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/videos', authMiddleware, async (req, res) => {
  try {
    const videos = await Video.find({ userId: req.user.id }).sort({ order: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/videos', authMiddleware, async (req, res) => {
  try {
    const video = new Video({ ...req.body, userId: req.user.id });
    await video.save();
    res.status(201).json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/videos/:id', authMiddleware, async (req, res) => {
  try {
    // Used for mark as completed or update notes
    const video = await Video.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true }
    );
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/videos/:id', authMiddleware, async (req, res) => {
  try {
    await Video.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Routes ──────────────────────────────────────────────
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password');
    // For each user, maybe we aggregate total videos, completed, duration?
    // Doing a manual query mapping for simplicity
    const userStats = await Promise.all(users.map(async (user) => {
      const videos = await Video.find({ userId: user._id });
      const completed = videos.filter(v => v.completed);
      const totalWatchTime = completed.reduce((a, v) => a + (v.duration || 0), 0);

      return {
        ...user.toObject(),
        totalVideos: videos.length,
        completedVideos: completed.length,
        totalWatchTime
      };
    }));

    res.json(userStats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Video.deleteMany({ userId: req.params.id });
    await Course.deleteMany({ userId: req.params.id });
    await Streak.deleteOne({ userId: req.params.id });
    res.json({ message: 'User and associated data deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const videos = await Video.find({ userId: user._id });
    const courses = await Course.find({ userId: user._id });
    const streak = await Streak.findOne({ userId: user._id });

    const completed = videos.filter(v => v.completed);
    const totalWatchTime = completed.reduce((a, v) => a + (v.duration || 0), 0);

    res.json({
      user,
      stats: {
        totalCourses: courses.length,
        totalVideos: videos.length,
        completedVideos: completed.length,
        totalWatchTime,
        currentStreak: streak ? streak.currentStreak : 0,
      },
      videos
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/users/:id/block', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.status = user.status === 'blocked' ? 'active' : 'blocked';
    await user.save();
    res.json({ message: `User status updated to ${user.status}`, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => {
    console.log("✅ MongoDB connected");

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => console.log("❌ DB Connection Error:", err));
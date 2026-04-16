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

// ✅ IMPORTANT (body read karega)
app.use(express.json());

// ✅ CORS (temporary allow all)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

// Logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Root
app.get('/', (req, res) => {
  res.send('API is running successfully 🚀');
});

// ── Middleware ─────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admins only' });
  }
  next();
};

// ── Auth Routes ─────────────────────
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const role = email === 'admin@studyflow.com' ? 'admin' : 'user';

    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user._id, name, email, role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Course Routes ─────────────────────
app.get('/api/courses', authMiddleware, async (req, res) => {
  const courses = await Course.find({ userId: req.user.id });
  res.json(courses);
});

app.post('/api/courses', authMiddleware, async (req, res) => {
  const course = new Course({
    name: req.body.name,
    userId: req.user.id,
  });
  await course.save();
  res.json(course);
});

// ── Video Routes ─────────────────────
app.get('/api/videos', authMiddleware, async (req, res) => {
  const videos = await Video.find({ userId: req.user.id });
  res.json(videos);
});

app.post('/api/videos', authMiddleware, async (req, res) => {
  const video = new Video({
    ...req.body,
    userId: req.user.id,
  });
  await video.save();
  res.json(video);
});

// ── Streak ─────────────────────
app.get('/api/streak', authMiddleware, async (req, res) => {
  let streak = await Streak.findOne({ userId: req.user.id });

  if (!streak) {
    streak = new Streak({ userId: req.user.id, currentStreak: 0 });
    await streak.save();
  }

  res.json(streak);
});

// ── Admin ─────────────────────
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

// ── START SERVER ─────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => {
    console.log("✅ MongoDB connected");

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => console.log("❌ DB Error:", err));
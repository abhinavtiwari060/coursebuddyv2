import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import axios from 'axios';
import Groq from 'groq-sdk';

import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Models
import User from './models/User.js';
import Video from './models/Video.js';
import Course from './models/Course.js';
import Streak from './models/Streak.js';
import Thought from './models/Thought.js';
import PlaylistSuggestion from './models/PlaylistSuggestion.js';
import Settings from './models/Settings.js';
import BugReport from './models/BugReport.js';
import Notification from './models/Notification.js';
import admin from 'firebase-admin';

// Quiz & Progress Models
import Quiz from './models/Quiz.js';
import Question from './models/Question.js';
import QuizAttempt from './models/QuizAttempt.js';
import UserProgress from './models/UserProgress.js';
import QuizAssignment from './models/QuizAssignment.js';
import DeleteRequest from './models/DeleteRequest.js';
import Playlist from './models/Playlist.js';
import Todo from './models/Todo.js';
import ChatMessage from './models/ChatMessage.js';
import StudySession from './models/StudySession.js';
import WatchHistory from './models/WatchHistory.js';




import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
try {
  // 1. Check for remote/production env variables first (e.g. Render)
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Handle stringified newlines in environment variables safely
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
      });
    }
    console.log("🔥 Firebase Admin Initialized (via Environment Variables)");
  // 2. Fall back to local file if it exists
  } else {
    const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'serviceAccountKey.json'), 'utf8'));
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    console.log("🔥 Firebase Admin Initialized (via local file)");
  }
} catch (err) {
  console.log("Firebase Admin not configured correctly:", err.message);
}

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  }
});

app.use(express.json());

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
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

// ── Socket.IO Setup with Category Rooms & 48h TTL ─────────
const VALID_CHAT_ROOMS = ['government-exams', 'iit-neet', 'skills', 'other'];
const userMessageRateMap = new Map();

io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1] ||
      socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id).select('name email role avatar category');
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = {
      id: user._id.toString(),
      name: user.name,
      avatar: user.avatar || '',
      category: user.category || 'other',
      role: user.role,
    };
    next();
  } catch (err) {
    next(new Error('Invalid socket authentication: ' + err.message));
  }
});

io.on('connection', (socket) => {
  socket.on('join_room', (room) => {
    if (VALID_CHAT_ROOMS.includes(room)) {
      socket.join(room);
    }
  });

  socket.on('leave_room', (room) => {
    socket.leave(room);
  });

  socket.on('send_message', async (data, callback) => {
    try {
      const { room, message } = data;
      if (!VALID_CHAT_ROOMS.includes(room)) {
        if (callback) callback({ error: 'Invalid room' });
        return;
      }

      if (!message || typeof message !== 'string') {
        if (callback) callback({ error: 'Message content required' });
        return;
      }

      const trimmed = message.trim();
      if (trimmed.length === 0 || trimmed.length > 1000) {
        if (callback) callback({ error: 'Message must be between 1 and 1000 characters' });
        return;
      }

      const now = Date.now();
      const lastMsgTime = userMessageRateMap.get(socket.user.id) || 0;
      if (now - lastMsgTime < 800) {
        if (callback) callback({ error: 'Please wait a moment before sending another message' });
        return;
      }
      userMessageRateMap.set(socket.user.id, now);

      const chatMsg = new ChatMessage({
        room,
        senderId: socket.user.id,
        senderName: socket.user.name,
        senderAvatar: socket.user.avatar || '',
        message: trimmed,
        createdAt: new Date(),
        expiresAt: new Date(now + 48 * 60 * 60 * 1000),
      });
      await chatMsg.save();

      const payload = {
        _id: chatMsg._id,
        room: chatMsg.room,
        senderId: chatMsg.senderId,
        senderName: chatMsg.senderName,
        senderAvatar: chatMsg.senderAvatar,
        message: chatMsg.message,
        createdAt: chatMsg.createdAt,
      };

      io.to(room).emit('receive_message', payload);
      if (callback) callback({ success: true, message: payload });
    } catch (err) {
      console.error('Socket message error:', err);
      if (callback) callback({ error: 'Failed to send message' });
    }
  });
});

// GET /api/chat/messages/:room
app.get('/api/chat/messages/:room', authMiddleware, async (req, res) => {
  try {
    const { room } = req.params;
    if (!VALID_CHAT_ROOMS.includes(room)) {
      return res.status(400).json({ error: 'Invalid room' });
    }

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const messages = await ChatMessage.find({
      room,
      createdAt: { $gte: fortyEightHoursAgo },
    })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Personal To-Do Routes ─────────────────────────────
app.get('/api/todos', authMiddleware, async (req, res) => {
  try {
    const { status, category } = req.query;
    const query = { userId: req.user.id };

    const now = new Date();
    if (status === 'completed') {
      query.completed = true;
    } else if (status === 'pending') {
      query.completed = false;
    } else if (status === 'overdue') {
      query.completed = false;
      query.dueDate = { $ne: null, $lt: now };
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    const todos = await Todo.find(query)
      .sort({ completed: 1, dueDate: 1, createdAt: -1 })
      .lean();

    const totalCount = await Todo.countDocuments({ userId: req.user.id });
    const pendingCount = await Todo.countDocuments({ userId: req.user.id, completed: false });
    const completedCount = await Todo.countDocuments({ userId: req.user.id, completed: true });
    const overdueCount = await Todo.countDocuments({
      userId: req.user.id,
      completed: false,
      dueDate: { $ne: null, $lt: now },
    });

    res.json({
      todos,
      counts: {
        total: totalCount,
        pending: pendingCount,
        completed: completedCount,
        overdue: overdueCount,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/todos', authMiddleware, async (req, res) => {
  try {
    const { title, description, dueDate, category } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const todo = new Todo({
      userId: req.user.id,
      title: title.trim(),
      description: (description || '').trim(),
      dueDate: dueDate ? new Date(dueDate) : null,
      category: category || 'general',
    });

    await todo.save();
    res.status(201).json(todo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/todos/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, dueDate, category, completed } = req.body;
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id });
    if (!todo) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    if (title !== undefined) todo.title = title.trim();
    if (description !== undefined) todo.description = description.trim();
    if (dueDate !== undefined) todo.dueDate = dueDate ? new Date(dueDate) : null;
    if (category !== undefined) todo.category = category;
    if (completed !== undefined) {
      todo.completed = Boolean(completed);
      todo.completedAt = completed ? new Date() : null;
    }

    await todo.save();
    res.json(todo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/todos/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id });
    if (!todo) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    todo.completed = !todo.completed;
    todo.completedAt = todo.completed ? new Date() : null;
    await todo.save();

    res.json(todo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/todos/:id', authMiddleware, async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!todo) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }
    res.json({ message: 'Task deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Validated Video Watch-Time Tracking ───────────────
const lastHeartbeatMap = new Map();

app.post('/api/watch/heartbeat', authMiddleware, async (req, res) => {
  try {
    const { sessionId, videoId, courseId, playlistId, currentPosition, durationSeconds, incrementSeconds } = req.body;

    if (!sessionId || !videoId) {
      return res.status(400).json({ error: 'sessionId and videoId are required' });
    }

    const inc = Number(incrementSeconds) || 0;
    if (inc <= 0) {
      return res.json({ status: 'ignored', reason: 'zero or negative increment' });
    }
    if (inc > 30) {
      return res.status(400).json({ error: 'Watch time increment out of bounds' });
    }

    const now = Date.now();
    const lastTime = lastHeartbeatMap.get(sessionId) || 0;
    if (now - lastTime < 3000) {
      return res.status(429).json({ error: 'Heartbeat rate exceeded' });
    }
    lastHeartbeatMap.set(sessionId, now);

    const dateKey = new Date().toISOString().split('T')[0];

    const sessionLog = new StudySession({
      userId: req.user.id,
      videoId: String(videoId),
      courseId: courseId ? String(courseId) : '',
      playlistId: playlistId ? String(playlistId) : '',
      sessionId: String(sessionId),
      durationSeconds: Math.round(inc),
      dateKey,
    });
    await sessionLog.save();

    const isCompleted = (durationSeconds > 0 && currentPosition >= durationSeconds * 0.9);
    const progressPercent = durationSeconds > 0 ? Math.min(100, Math.round((currentPosition / durationSeconds) * 100)) : 0;

    if (playlistId) {
      await WatchHistory.findOneAndUpdate(
        { userId: req.user.id, playlistId, videoId },
        {
          $set: {
            watchedSeconds: Math.round(currentPosition),
            durationSeconds: Math.round(durationSeconds),
            progressPercent,
            lastWatchedAt: new Date(),
            ...(isCompleted ? { completed: true, completedAt: new Date() } : {}),
          },
          $inc: { watchCount: 1 },
        },
        { upsert: true, new: true }
      );
    }

    if (isCompleted) {
      await Video.updateMany(
        { userId: req.user.id, $or: [{ _id: mongoose.Types.ObjectId.isValid(videoId) ? videoId : null }, { youtubeVideoId: videoId }] },
        { $set: { completed: true, completedAt: new Date() } }
      );
    }

    let streak = await Streak.findOne({ userId: req.user.id });
    if (!streak) {
      streak = new Streak({ userId: req.user.id, currentStreak: 1, lastActiveDate: dateKey });
      await streak.save();
    } else {
      const lastActive = streak.lastActiveDate;
      if (lastActive !== dateKey) {
        const lastDate = new Date(lastActive || 0);
        const currentDate = new Date(dateKey);
        const diffDays = Math.round((currentDate - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          streak.currentStreak += 1;
        } else if (diffDays > 1) {
          streak.currentStreak = 1;
        }
        streak.lastActiveDate = dateKey;
        await streak.save();
      }
    }

    res.json({
      success: true,
      recordedSeconds: inc,
      isCompleted,
      progressPercent,
    });
  } catch (err) {
    console.error('Watch heartbeat error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/watch/stats', authMiddleware, async (req, res) => {
  try {
    const todayKey = new Date().toISOString().split('T')[0];

    const todaySessions = await StudySession.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id), dateKey: todayKey } },
      { $group: { _id: null, totalSeconds: { $sum: '$durationSeconds' } } },
    ]);
    const todaySeconds = todaySessions[0]?.totalSeconds || 0;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyBreakdown = await StudySession.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id), createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$dateKey', totalSeconds: { $sum: '$durationSeconds' } } },
      { $sort: { _id: 1 } },
    ]);

    const allTimeSessions = await StudySession.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: null, totalSeconds: { $sum: '$durationSeconds' } } },
    ]);
    const allTimeSeconds = allTimeSessions[0]?.totalSeconds || 0;

    const completedVideosCount = await Video.countDocuments({ userId: req.user.id, completed: true });

    const lastWatched = await WatchHistory.findOne({ userId: req.user.id })
      .sort({ lastWatchedAt: -1 })
      .lean();

    res.json({
      todaySeconds,
      allTimeSeconds,
      weeklyBreakdown,
      completedVideosCount,
      lastWatched,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Auth Routes ─────────────────────
app.post('/api/auth/signup', async (req, res) => {
  try {
    const limitSetting = await Settings.findOne({ key: 'max_users' });
    if (limitSetting && limitSetting.value) {
      const userCount = await User.countDocuments();
      if (userCount >= parseInt(limitSetting.value)) {
        return res.status(403).json({ error: 'Registration limit reached. Please contact admin.' });
      }
    }

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
      user: { id: user._id, name, email, role, status: user.status, category: user.category || null },
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

    if (user.status === 'blocked')
      return res.status(403).json({ error: 'Your account has been blocked. Contact admin.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).json({ error: 'Invalid credentials' });

    user.isOnline = true;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email, role: user.role, status: user.status, category: user.category || null, features: user.features, isOnline: user.isOnline },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { name, email, avatar } = req.body;
    let user = await User.findOne({ email });

    if (!user) {
      const limitSetting = await Settings.findOne({ key: 'max_users' });
      if (limitSetting && limitSetting.value) {
        const userCount = await User.countDocuments();
        if (userCount >= parseInt(limitSetting.value)) {
          return res.status(403).json({ error: 'Registration limit reached. Please contact admin.' });
        }
      }
      
      // Auto-signup
      const hashedPassword = await bcrypt.hash(email + process.env.JWT_SECRET, 10); // Dummy pass for google users
      const role = email === 'admin@studyflow.com' ? 'admin' : 'user';
      user = new User({ name, email, password: hashedPassword, role, avatar });
      await user.save();
    } else if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Your account has been blocked. Contact admin.' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, category: user.category || null, avatar: user.avatar, features: user.features, isOnline: user.isOnline },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status === 'blocked') return res.status(403).json({ error: 'Account blocked' });
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        category: user.category || null,
        avatar: user.avatar,
        features: user.features,
        isOnline: user.isOnline
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ── Global Settings ─────────────────
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Settings.find();
    const config = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { settings } = req.body; // e.g. { theme: 'theme-lavender' }
    for (const [key, value] of Object.entries(settings)) {
      await Settings.findOneAndUpdate({ key }, { value }, { upsert: true });
    }
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Setting max users securely
app.post('/api/admin/settings/max-users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { maxUsers } = req.body;
    await Settings.findOneAndUpdate({ key: 'max_users' }, { value: maxUsers.toString() }, { upsert: true });
    res.json({ message: 'Max Users limit updated successfully' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});


// ── Profile Routes ─────────────────────
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const videos = await Video.find({ userId: req.user.id });
    const streak = await Streak.findOne({ userId: req.user.id });
    const courses = await Course.find({ userId: req.user.id });

    const completedVideos = videos.filter(v => v.completed);
    const totalWatchTime = completedVideos.reduce((acc, v) => acc + (v.duration || 0), 0);
    const completedCourses = courses.filter(c => c.isCompleted);

    res.json({
      user,
      stats: {
        totalVideos: videos.length,
        completedVideos: completedVideos.length,
        totalCourses: courses.length,
        completedCoursesCount: completedCourses.length,
        totalWatchTime,
        currentStreak: streak?.currentStreak || 0,
        lastActiveDate: streak?.lastActiveDate || null,
        completionRate: videos.length > 0 ? Math.round((completedVideos.length / videos.length) * 100) : 0,
      },
      completedCourses: completedCourses.map(c => ({
        _id: c._id,
        name: c.name,
        completedAt: c.completedAt
      })),
      recentActivity: completedVideos
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
        .slice(0, 10)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/profile', authMiddleware, async (req, res) => {
  try {
    const { name, bio, avatar, category } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (avatar !== undefined) updates.avatar = avatar;
    if (category !== undefined) {
      const validCategories = ['government-exams', 'iit-neet', 'skills', 'other'];
      if (category && !validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid learning category' });
      }
      updates.category = category;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    ).select('-password');

    res.json({
      user: updatedUser,
      ...updatedUser.toObject(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Course Routes ─────────────────────
app.get('/api/courses', authMiddleware, async (req, res) => {
  const courses = await Course.find({ userId: req.user.id, isPendingDelete: { $ne: true } });
  res.json(courses);
});

app.post('/api/courses', authMiddleware, async (req, res) => {
  try {
    const existing = await Course.findOne({ name: req.body.name, userId: req.user.id });
    if (existing) return res.status(400).json({ error: 'Course already exists' });

    const course = new Course({ name: req.body.name, userId: req.user.id });
    await course.save();
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/courses/:id', authMiddleware, async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, userId: req.user.id });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    // Soft-delete: hide from user immediately, queue for admin approval
    await Course.updateOne({ _id: course._id }, { $set: { isPendingDelete: true } });

    const user = await User.findById(req.user.id).select('name');
    await DeleteRequest.create({
      userId: req.user.id,
      userName: user?.name || 'Unknown',
      itemId: String(course._id),
      itemType: 'course',
      itemName: course.name,
    });

    res.json({ message: 'Delete request submitted. Awaiting admin approval.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Video Routes ─────────────────────
app.get('/api/videos', authMiddleware, async (req, res) => {
  // Exclude soft-deleted videos from user view
  const videos = await Video.find({ userId: req.user.id, isPendingDelete: { $ne: true } }).sort({ order: 1, createdAt: 1 });
  res.json(videos);
});

// Temporary Migration Endpoint — extracts youtubeVideoId from existing link fields
app.get('/api/migrate-videos', async (req, res) => {
  try {
    const extractId = (url) => {
      if (!url) return null;
      const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
      return m ? m[1] : null;
    };

    // Only touch documents that are missing youtubeVideoId
    const videos = await Video.find({
      $or: [{ youtubeVideoId: { $exists: false } }, { youtubeVideoId: '' }]
    }).lean();

    let updated = 0;
    for (const video of videos) {
      const ytId = extractId(video.link);
      if (ytId) {
        await Video.updateOne({ _id: video._id }, { $set: { youtubeVideoId: ytId } });
        updated++;
      }
    }
    console.log(`[MIGRATE] Done — updated ${updated} videos.`);
    res.json({ success: true, updated });
  } catch (err) {
    console.error('[MIGRATE] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/videos', authMiddleware, async (req, res) => {
  try {
    // Get max order for this user+course to maintain sequence
    const lastVideo = await Video.findOne({ userId: req.user.id, course: req.body.course })
      .sort({ order: -1 });
    const nextOrder = lastVideo ? (lastVideo.order || 0) + 1 : 1;

    // Helper to extract ID
    const extractVideoId = (url) => {
      if (!url) return null;
      const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
      return match ? match[1] : null;
    };

    const payload = { ...req.body };
    if (!payload.youtubeVideoId && payload.link) {
      payload.youtubeVideoId = extractVideoId(payload.link);
    }

    const video = new Video({
      ...payload,
      userId: req.user.id,
      order: req.body.order !== undefined ? req.body.order : nextOrder,
    });
    await video.save();
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/videos/:id', authMiddleware, async (req, res) => {
  try {
    // Helper to extract ID
    const extractVideoId = (url) => {
      if (!url) return null;
      const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
      return match ? match[1] : null;
    };

    const payload = { ...req.body };
    if (!payload.youtubeVideoId && payload.link) {
      payload.youtubeVideoId = extractVideoId(payload.link);
    }

    const video = await Video.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      payload,
      { new: true }
    );
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/videos/:id', authMiddleware, async (req, res) => {
  try {
    const video = await Video.findOne({ _id: req.params.id, userId: req.user.id });
    if (!video) return res.status(404).json({ error: 'Video not found' });

    // Soft-delete: hide from user immediately, queue for admin approval
    await Video.updateOne({ _id: video._id }, { $set: { isPendingDelete: true } });

    const user = await User.findById(req.user.id).select('name');
    await DeleteRequest.create({
      userId: req.user.id,
      userName: user?.name || 'Unknown',
      itemId: String(video._id),
      itemType: 'video',
      itemName: video.title,
    });

    res.json({ message: 'Delete request submitted. Awaiting admin approval.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk reorder videos (for drag-and-drop sequence)
app.put('/api/videos/reorder', authMiddleware, async (req, res) => {
  try {
    const { orders } = req.body; // [{ id, order }]
    const ops = orders.map(({ id, order }) =>
      Video.findOneAndUpdate({ _id: id, userId: req.user.id }, { order })
    );
    await Promise.all(ops);
    res.json({ message: 'Reordered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

app.post('/api/streak/update', authMiddleware, async (req, res) => {
  try {
    let streak = await Streak.findOne({ userId: req.user.id });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!streak) {
      streak = new Streak({ userId: req.user.id, currentStreak: 1, lastActiveDate: today });
    } else {
      const last = streak.lastActiveDate ? new Date(streak.lastActiveDate) : null;
      if (last) {
        last.setHours(0, 0, 0, 0);
        const diff = (today - last) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          streak.currentStreak += 1;
        } else if (diff > 1) {
          streak.currentStreak = 1;
        }
        // diff === 0 means same day, no change
      } else {
        streak.currentStreak = 1;
      }
      streak.lastActiveDate = today;
    }

    await streak.save();
    res.json(streak);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Leaderboard ─────────────────────
app.get('/api/leaderboard', authMiddleware, async (req, res) => {
  try {
    const { timeframe = 'all' } = req.query; // 'weekly', 'monthly', 'all'
    let dateFilter = {};
    const now = Date.now();

    if (timeframe === 'weekly') {
      dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
    } else if (timeframe === 'monthly') {
      dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
    }

    // 1. Aggregate verified study time from StudySession
    const watchAgg = await StudySession.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$userId', totalWatchTime: { $sum: '$durationSeconds' } } },
      { $sort: { totalWatchTime: -1 } }
    ]);

    const verifiedWatchMap = new Map();
    watchAgg.forEach(item => {
      verifiedWatchMap.set(item._id.toString(), item.totalWatchTime);
    });

    // 2. Fetch all active users
    const allUsers = await User.find({ status: 'active' }).select('name email avatar role createdAt').lean();

    // 3. Map user stats
    const leaderboard = await Promise.all(allUsers.map(async (u) => {
      const uId = u._id.toString();
      let verifiedTime = verifiedWatchMap.get(uId) || 0;

      // Fallback for all-time if no StudySession yet: compute from completed videos duration
      if (timeframe === 'all' && verifiedTime === 0) {
        const legacyVideos = await Video.find({ userId: u._id, completed: true }).select('duration').lean();
        verifiedTime = legacyVideos.reduce((acc, v) => acc + (v.duration || 0), 0);
      }

      const completedCount = await Video.countDocuments({ userId: u._id, completed: true });
      const streakDoc = await Streak.findOne({ userId: u._id }).lean();

      return {
        _id: u._id,
        name: u.name,
        email: u.email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp1 + '*'.repeat(gp2.length)),
        avatar: u.avatar || '',
        totalWatchTime: verifiedTime,
        completedVideos: completedCount,
        currentStreak: streakDoc?.currentStreak || 0,
        joinedAt: u.createdAt,
      };
    }));

    // 4. Sort descending
    leaderboard.sort((a, b) => {
      if (b.totalWatchTime !== a.totalWatchTime) {
        return b.totalWatchTime - a.totalWatchTime;
      }
      return b.completedVideos - a.completedVideos;
    });

    // 5. Assign ranks
    leaderboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    const currentUserId = req.user.id.toString();
    const currentUserEntry = leaderboard.find(e => e._id.toString() === currentUserId);
    const currentUserRank = currentUserEntry ? currentUserEntry.rank : leaderboard.length + 1;

    res.json({
      timeframe,
      rankings: leaderboard.slice(0, 50),
      currentUserRank,
      currentUserStats: currentUserEntry || null,
      totalParticipants: leaderboard.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Bug Report ─────────────────────
app.post('/api/bug-report', authMiddleware, async (req, res) => {
  try {
    const { title, description, severity, steps, browser } = req.body;
    const user = await User.findById(req.user.id).select('name email');

    const report = new BugReport({
      userId: req.user.id,
      title,
      description,
      severity,
      steps,
      browser,
    });
    await report.save();

    // Notify user that bug is pending
    await Notification.create({
      userId: req.user.id,
      title: 'Bug Report Received',
      body: `Your bug report "${title}" has been received and is currently pending. We'll notify you once it's resolved.`
    });

    // Try to send email via nodemailer if configured
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        await transporter.sendMail({
          from: `"Course Buddy Bug Report" <${process.env.EMAIL_USER}>`,
          to: 'abhitiwariaj@gmail.com',
          subject: `🐛 [${severity?.toUpperCase() || 'BUG'}] ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <div style="background: linear-gradient(135deg, #f97316, #fb923c); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h1 style="color: white; margin: 0; font-size: 22px;">🐛 Bug Report</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Course Buddy Platform</p>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 10px; font-weight: bold; color: #64748b; width: 140px;">Reported By:</td><td style="padding: 10px;">${user.name} (${user.email})</td></tr>
                <tr style="background: #f8fafc;"><td style="padding: 10px; font-weight: bold; color: #64748b;">Severity:</td><td style="padding: 10px;"><span style="background: ${severity === 'critical' ? '#fee2e2' : severity === 'high' ? '#fef3c7' : '#f0fdf4'}; color: ${severity === 'critical' ? '#dc2626' : severity === 'high' ? '#d97706' : '#16a34a'}; padding: 3px 10px; border-radius: 20px; font-weight: bold; font-size: 13px;">${severity?.toUpperCase() || 'MEDIUM'}</span></td></tr>
                <tr><td style="padding: 10px; font-weight: bold; color: #64748b;">Title:</td><td style="padding: 10px; font-weight: bold;">${title}</td></tr>
                <tr style="background: #f8fafc;"><td style="padding: 10px; font-weight: bold; color: #64748b;">Browser:</td><td style="padding: 10px;">${browser || 'Not specified'}</td></tr>
                <tr><td style="padding: 10px; font-weight: bold; color: #64748b;">Reported At:</td><td style="padding: 10px;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td></tr>
              </table>
              <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px;">
                <h3 style="color: #1e293b; margin-top: 0;">Description:</h3>
                <p style="color: #475569; line-height: 1.6;">${description}</p>
              </div>
              ${steps ? `<div style="margin-top: 15px; padding: 15px; background: #fff7ed; border-radius: 8px; border-left: 4px solid #f97316;">
                <h3 style="color: #1e293b; margin-top: 0;">Steps to Reproduce:</h3>
                <p style="color: #475569; line-height: 1.6; white-space: pre-wrap;">${steps}</p>
              </div>` : ''}
            </div>
          `,
        });
      }
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr.message);
      // Don't fail the request if email fails
    }

    res.json({ message: 'Bug report submitted successfully! Thank you for your feedback.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Thoughts of the Day (Replaced Community) ─────────────────────
app.get('/api/thoughts', authMiddleware, async (req, res) => {
  try {
    const thoughts = await Thought.find({ isPendingDelete: { $ne: true } }).sort({ createdAt: -1 }).limit(50);
    res.json(thoughts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/thoughts', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Check if posted within last 24 hours
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    
    const recentThought = await Thought.findOne({ 
      user_id: req.user.id,
      createdAt: { $gt: yesterday }
    });
    
    if (recentThought) return res.status(403).json({ error: 'You can only post 1 thought per 24 hours.' });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const thought = new Thought({
      user_id: req.user.id,
      username: user.name,
      avatar: user.avatar,
      content: req.body.content,
      expiresAt
    });
    await thought.save();
    res.json(thought);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/thoughts/:id', authMiddleware, async (req, res) => {
  try {
    const thought = await Thought.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { content: req.body.content },
      { new: true }
    );
    if (!thought) return res.status(403).json({ error: 'Not authorized or thought not found' });
    res.json(thought);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/thoughts/:id', authMiddleware, async (req, res) => {
  try {
    const thought = await Thought.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!thought) return res.status(403).json({ error: 'Not authorized or thought not found' });

    // Soft delete
    await Thought.updateOne({ _id: thought._id }, { $set: { isPendingDelete: true } });

    const user = await User.findById(req.user.id).select('name');
    await DeleteRequest.create({
      userId: req.user.id,
      userName: user?.name || 'Unknown',
      itemId: String(thought._id),
      itemType: 'thought',
      itemName: 'Thought ending in: ' + thought.content.slice(-20),
    });

    res.json({ message: 'Delete request submitted. Awaiting admin approval.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/thoughts/:id/like', authMiddleware, async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.id);
    if (!thought) return res.status(404).json({ error: 'Thought not found' });

    const alreadyLiked = thought.liked_by.includes(req.user.id);

    if (alreadyLiked) {
      thought.liked_by = thought.liked_by.filter(id => id.toString() !== req.user.id.toString());
      thought.likes_count -= 1;
    } else {
      thought.liked_by.push(req.user.id);
      thought.likes_count += 1;
    }

    await thought.save();
    res.json(thought);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Playlists ─────────────────────
app.get('/api/admin/playlists', authMiddleware, async (req, res) => {
  try {
    // Only fetch playlists NOT hidden by this user
    const playlists = await PlaylistSuggestion.find({
      hidden_by_users: { $ne: req.user.id }
    }).sort({ createdAt: -1 });
    res.json(playlists);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/playlists', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, thumbnail, playlist_url, category } = req.body;
    const playlist = new PlaylistSuggestion({ title, thumbnail, playlist_url, category });
    await playlist.save();
    res.json(playlist);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Hide a suggested playlist for a user
app.post('/api/admin/playlists/:id/hide', authMiddleware, async (req, res) => {
  try {
    await PlaylistSuggestion.findByIdAndUpdate(req.params.id, {
      $addToSet: { hidden_by_users: req.user.id }
    });
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Notifications (FCM) ─────────────────────
app.post('/api/profile/fcm-token', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    await User.findByIdAndUpdate(req.user.id, { fcmToken: token });
    res.json({ message: "Token updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/profile/fcm-token', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { fcmToken: null });
    res.json({ message: "Notifications disabled" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    // Do not fetch notifications that are marked as read (deleted dynamically from UI perspective)
    const notifs = await Notification.find({ userId: req.user.id, isRead: false }).sort({ createdAt: -1 });
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Support both PUT natively and the specifically requested PATCH format
app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/notifications/read/:id', authMiddleware, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/push', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, body, userIds } = req.body; // userIds is array of specific IDs or empty for all
    let tokens = [];

    if (userIds && userIds.length > 0) {
      const users = await User.find({ _id: { $in: userIds }, fcmToken: { $ne: null } });
      tokens = users.map(u => u.fcmToken);
    } else {
      const users = await User.find({ fcmToken: { $ne: null } });
      tokens = users.map(u => u.fcmToken);
    }

    let targetUsers = [];
    if (userIds && userIds.length > 0) {
      targetUsers = await User.find({ _id: { $in: userIds } });
    } else {
      targetUsers = await User.find({ role: 'user' });
    }

    const notifs = targetUsers.map(u => ({ userId: u._id, title, body }));
    if (notifs.length > 0) {
      await Notification.insertMany(notifs);
    }

    if (tokens.length === 0) return res.status(400).json({ error: "No users have notifications enabled." });

    const message = {
      notification: { title, body },
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Automatically clean up old/invalid tokens from the database!
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      // Delete bad tokens blindly from all users
      if (failedTokens.length > 0) {
        await User.updateMany(
          { fcmToken: { $in: failedTokens } },
          { $set: { fcmToken: null } }
        );
      }
    }

    res.json({ message: `Push sent! ✅ Delivered to ${response.successCount} users. (Cleaned up ${response.failureCount} old/inactive devices)` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Routes ─────────────────────
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const allUsers = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });

    const usersWithStats = await Promise.all(allUsers.map(async (u) => {
      const totalVideos = await Video.countDocuments({ userId: u._id });
      const completedVideos = await Video.countDocuments({ userId: u._id, completed: true });
      const videos = await Video.find({ userId: u._id, completed: true });
      const totalWatchTime = videos.reduce((acc, v) => acc + (v.duration || 0), 0);
      const streak = await Streak.findOne({ userId: u._id });
      return {
        ...u.toObject(),
        totalVideos,
        completedVideos,
        totalWatchTime,
        currentStreak: streak?.currentStreak || 0,
      };
    }));

    res.json(usersWithStats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const u = await User.findById(req.params.id).select('-password');
    if (!u) return res.status(404).json({ error: 'User not found' });

    const videos = await Video.find({ userId: req.params.id }).sort({ createdAt: -1 });
    const courses = await Course.find({ userId: req.params.id });
    const streak = await Streak.findOne({ userId: req.params.id });

    const completedVideos = videos.filter(v => v.completed);
    const totalWatchTime = completedVideos.reduce((acc, v) => acc + (v.duration || 0), 0);

    res.json({
      user: u,
      videos,
      courses,
      stats: {
        totalVideos: videos.length,
        completedVideos: completedVideos.length,
        totalCourses: courses.length,
        totalWatchTime,
        currentStreak: streak?.currentStreak || 0,
        lastActiveDate: streak?.lastActiveDate,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/users/:id/block', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: 'User not found' });

    u.status = u.status === 'blocked' ? 'active' : 'blocked';
    await u.save();

    res.json({ message: `User ${u.status}`, user: u });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Video.deleteMany({ userId: req.params.id });
    await Course.deleteMany({ userId: req.params.id });
    await Streak.findOneAndDelete({ userId: req.params.id }).catch(() => { });
    res.json({ message: 'User and all data deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.put('/api/admin/users/:id/features', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log(`[ADMIN] Updating features for user ${req.params.id}:`, req.body.features);
    const u = await User.findByIdAndUpdate(req.params.id, { features: req.body.features }, { new: true });
    console.log(`[DATABASE] Permissions saved successfully for ${u.email}`);
    res.json(u);
  } catch (err) {
    console.error(`[ERROR] Permission update failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});


app.put('/api/admin/users/:id/approval', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { approvalStatus } = req.body;
    console.log(`[ADMIN] Setting approval status for ${req.params.id} to ${approvalStatus}`);
    const u = await User.findByIdAndUpdate(
      req.params.id, 
      { approvalStatus, approvalTimestamp: new Date() }, 
      { new: true }
    );
    console.log(`[DATABASE] Approval updated for ${u.email}`);
    res.json(u);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/users/:id/access-level', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { accessLevel } = req.body;
    console.log(`[ADMIN] Setting access level for ${req.params.id} to ${accessLevel}`);
    const u = await User.findByIdAndUpdate(req.params.id, { accessLevel }, { new: true });
    res.json(u);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/bug-reports', authMiddleware, adminMiddleware, async (req, res) => {

  try {

    const reports = await BugReport.find().populate('userId', 'name email').sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/bug-reports/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const report = await BugReport.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('userId', 'name email');
    
    if (report) {
       await Notification.create({
         userId: report.userId._id,
         title: 'Bug Report Update',
         body: `Your bug report "${report.title}" is now marked as ${status}.`
       });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/bug-reports/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await BugReport.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/leaderboard', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const allUsers = await User.find({ role: 'user' }).select('-password');

    const leaderboard = await Promise.all(allUsers.map(async (u) => {
      const videos = await Video.find({ userId: u._id, completed: true });
      const streak = await Streak.findOne({ userId: u._id });
      const totalWatchTime = videos.reduce((acc, v) => acc + (v.duration || 0), 0);
      const courses = await Course.countDocuments({ userId: u._id });
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        status: u.status,
        avatar: u.avatar,
        isOnline: u.isOnline,
        totalWatchTime,
        completedVideos: videos.length,
        totalCourses: courses,
        currentStreak: streak?.currentStreak || 0,
        joinedAt: u.createdAt,
      };
    }));

    leaderboard.sort((a, b) => b.totalWatchTime - a.totalWatchTime);
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Course Creator Routes ─────────────────────

/**
 * GET /api/admin/youtube/playlist?url=...
 * Fetches all video details from a YouTube playlist via the Data API v3.
 * Requires YOUTUBE_API_KEY in .env
 */
app.get('/api/admin/youtube/playlist', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Playlist URL required' });

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'YOUTUBE_API_KEY is not configured on the server.' });

    // Extract playlist ID from various URL formats
    let playlistId = null;
    try {
      const u = new URL(url);
      playlistId = u.searchParams.get('list');
      if (!playlistId && url.startsWith('PL')) playlistId = url.trim(); // raw ID
    } catch {
      playlistId = url.trim(); // treat as raw playlist ID
    }
    if (!playlistId) return res.status(400).json({ error: 'Could not extract playlist ID from URL' });

    // Helper: parse ISO 8601 duration → total seconds
    const parseDuration = (iso) => {
      if (!iso) return 0;
      const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) return 0;
      const [, h = 0, m = 0, s = 0] = match;
      return Number(h) * 3600 + Number(m) * 60 + Number(s);
    };

    // Step 1: Get playlist metadata + all item videoIds (paginated)
    let videos = [];
    let nextPageToken = '';
    let playlistTitle = '';

    do {
      const listRes = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
        params: {
          part: 'snippet,contentDetails',
          playlistId,
          maxResults: 50,
          pageToken: nextPageToken || undefined,
          key: apiKey,
        }
      });
      const data = listRes.data;
      console.log("[DEBUG] YouTube Playlist Response (Items Count):", data.items?.length);
      if (data.items?.[0]) {
        console.log("[DEBUG] Sample Item resourceId:", data.items[0].snippet?.resourceId?.videoId || data.items[0].contentDetails?.videoId);
      }

      if (!playlistTitle && data.items?.[0]) {
        // We'll get the real playlist title later from the playlists endpoint, 
        // but as a fallback we could use the channelTitle or just leave it empty.
        playlistTitle = data.items[0].snippet?.playlistId || '';
      }
      nextPageToken = data.nextPageToken || '';

      for (const item of data.items || []) {
        const videoId = item.snippet?.resourceId?.videoId || item.contentDetails?.videoId;
        const snippet = item.snippet;
        if (!videoId || snippet?.title === 'Deleted video' || snippet?.title === 'Private video') continue;
        videos.push({
          videoId,
          title: snippet.title,
          description: snippet.description?.slice(0, 200) || '',
          thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
          position: snippet.position !== undefined ? Number(snippet.position) : videos.length,
          publishedAt: snippet.publishedAt,
        });
      }
    } while (nextPageToken);

    // Step 2: Batch fetch durations from videos endpoint (max 50 per request)
    const BATCH = 50;
    for (let i = 0; i < videos.length; i += BATCH) {
      const ids = videos.slice(i, i + BATCH).map(v => v.videoId).join(',');
      const detailRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: { part: 'contentDetails,snippet', id: ids, key: apiKey }
      });
      for (const item of detailRes.data.items || []) {
        const vid = videos.find(v => v.videoId === item.id);
        if (vid) {
          vid.duration      = parseDuration(item.contentDetails?.duration);
          vid.channelTitle  = item.snippet?.channelTitle || '';
          // Use the best available thumbnail
          vid.thumbnail     = item.snippet?.thumbnails?.maxres?.url
                           || item.snippet?.thumbnails?.high?.url
                           || vid.thumbnail;
        }
      }
    }

    // Step 3: Get playlist name from the first video's snippet or a separate API call
    const plRes = await axios.get('https://www.googleapis.com/youtube/v3/playlists', {
      params: { part: 'snippet', id: playlistId, key: apiKey }
    });
    const playlistName = plRes.data.items?.[0]?.snippet?.title || 'Imported Playlist';

    res.json({ 
      playlistId, 
      playlistName, 
      videos: videos.sort((a, b) => (a.position || 0) - (b.position || 0)) 
    });
  } catch (err) {
    console.error('YouTube API error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

/**
 * POST /api/admin/courses/assign
 * Assigns a pre-fetched YouTube playlist as a Course + Videos to one or more users.
 * Body: { userIds: string[], courseName: string, videos: [{title, link, thumbnail, duration, platform}] }
 */
app.post('/api/admin/courses/assign', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userIds, courseName, videos, category, subcategory } = req.body;
    if (!userIds?.length || !courseName || !videos?.length) {
      return res.status(400).json({ error: 'userIds, courseName, and videos are required' });
    }

    const results = [];
    for (const uid of userIds) {
      const user = await User.findById(uid);
      if (!user) { results.push({ uid, status: 'not found' }); continue; }

      // Create course for user (or reuse if same name exists)
      let course = await Course.findOne({ userId: uid, name: courseName });
      if (!course) {
        course = await Course.create({
          userId: uid,
          name: courseName,
          category: category || 'skills',
          subcategory: subcategory || ''
        });
      } else if (category && (!course.category || course.category === 'other')) {
        course.category = category;
        if (subcategory) course.subcategory = subcategory;
        await course.save();
      }

      // Bulk insert videos (skip duplicates by link)
      const existingLinks = new Set(
        (await Video.find({ userId: uid, course: courseName }).select('link').lean()).map(v => v.link)
      );
      // Get current max order for this user and course
      const lastVideo = await Video.findOne({ userId: uid, course: courseName }).sort({ order: -1 });
      let startOrder = lastVideo ? (lastVideo.order || 0) + 1 : 1;

      const newVideos = videos
        .filter(v => !existingLinks.has(v.link))
        .map((v, idx) => ({
          userId: uid,
          course: courseName,
          title: v.title,
          link: v.link,
          youtubeVideoId: v.youtubeVideoId,
          playlistId: v.playlistId,
          platform: v.platform || 'YouTube',
          duration: v.duration || 0,
          thumbnail: v.thumbnail || '',
          tag: v.tag || '',
          order: startOrder + idx,
          position: v.position !== undefined ? v.position : (startOrder + idx),
        }));

      if (newVideos.length) {
        const saved = await Video.insertMany(newVideos);
        console.log("[DEBUG] Saved Video count:", saved.length);
        if (saved.length > 0) {
          console.log("[DEBUG] Sample Saved Video:", { _id: saved[0]._id, youtubeVideoId: saved[0].youtubeVideoId, title: saved[0].title });
        }
      }

      // Notify user
      await Notification.create({
        userId: uid,
        title: '📚 New Course Assigned!',
        body: `Admin assigned you a new course: "${courseName}" with ${newVideos.length} video(s).`,
        icon: 'info',
      });

      results.push({ uid, name: user.name, videosAdded: newVideos.length, status: 'ok' });
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/courses/assigned
 * Lists all courses assigned by admin (courses that appear across multiple users with same name).
 */
app.get('/api/admin/courses/assigned', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const pipeline = [
      { $group: { _id: '$name', userCount: { $sum: 1 }, latestAt: { $max: '$createdAt' } } },
      { $sort: { latestAt: -1 } },
      { $limit: 50 }
    ];
    const courses = await Course.aggregate(pipeline);
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Course Delete ─────────────────────

/**
 * DELETE /api/admin/course/:courseId
 * Cascading delete: removes the Course and all its Videos.
 */
app.delete('/api/admin/course/:courseId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const delVideos = await Video.deleteMany({ userId: course.userId, course: course.name });
    await Course.findByIdAndDelete(req.params.courseId);

    res.json({ message: 'Course and all related videos deleted', videosDeleted: delVideos.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/admin/courses/by-name/:name
 * Soft-delete all courses and videos matching the name across ALL users.
 */
app.delete('/api/admin/courses/by-name/:name', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    
    // Soft delete courses
    const courseRes = await Course.updateMany(
      { name: name },
      { $set: { isPendingDelete: true } }
    );
    
    // Soft delete videos
    const videoRes = await Video.updateMany(
      { course: name },
      { $set: { isPendingDelete: true } }
    );

    res.json({ 
      message: `Course "${name}" soft-deleted for all users.`,
      coursesAffected: courseRes.modifiedCount,
      videosAffected: videoRes.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Delete Requests ─────────────────────

/** GET /api/admin/delete-requests — list all pending delete requests */
app.get('/api/admin/delete-requests', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const requests = await DeleteRequest.find({ status: 'pending' }).sort({ requestedAt: -1 }).limit(100);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/admin/delete-requests/:id/approve — permanently delete the item */
app.post('/api/admin/delete-requests/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const request = await DeleteRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    if (request.itemType === 'video') {
      await Video.findByIdAndDelete(request.itemId);
    } else if (request.itemType === 'course') {
      const course = await Course.findById(request.itemId);
      if (course) {
        await Video.deleteMany({ userId: course.userId, course: course.name });
        await Course.findByIdAndDelete(request.itemId);
      }
    } else if (request.itemType === 'thought') {
      const Thought = (await import('./models/Thought.js')).default;
      await Thought.findByIdAndDelete(request.itemId);
    }

    request.status = 'approved';
    request.resolvedAt = new Date();
    await request.save();

    // Notify user
    await Notification.create({
      userId: request.userId,
      title: '✅ Delete Approved',
      body: `Your delete request for "${request.itemName}" has been approved.`,
      icon: 'success',
    });

    res.json({ message: 'Delete approved and item removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/admin/delete-requests/:id/reject — restore visibility */
app.post('/api/admin/delete-requests/:id/reject', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const request = await DeleteRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    if (request.itemType === 'video') {
      await Video.updateOne({ _id: request.itemId }, { $set: { isPendingDelete: false } });
    } else if (request.itemType === 'course') {
      await Course.updateOne({ _id: request.itemId }, { $set: { isPendingDelete: false } });
    }

    request.status = 'rejected';
    request.resolvedAt = new Date();
    await request.save();

    // Notify user
    await Notification.create({
      userId: request.userId,
      title: '❌ Delete Rejected',
      body: `Your delete request for "${request.itemName}" was rejected. The item has been restored.`,
      icon: 'warning',
    });

    res.json({ message: 'Delete request rejected. Item restored.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/videos/:id/check-completion — auto-mark course complete when all videos done */
app.post('/api/videos/:id/check-completion', authMiddleware, async (req, res) => {
  try {
    const video = await Video.findOne({ _id: req.params.id, userId: req.user.id });
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const allVideos = await Video.find({ userId: req.user.id, course: video.course, isPendingDelete: { $ne: true } });
    const allDone = allVideos.length > 0 && allVideos.every(v => v.completed);

    if (allDone) {
      await Course.updateOne(
        { userId: req.user.id, name: video.course },
        { $set: { isCompleted: true, completedAt: new Date() } }
      );
      return res.json({ courseCompleted: true, courseName: video.course });
    }
    res.json({ courseCompleted: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Helper to parse YouTube ISO 8601 duration (e.g. PT1H2M10S) to total seconds
function parseISO8601Duration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  return (hours * 3600) + (minutes * 60) + seconds;
}

// ── Admin Playlist Management ─────────────────────

/** GET /api/admin/playlists — list all imported playlists */
app.get('/api/admin/playlists', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const playlists = await Playlist.find().sort({ createdAt: -1 });
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/admin/playlists/import — import a playlist and its videos */
app.post('/api/admin/playlists/import', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { playlistUrl, courseName, category, subcategory } = req.body;
    if (!playlistUrl || !courseName) return res.status(400).json({ error: 'URL and Course Name are required' });

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'YOUTUBE_API_KEY missing' });

    // Extract ID
    let playlistId = playlistUrl;
    if (playlistUrl.includes('list=')) {
      playlistId = new URL(playlistUrl).searchParams.get('list');
    }
    if (!playlistId) return res.status(400).json({ error: 'Invalid playlist URL' });

    // 1. Fetch Playlist Info
    const plRes = await axios.get('https://www.googleapis.com/youtube/v3/playlists', {
      params: { part: 'snippet,contentDetails', id: playlistId, key: apiKey }
    });
    const plData = plRes.data.items?.[0];
    if (!plData) return res.status(404).json({ error: 'Playlist not found on YouTube' });

    // 2. Fetch All Videos (with pagination)
    let videos = [];
    let nextPageToken = '';
    do {
      const itemsRes = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
        params: { 
          part: 'snippet,contentDetails', 
          maxResults: 50, 
          playlistId, 
          pageToken: nextPageToken || undefined,
          key: apiKey 
        }
      });
      const data = itemsRes.data;
      nextPageToken = data.nextPageToken || '';

      const currentBatchVideoIds = (data.items || []).map(i => i.contentDetails.videoId);
      
      // Fetch durations for this batch
      let durationMap = {};
      if (currentBatchVideoIds.length > 0) {
        const vidRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
          params: { part: 'contentDetails', id: currentBatchVideoIds.join(','), key: apiKey }
        });
        for (const v of vidRes.data.items || []) {
          durationMap[v.id] = parseISO8601Duration(v.contentDetails.duration);
        }
      }

      const batchVideos = (data.items || []).map((item) => ({
        videoId: item.contentDetails.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        duration: durationMap[item.contentDetails.videoId] || 0,
        position: item.snippet.position !== undefined ? Number(item.snippet.position) : videos.length,
        channelTitle: item.snippet.videoOwnerChannelTitle,
        publishedAt: item.snippet.publishedAt,
      }));
      
      videos = [...videos, ...batchVideos];
    } while (nextPageToken);

    videos.sort((a, b) => (a.position || 0) - (b.position || 0));

    // Find or create course
    let course = await Course.findOne({ name: courseName });
    if (!course) {
      course = await Course.create({
        name: courseName,
        userId: req.user.id,
        category: category || 'skills',
        subcategory: subcategory || ''
      });
    } else if (category) {
      course.category = category;
      if (subcategory) course.subcategory = subcategory;
      await course.save();
    }

    // Create or Update Playlist doc
    const playlist = await Playlist.findOneAndUpdate(
      { playlistId },
      {
        courseId: course._id,
        courseName: course.name,
        category: category || 'skills',
        subcategory: subcategory || '',
        playlistUrl: `https://www.youtube.com/playlist?list=${playlistId}`,
        title: plData.snippet.title,
        description: plData.snippet.description,
        thumbnail: plData.snippet.thumbnails?.medium?.url,
        channelTitle: plData.snippet.channelTitle,
        videoCount: videos.length,
        totalDuration: videos.reduce((acc, v) => acc + (v.duration || 0), 0),
        videos,
        lastFetchedAt: new Date(),
        createdBy: req.user.id,
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Playlist imported successfully', playlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/admin/playlists/:id/refresh — refresh videos from YouTube preserving exact playlist order */
app.post('/api/admin/playlists/:id/refresh', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const playlist = await Playlist.findOne({ playlistId: req.params.id });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'YOUTUBE_API_KEY missing' });

    let videos = [];
    let nextPageToken = '';

    do {
      const itemsRes = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
        params: {
          part: 'snippet,contentDetails',
          maxResults: 50,
          playlistId: playlist.playlistId,
          pageToken: nextPageToken || undefined,
          key: apiKey
        }
      });
      const data = itemsRes.data;
      nextPageToken = data.nextPageToken || '';

      const currentBatchVideoIds = (data.items || []).map(i => i.contentDetails?.videoId).filter(Boolean);

      let durationMap = {};
      if (currentBatchVideoIds.length > 0) {
        const vidRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
          params: { part: 'contentDetails', id: currentBatchVideoIds.join(','), key: apiKey }
        });
        for (const v of vidRes.data.items || []) {
          durationMap[v.id] = parseISO8601Duration(v.contentDetails?.duration);
        }
      }

      for (const item of data.items || []) {
        const vidId = item.contentDetails?.videoId;
        if (!vidId || item.snippet?.title === 'Deleted video' || item.snippet?.title === 'Private video') continue;
        videos.push({
          videoId: vidId,
          title: item.snippet?.title || '',
          description: item.snippet?.description || '',
          thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
          duration: durationMap[vidId] || 0,
          position: item.snippet?.position !== undefined ? Number(item.snippet.position) : videos.length,
          channelTitle: item.snippet?.videoOwnerChannelTitle || '',
          publishedAt: item.snippet?.publishedAt,
        });
      }
    } while (nextPageToken);

    videos.sort((a, b) => (a.position || 0) - (b.position || 0));

    playlist.videos = videos;
    playlist.videoCount = videos.length;
    playlist.totalDuration = videos.reduce((acc, v) => acc + (v.duration || 0), 0);
    playlist.lastFetchedAt = new Date();
    await playlist.save();

    res.json({ message: 'Playlist refreshed with exact sequence preserved', playlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/admin/playlists/:id — delete playlist */
app.delete('/api/admin/playlists/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Playlist.findOneAndDelete({ playlistId: req.params.id });
    res.json({ message: 'Playlist deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/admin/playlists/:id/assign — assign to users */
app.post('/api/admin/playlists/:id/assign', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userIds } = req.body;
    const playlist = await Playlist.findOneAndUpdate(
      { playlistId: req.params.id },
      { $set: { assignedTo: userIds } },
      { new: true }
    );
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── YouTube Playlist Search ─────────────────────

/**
 * GET /api/admin/youtube/search-playlists?q=keyword
 * Search YouTube for playlists (not videos) using Data API v3.
 */
app.get('/api/admin/youtube/search-playlists', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter q is required' });

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'YOUTUBE_API_KEY is not configured on the server.' });

    const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        type: 'playlist',
        maxResults: 10,
        q,
        key: apiKey,
      }
    });

    const playlistIds = (searchRes.data.items || []).map(i => i.id.playlistId).join(',');
    
    // Fetch extra detail (video count) for the found playlists
    let detailMap = {};
    if (playlistIds) {
      const detailRes = await axios.get('https://www.googleapis.com/youtube/v3/playlists', {
        params: { part: 'snippet,contentDetails', id: playlistIds, key: apiKey }
      });
      for (const item of detailRes.data.items || []) {
        detailMap[item.id] = item.contentDetails?.itemCount || 0;
      }
    }

    const playlists = (searchRes.data.items || []).map(item => ({
      id: item.id.playlistId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
      channelTitle: item.snippet.channelTitle,
      videoCount: detailMap[item.id.playlistId] || 0,
      url: `https://www.youtube.com/playlist?list=${item.id.playlistId}`,
    }));

    res.json({ playlists });
  } catch (err) {
    console.error('YouTube search error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// ── User Progress Routes ─────────────────────

app.post('/api/progress/save', authMiddleware, async (req, res) => {
  try {
    let { courseId, lastVideoId, watchedVideoId, watchPosition } = req.body;

    // Resolve courseId if it's a name
    if (courseId && !mongoose.Types.ObjectId.isValid(courseId)) {
      const course = await Course.findOne({ userId: req.user.id, name: courseId });
      if (course) courseId = course._id;
      else return res.status(404).json({ error: 'Course not found by name' });
    }

    if (!courseId) return res.status(400).json({ error: 'Course ID is required' });

    let progress = await UserProgress.findOne({ userId: req.user.id, courseId });
    if (!progress) {
      progress = new UserProgress({ userId: req.user.id, courseId });
    }

    if (lastVideoId && mongoose.Types.ObjectId.isValid(lastVideoId)) progress.lastVideoId = lastVideoId;
    if (watchPosition !== undefined) progress.watchPosition = watchPosition;
    
    if (watchedVideoId && mongoose.Types.ObjectId.isValid(watchedVideoId)) {
      if (!progress.watchedVideos.map(String).includes(String(watchedVideoId))) {
        progress.watchedVideos.push(watchedVideoId);
      }
    }

    // Compute progress percent
    // Find the course name to filter videos
    const courseDoc = await Course.findById(courseId);
    if (courseDoc) {
      const totalVideos = await Video.countDocuments({ userId: req.user.id, course: courseDoc.name });
      if (totalVideos > 0) {
        progress.progressPercent = Math.round((progress.watchedVideos.length / totalVideos) * 100);
      }
    }

    await progress.save();
    res.json(progress);
  } catch (err) {
    console.error("[PROGRESS SAVE] Error:", err.message);
    res.status(500).json({ error: 'Failed to save progress. Continuing playback.' });
  }
});

app.get('/api/progress/:courseId', authMiddleware, async (req, res) => {
  try {
    let cid = req.params.courseId;

    if (cid && !mongoose.Types.ObjectId.isValid(cid)) {
      const course = await Course.findOne({ userId: req.user.id, name: cid });
      if (course) cid = course._id;
      else return res.json({}); // Not found is not an error here
    }

    const progress = await UserProgress.findOne({ userId: req.user.id, courseId: cid });
    res.json(progress || {});
  } catch (err) {
    console.error("[PROGRESS GET] Error:", err.message);
    res.json({}); // Fail gracefully
  }
});

// ── Quiz Administration Routes ─────────────────────

// Quiz permission middleware
const quizPermission = (minRole) => (req, res, next) => {
  const roleOrder = ['normal', 'question_creator', 'quiz_manager', 'super_admin'];
  const userRole = req.user.quizRole || 'normal';
  if (req.user.role === 'admin') return next(); // platform admin can do anything
  if (roleOrder.indexOf(userRole) >= roleOrder.indexOf(minRole)) return next();
  return res.status(403).json({ error: `Requires ${minRole} role or higher` });
};

app.get('/api/admin/quiz/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 }).lean();
    // Attach question count
    const result = await Promise.all(quizzes.map(async q => ({
      ...q,
      questionCount: await Question.countDocuments({ quizId: q._id }),
      attemptCount: await QuizAttempt.countDocuments({ quizId: q._id }),
    })));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/quiz/create', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, description, courseId, duration, isRetryAllowed } = req.body;
    const quiz = await Quiz.create({
      title,
      description,
      courseId: courseId || null,
      duration: duration || 30,
      isRetryAllowed: isRetryAllowed || false,
      createdBy: req.user.id,
    });
    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/quiz/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    const questions = await Question.find({ quizId: quiz._id }).sort({ order: 1 });
    res.json({ quiz, questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/quiz/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/quiz/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Question.deleteMany({ quizId: req.params.id });
    await QuizAttempt.deleteMany({ quizId: req.params.id });
    await Quiz.findByIdAndDelete(req.params.id);
    res.json({ message: 'Quiz and all related data deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/quiz/:id/start', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { status: 'active', startTime: new Date() },
      { new: true }
    );
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ message: 'Quiz started', quiz });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/quiz/:id/stop', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { status: 'ended', endTime: new Date() },
      { new: true }
    );
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ message: 'Quiz ended', quiz });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Question Management ─────────────────────

app.get('/api/admin/quiz/:quizId/questions', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const questions = await Question.find({ quizId: req.params.quizId }).sort({ order: 1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/quiz/:quizId/questions', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const count = await Question.countDocuments({ quizId: req.params.quizId });
    const question = await Question.create({
      ...req.body,
      quizId: req.params.quizId,
      order: req.body.order !== undefined ? req.body.order : count + 1,
    });
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/questions/:qId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.qId, req.body, { new: true });
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/questions/:qId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.qId);
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Quiz Permission Management ─────────────────────

app.put('/api/admin/users/:id/quiz-role', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { quizRole } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { quizRole }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Quiz Assignment ─────────────────────
app.post('/api/admin/quiz/assign', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId, quizId } = req.body;
    let assignment = await QuizAssignment.findOne({ userId, quizId });
    if (!assignment) {
      assignment = new QuizAssignment({
        userId,
        quizId,
        assignedBy: req.user.id
      });
      await assignment.save();
    } else {
      assignment.accessStatus = 'active';
      await assignment.save();
    }
    res.json(assignment);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/quiz/revoke', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId, quizId } = req.body;
    await QuizAssignment.findOneAndUpdate({ userId, quizId }, { accessStatus: 'revoked' });
    res.json({ message: 'Revoked' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/quiz/:quizId/assignments', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const assignments = await QuizAssignment.find({ quizId: req.params.quizId }).populate('userId', 'name email');
    res.json(assignments);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// User getting their active assigned quizzes (and any globally active quizzes)
app.get('/api/quiz/assigned', authMiddleware, async (req, res) => {
  try {
    // 1. Get explicitly assigned quizzes
    const assignments = await QuizAssignment.find({ userId: req.user.id, accessStatus: 'active' }).populate('quizId');
    const assignedQuizzes = assignments.map(a => a.quizId).filter(q => q !== null);

    // 2. Get globally active quizzes (that aren't already in the assigned list)
    const activeQuizzes = await Quiz.find({ 
      status: 'active', 
      _id: { $nin: assignedQuizzes.map(q => q._id) } 
    }).lean();

    // Combine them
    const allQuizzes = [...assignedQuizzes, ...activeQuizzes];
    res.json(allQuizzes);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ── User Quiz Routes ─────────────────────

app.get('/api/quiz/active', authMiddleware, async (req, res) => {
  try {
    // Priority 1: Explicitly assigned active quiz
    const assignments = await QuizAssignment.find({ userId: req.user.id, accessStatus: 'active' }).populate('quizId');
    let activeQuiz = assignments.map(a => a.quizId).find(q => q && q.status === 'active');
    
    // Priority 2: Any globally active quiz if no specific assignment is active
    if (!activeQuiz) {
      activeQuiz = await Quiz.findOne({ status: 'active' }).sort({ createdAt: -1 });
    }

    if (!activeQuiz) return res.json(null);

    const questionCount = await Question.countDocuments({ quizId: activeQuiz._id });
    res.json({ ...activeQuiz.toObject ? activeQuiz.toObject() : activeQuiz, questionCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/quiz/:id', authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Don't expose correct answers to user
    const questions = await Question.find({ quizId: quiz._id })
      .sort({ order: 1 })
      .select('-correctAnswer -explanation');

    // Check if user already attempted (and retry not allowed)
    const attempt = await QuizAttempt.findOne({ userId: req.user.id, quizId: quiz._id });
    
    res.json({ quiz, questions, alreadyAttempted: !!attempt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quiz/:id/submit', authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Check re-attempt
    const existingAttempt = await QuizAttempt.findOne({ userId: req.user.id, quizId: quiz._id });
    if (existingAttempt && !quiz.isRetryAllowed) {
      return res.status(400).json({ error: 'You have already submitted this quiz.' });
    }

    const { answers, timeTaken } = req.body; // answers: [{ questionId, selected }]
    const questions = await Question.find({ quizId: quiz._id });

    // Grade answers
    let score = 0;
    const gradedAnswers = answers.map(a => {
      const q = questions.find(q => String(q._id) === String(a.questionId));
      const isCorrect = q && a.selected === q.correctAnswer;
      if (isCorrect) score++;
      return { questionId: a.questionId, selected: a.selected };
    });

    // Ranking formula: (score * 10) + speed bonus (1 point per 10s under quiz duration)
    const quizDurationSecs = quiz.duration * 60;
    const speedBonus = Math.max(0, Math.floor((quizDurationSecs - (timeTaken || 0)) / 10));
    const rankScore = (score * 10) + speedBonus;

    // Save attempt (upsert if retry allowed)
    const attemptData = {
      userId: req.user.id,
      quizId: quiz._id,
      answers: gradedAnswers,
      score,
      totalQuestions: questions.length,
      timeTaken: timeTaken || 0,
      rankScore,
      submittedAt: new Date(),
    };

    let attempt;
    if (existingAttempt) {
      attempt = await QuizAttempt.findByIdAndUpdate(existingAttempt._id, attemptData, { new: true });
    } else {
      attempt = await QuizAttempt.create(attemptData);
    }

    // Compute rank across all attempts
    const allAttempts = await QuizAttempt.find({ quizId: quiz._id }).sort({ rankScore: -1 });
    const rank = allAttempts.findIndex(a => String(a.userId) === String(req.user.id)) + 1;
    await QuizAttempt.findByIdAndUpdate(attempt._id, { rank });
    attempt.rank = rank;

    res.json({ message: 'Quiz submitted!', score, total: questions.length, rankScore, rank, timeTaken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/quiz/:id/results', authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const attempt = await QuizAttempt.findOne({ userId: req.user.id, quizId: quiz._id });
    if (!attempt) return res.status(404).json({ error: 'No attempt found. Please submit the quiz first.' });

    // Get questions with correct answers for review
    const questions = await Question.find({ quizId: quiz._id }).sort({ order: 1 });

    res.json({ quiz, attempt, questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/quiz/:id/leaderboard', authMiddleware, async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ quizId: req.params.id })
      .sort({ rankScore: -1 })
      .populate('userId', 'name avatar email');

    const leaderboard = attempts.map((a, idx) => ({
      rank: idx + 1,
      userId: a.userId?._id,
      name: a.userId?.name || 'Unknown',
      avatar: a.userId?.avatar || '',
      score: a.score,
      totalQuestions: a.totalQuestions,
      timeTaken: a.timeTaken,
      rankScore: a.rankScore,
    }));

    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI Quiz Generation (Groq Cloud) ───────────────────

// Log the key on startup (masked) for quick diagnosis
console.log('[AI QUIZ] GROQ_API_KEY present:', !!process.env.GROQ_API_KEY,
  '| starts with:', (process.env.GROQ_API_KEY || '').slice(0, 8) + '...');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Single Groq call — returns raw text string.
 * Does NOT use response_format:json_object because llama3-8b-8192
 * can return a 400 error when that header is set with certain prompts.
 */
async function callGroqRaw(prompt) {
  console.log('[AI QUIZ] → Sending request to Groq (llama3-8b-8192)...');
  const completion = await groq.chat.completions.create({
    model: 'llama3-8b-8192',
    temperature: 0.3,
    max_tokens: 8192,
    top_p: 1,
    stream: false,
    messages: [
      {
        role: 'system',
        content: 'Return ONLY valid JSON. No markdown. No explanation. No code fences. No extra text before or after the JSON.'
      },
      { role: 'user', content: prompt }
    ]
  });
  const aiText = completion.choices?.[0]?.message?.content || '';
  console.log('[AI QUIZ] RAW GROQ RESPONSE (first 500 chars):', aiText.slice(0, 500));
  return aiText;
}

/**
 * Extract a valid `{ questions: [...] }` object from raw AI text.
 * Tries multiple strategies to be maximally robust.
 */
function extractQuestionsFromText(aiText, topicFallback) {
  // Strategy 1: strip code fences and parse directly
  const cleaned = aiText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replace(/\r/g, '')
    .trim();

  console.log('[AI QUIZ] CLEANED TEXT (first 300 chars):', cleaned.slice(0, 300));

  // Helper: try to extract questions array from a parsed object or raw array
  const resolveArray = (parsed) => {
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
    // Some models wrap in { data: { questions: [] } }
    if (parsed && parsed.data && Array.isArray(parsed.data.questions)) return parsed.data.questions;
    return null;
  };

  // Attempt 1: direct parse
  try {
    const parsed = JSON.parse(cleaned);
    const arr = resolveArray(parsed);
    if (arr) {
      console.log(`[AI QUIZ] ✅ Attempt 1 (direct parse) succeeded. ${arr.length} items.`);
      return arr;
    }
  } catch (e1) {
    console.warn('[AI QUIZ] Attempt 1 (direct parse) failed:', e1.message);
  }

  // Attempt 2: find first { … } block
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const parsed = JSON.parse(objMatch[0]);
      const arr = resolveArray(parsed);
      if (arr) {
        console.log(`[AI QUIZ] ✅ Attempt 2 (object regex) succeeded. ${arr.length} items.`);
        return arr;
      }
    } catch (e2) {
      console.warn('[AI QUIZ] Attempt 2 (object regex) failed:', e2.message);
    }
  }

  // Attempt 3: find first [ … ] array
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const arr = JSON.parse(arrMatch[0]);
      if (Array.isArray(arr)) {
        console.log(`[AI QUIZ] ✅ Attempt 3 (array regex) succeeded. ${arr.length} items.`);
        return arr;
      }
    } catch (e3) {
      console.warn('[AI QUIZ] Attempt 3 (array regex) failed:', e3.message);
    }
  }

  console.error('[AI QUIZ] ❌ All JSON extraction strategies failed. Cleaned text:', cleaned.slice(0, 400));
  return null;
}

/**
 * Validate a single raw question object from the AI.
 * Returns a sanitized object or null if invalid.
 */
function validateQuestion(q, fallbackTopic, fallbackDifficulty) {
  if (!q || typeof q !== 'object') return null;
  if (!q.question || typeof q.question !== 'string') return null;

  // Options: must be array of exactly 4 non-empty strings
  if (!Array.isArray(q.options) || q.options.length !== 4) return null;
  const opts = q.options.map(o => String(o).trim()).filter(o => o.length > 0);
  if (opts.length !== 4) return null;

  // correctAnswer: must be non-empty and match one of the options (case-insensitive)
  if (!q.correctAnswer || typeof q.correctAnswer !== 'string') return null;
  const correctRaw = String(q.correctAnswer).trim();
  const matchedOpt = opts.find(o => o.toLowerCase() === correctRaw.toLowerCase());
  if (!matchedOpt) {
    console.warn(`[AI QUIZ] Rejected — correctAnswer "${correctRaw}" not in options:`, opts);
    return null;
  }

  const difficulty = ['easy', 'medium', 'hard'].includes(q.difficulty)
    ? q.difficulty
    : (fallbackDifficulty !== 'mixed' ? fallbackDifficulty : 'medium');

  return {
    question:      String(q.question).trim(),
    options:       opts,
    correctAnswer: matchedOpt,
    difficulty,
    topic:         String(q.topic || fallbackTopic).trim(),
  };
}

// ── Bulk create quiz with questions (used by AI Quiz Generator) ──────────────
app.post('/api/quiz', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, description, questions, duration, isRetryAllowed, status } = req.body;
    console.log(`[QUIZ BULK] Creating quiz: "${title}" with ${questions?.length || 0} questions`);

    if (!title) return res.status(400).json({ error: 'Quiz title is required.' });

    const quiz = await Quiz.create({
      title,
      description: description || '',
      duration: duration || 30,
      isRetryAllowed: isRetryAllowed || false,
      status: status || 'draft',
      createdBy: req.user.id,
    });

    if (questions && Array.isArray(questions) && questions.length > 0) {
      const questionDocs = questions.map((q, idx) => ({
        quizId: quiz._id,
        questionText: q.question || q.questionText,
        option1:      q.options ? q.options[0] : q.option1,
        option2:      q.options ? q.options[1] : q.option2,
        option3:      q.options ? q.options[2] : q.option3,
        option4:      q.options ? q.options[3] : q.option4,
        correctAnswer: q.correctAnswer,
        order: idx + 1,
      }));
      await Question.insertMany(questionDocs);
      console.log(`[QUIZ BULK] ✅ Inserted ${questionDocs.length} questions for quiz ${quiz._id}`);
    }

    res.status(201).json(quiz);
  } catch (err) {
    console.error('[QUIZ BULK] ❌ Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/ai-quiz/generate ─────────────────────────────────────────
app.post('/api/admin/ai-quiz/generate', authMiddleware, adminMiddleware, async (req, res) => {
  const startTime = Date.now();

  try {
    // ── 1. Validate request body
    console.log('[AI QUIZ] REQ BODY:', JSON.stringify(req.body));
    const { topic, courseName, difficulty = 'mixed', count = 10 } = req.body;

    if (!topic || !String(topic).trim()) {
      return res.status(400).json({ success: false, error: 'Topic is required.' });
    }

    // ── 2. Validate API key
    const apiKey = process.env.GROQ_API_KEY;
    console.log('[AI QUIZ] GROQ_API_KEY present:', !!apiKey, '| placeholder:', apiKey === 'YOUR_GROQ_API_KEY_HERE');

    if (!apiKey || apiKey === 'YOUR_GROQ_API_KEY_HERE' || !apiKey.trim()) {
      return res.status(500).json({
        success: false,
        error: 'Groq API key not configured. Add GROQ_API_KEY to backend/.env',
        hint: 'Get your key at https://console.groq.com/keys'
      });
    }

    // ── 3. Build prompt
    const topicClean  = String(topic).trim();
    const countNum    = Math.min(Math.max(Number(count) || 10, 1), 30);
    const courseCtx   = courseName ? ` for the course "${String(courseName).trim()}"` : '';
    const diffRule    = difficulty === 'mixed'
      ? 'Vary difficulty: roughly 1/3 easy, 1/3 medium, 1/3 hard.'
      : `All questions must use difficulty "${difficulty}".`;

    const prompt = `Generate ${countNum} multiple-choice quiz questions on the topic "${topicClean}"${courseCtx}.

Return ONLY a valid JSON object — no markdown, no explanation, no code fences.

Exact output format:
{"questions":[{"question":"...","options":["A","B","C","D"],"correctAnswer":"A","difficulty":"easy","topic":"${topicClean}"}]}

Rules:
- Each question has exactly 4 options.
- correctAnswer is the EXACT TEXT of one of the 4 options.
- difficulty is one of: easy, medium, hard.
- ${diffRule}
- Questions must be accurate, unique, and educational.
- Return exactly ${countNum} questions.`;

    console.log('[AI QUIZ] Prompt (first 400 chars):', prompt.slice(0, 400));

    // ── 4. Call Groq with retry (max 2 retries)
    const MAX_RETRIES = 2;
    let aiText = '';
    let usedModel = 'llama3-8b-8192';
    let lastGroqError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        console.log(`[AI QUIZ] Groq call attempt ${attempt}/${MAX_RETRIES + 1}...`);
        aiText = await callGroqRaw(prompt);
        if (aiText && aiText.trim().length > 10) break; // got a real response
        console.warn(`[AI QUIZ] Attempt ${attempt} returned empty/short response, retrying...`);
        lastGroqError = new Error('Groq returned empty response');
      } catch (groqErr) {
        lastGroqError = groqErr;
        console.error(`[AI QUIZ] Groq attempt ${attempt} threw:`, groqErr.message);
        if (attempt > MAX_RETRIES) throw groqErr; // propagate on last attempt
        // Wait 1s before retry
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!aiText || aiText.trim().length < 10) {
      throw lastGroqError || new Error('Groq returned empty response after all retries.');
    }

    // ── 5. Extract & parse questions array
    const rawArray = extractQuestionsFromText(aiText, topicClean);

    if (!rawArray) {
      return res.status(500).json({
        success: false,
        error: 'AI returned invalid JSON. Please try again.',
        hint: 'Try a simpler or more specific topic.',
        rawPreview: aiText.slice(0, 300),
      });
    }

    if (!Array.isArray(rawArray) || rawArray.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'AI returned no questions. Please try again.',
      });
    }

    console.log(`[AI QUIZ] PARSED JSON: ${rawArray.length} raw items received.`);

    // ── 6. Validate each question strictly
    const validated = [];
    for (let i = 0; i < rawArray.length; i++) {
      const q = rawArray[i];
      const clean = validateQuestion(q, topicClean, difficulty);
      if (clean) {
        validated.push(clean);
      } else {
        console.warn(`[AI QUIZ] Question ${i + 1} failed validation:`, JSON.stringify(q).slice(0, 150));
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[AI QUIZ] ✅ Done. ${validated.length}/${rawArray.length} valid | ${elapsed}ms | model: ${usedModel}`);

    if (validated.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'AI generated 0 valid questions. Try a different topic or lower the count.',
      });
    }

    // ── 7. Success
    return res.json({
      success: true,
      questions:  validated,
      topic:      topicClean,
      courseName: courseName || '',
      difficulty,
      count:      validated.length,
      model:      usedModel,
      elapsed,
    });

  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`[AI QUIZ] FULL ERROR after ${elapsed}ms:`, err);

    let friendlyError = 'Quiz generation failed. Please try again.';
    const status = err.status || err.statusCode || 500;

    if (status === 401 || status === 403) {
      friendlyError = 'Groq API key is invalid or unauthorized. Check GROQ_API_KEY in backend/.env';
    } else if (status === 429) {
      friendlyError = 'Groq rate limit hit. Wait a moment then try again.';
    } else if (status === 400) {
      friendlyError = 'Groq rejected the request (400). Try a simpler topic or reduce question count.';
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      friendlyError = 'Cannot reach Groq API. Check your server network connection.';
    }

    return res.status(500).json({
      success: false,
      error:   friendlyError,
      message: err.message,
      stack:   process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });
  }
});

// ── START SERVER ─────────────────────

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT} with Socket.IO enabled`);
    });
  })
  .catch(err => console.log("❌ DB Error:", err));


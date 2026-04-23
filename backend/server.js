import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import axios from 'axios';

// Models
import User from './models/User.js';
import Video from './models/Video.js';
import Course from './models/Course.js';
import Streak from './models/Streak.js';
import Discussion from './models/Discussion.js';
import Settings from './models/Settings.js';
import BugReport from './models/BugReport.js';
import Notification from './models/Notification.js';
import admin from 'firebase-admin';

// Telegram Models
import TelegramSession from './models/TelegramSession.js';
import TelegramVideo from './models/TelegramVideo.js';

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
      user: { id: user._id, name, email, role, status: user.status },
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
      user: { id: user._id, name: user.name, email, role: user.role, status: user.status, features: user.features, isOnline: user.isOnline },
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
      user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, avatar: user.avatar, features: user.features, isOnline: user.isOnline },
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

    res.json({
      user,
      stats: {
        totalVideos: videos.length,
        completedVideos: completedVideos.length,
        totalCourses: courses.length,
        totalWatchTime,
        currentStreak: streak?.currentStreak || 0,
        lastActiveDate: streak?.lastActiveDate || null,
      },
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
    const { name, bio, avatar } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (avatar !== undefined) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    ).select('-password');

    res.json(user);
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
    await Course.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Video Routes ─────────────────────
app.get('/api/videos', authMiddleware, async (req, res) => {
  const videos = await Video.find({ userId: req.user.id }).sort({ order: 1, createdAt: 1 });
  res.json(videos);
});

app.post('/api/videos', authMiddleware, async (req, res) => {
  try {
    // Get max order for this user+course to maintain sequence
    const lastVideo = await Video.findOne({ userId: req.user.id, course: req.body.course })
      .sort({ order: -1 });
    const nextOrder = lastVideo ? (lastVideo.order || 0) + 1 : 1;

    const video = new Video({
      ...req.body,
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
    const video = await Video.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
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
    await Video.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: 'Video deleted' });
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
    const allUsers = await User.find({ role: 'user', status: 'active' }).select('-password');

    const leaderboard = await Promise.all(allUsers.map(async (u) => {
      const videos = await Video.find({ userId: u._id, completed: true });
      const streak = await Streak.findOne({ userId: u._id });
      const totalWatchTime = videos.reduce((acc, v) => acc + (v.duration || 0), 0);
      const courses = await Course.countDocuments({ userId: u._id });
      return {
        _id: u._id,
        name: u.name,
        email: u.email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp1 + '*'.repeat(gp2.length)),
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

// ── Community Discussions ─────────────────────
app.get('/api/community', authMiddleware, async (req, res) => {
  try {
    const discussions = await Discussion.find().sort({ createdAt: -1 }).limit(50);
    res.json(discussions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/community', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const discussion = new Discussion({
      userId: req.user.id,
      authorName: user.name,
      authorAvatar: user.avatar,
      content: req.body.content
    });
    await discussion.save();
    res.json(discussion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/community/:id/like', authMiddleware, async (req, res) => {
  try {
    const discussion = await Discussion.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    );
    res.json(discussion);
  } catch (err) {
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
    const notifs = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
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
    const u = await User.findByIdAndUpdate(req.params.id, { features: req.body.features }, { new: true });
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

// ── Telegram Integration Routes ─────────────────────

const getPyServiceUrl = () => {
  const url = process.env.PY_SERVICE_URL;
  if (!url) {
    console.error("🔥 CRITICAL ERROR: PY_SERVICE_URL environment variable is missing.");
    return null;
  }
  return url.replace(/\/$/, ""); // remove trailing slash
};

app.post('/api/telegram/connect', authMiddleware, async (req, res) => {
  try {
    const pyUrl = getPyServiceUrl();
    if (!pyUrl) return res.status(503).json({ error: "Telegram Integration is not configured on this server.", detail: "PY_SERVICE_URL is missing." });

    const { phone } = req.body;
    const response = await axios.post(`${pyUrl}/api/auth/send_code`, {
      user_id: req.user.id.toString(),
      phone
    });
    
    res.json(response.data);
  } catch (err) {
    console.error("❌ Telegram /connect Error:", err.message);
    if (err.response) {
      console.error("   Response Data:", err.response.data);
      return res.status(err.response.status).json(err.response.data);
    }
    console.error(err.stack);
    res.status(500).json({ error: "Failed to connect to Telegram service", detail: err.message });
  }
});

app.post('/api/telegram/verify', authMiddleware, async (req, res) => {
  try {
    const pyUrl = getPyServiceUrl();
    if (!pyUrl) return res.status(503).json({ error: "Telegram Integration is not configured.", detail: "PY_SERVICE_URL is missing." });

    const { phone, phone_code_hash, code, session_string } = req.body;
    console.log("VERIFY PAYLOAD:", { phone, phone_code_hash, code, session_string });
    
    const response = await axios.post(`${pyUrl}/api/auth/verify_code`, {
      user_id: req.user.id.toString(),
      phone,
      phone_code_hash,
      code,
      session_string
    });
    console.log("VERIFY RESPONSE:", response.data);
    
    res.json(response.data);
  } catch (err) {
    console.error("❌ Telegram /verify Error:", err.message);
    if (err.response) {
      console.error("   Response Data:", err.response.data);
      return res.status(err.response.status).json(err.response.data);
    }
    console.error(err.stack);
    res.status(500).json({ error: "Failed to verify Telegram code", detail: err.message });
  }
});

app.get('/api/telegram/channels', authMiddleware, async (req, res) => {
  try {
    const pyUrl = getPyServiceUrl();
    if (!pyUrl) return res.status(503).json({ error: "Telegram Integration is not configured.", detail: "PY_SERVICE_URL is missing." });

    const response = await axios.get(`${pyUrl}/api/channels`, {
      params: { user_id: req.user.id.toString() }
    });
    res.json(response.data);
  } catch (err) {
    console.error("❌ Telegram /channels Error:", err.message);
    if (err.response) {
      console.error("   Response Data:", err.response.data);
      return res.status(err.response.status).json(err.response.data);
    }
    console.error(err.stack);
    res.status(500).json({ error: "Failed to fetch Telegram channels", detail: err.message });
  }
});

app.post('/api/telegram/sync', authMiddleware, async (req, res) => {
  try {
    const pyUrl = getPyServiceUrl();
    if (!pyUrl) return res.status(503).json({ error: "Telegram Integration is not configured.", detail: "PY_SERVICE_URL is missing." });

    const { channel_id } = req.body;
    const response = await axios.post(`${pyUrl}/api/sync`, {
      user_id: req.user.id.toString(),
      channel_id: parseInt(channel_id),
      limit: 100 // Increased from 50 to give real-time loader more beef
    });
    
    res.json(response.data);
  } catch (err) {
    console.error("❌ Telegram /sync Error:", err.message);
    if (err.response) {
      console.error("   Response Data:", err.response.data);
      return res.status(err.response.status).json(err.response.data);
    }
    console.error(err.stack);
    res.status(500).json({ error: "Failed to sync Telegram channel", detail: err.message });
  }
});

app.get('/api/telegram/sync-status', authMiddleware, async (req, res) => {
  try {
    const pyUrl = getPyServiceUrl();
    if (!pyUrl) return res.status(503).json({ error: "Telegram Integration is not configured." });

    const response = await axios.get(`${pyUrl}/api/sync/status`, {
      params: { user_id: req.user.id.toString() }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch Telegram sync status" });
  }
});

app.get('/api/telegram/status', authMiddleware, async (req, res) => {
  try {
    const pyUrl = getPyServiceUrl();
    if (!pyUrl) return res.status(503).json({ error: "Telegram Integration is not configured.", detail: "PY_SERVICE_URL is missing." });

    const response = await axios.get(`${pyUrl}/api/auth/status`, {
      params: { user_id: req.user.id.toString() }
    });
    res.json(response.data);
  } catch (err) {
    console.error("❌ Telegram /status Error:", err.message);
    res.status(500).json({ error: "Failed to fetch Telegram status" });
  }
});

app.get('/api/telegram/health', async (req, res) => {
  try {
    const pyUrl = getPyServiceUrl();
    if (!pyUrl) return res.status(503).json({ error: "Telegram Integration is not configured.", detail: "PY_SERVICE_URL is missing." });

    const response = await axios.get(`${pyUrl}/api/health`, { timeout: 5000 });
    res.json({
      configured: true,
      python_service: response.data,
      status: "Healthy"
    });
  } catch (err) {
    console.error("❌ Telegram /health Error:", err.message);
    res.status(503).json({ error: "Python service is unreachable", detail: err.message });
  }
});

app.get('/api/telegram/videos', authMiddleware, async (req, res) => {
  try {
    const videos = await TelegramVideo.find({ user_id: req.user.id.toString() }).sort({ sync_date: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Secure endpoint to stream the locally downloaded video
app.get('/api/telegram/videos/stream/:id', authMiddleware, async (req, res) => {
  try {
    const video = await TelegramVideo.findOne({ video_id: req.params.id, user_id: req.user.id.toString() });
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const videoPath = video.file_path;
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file missing on server' });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy thumbnail images
app.get('/api/telegram/thumb/:filename', async (req, res) => {
  try {
    const pyUrl = getPyServiceUrl();
    if (!pyUrl) return res.status(503).end();
    
    const response = await axios({
      method: 'get',
      url: `${pyUrl}/downloads/${req.params.filename}`,
      responseType: 'stream'
    });
    
    res.setHeader('Content-Type', 'image/jpeg');
    response.data.pipe(res);
  } catch (err) {
    res.status(404).end();
  }
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

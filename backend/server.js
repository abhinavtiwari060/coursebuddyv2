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

// Google Drive Models
import DriveFolder from './models/DriveFolder.js';
import DriveVideo from './models/DriveVideo.js';
import DriveProgress from './models/DriveProgress.js';


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

// ── Thoughts of the Day (Replaced Community) ─────────────────────
app.get('/api/thoughts', authMiddleware, async (req, res) => {
  try {
    const thoughts = await Thought.find().sort({ createdAt: -1 }).limit(50);
    res.json(thoughts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/thoughts', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const existingCount = await Thought.countDocuments({ user_id: req.user.id });
    if (existingCount >= 1) return res.status(403).json({ error: 'You have already posted a thought. Please edit or delete it first.' });

    const thought = new Thought({
      user_id: req.user.id,
      username: user.name,
      avatar: user.avatar,
      content: req.body.content
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
    const doc = await Thought.findOneAndDelete({ _id: req.params.id, user_id: req.user.id });
    if (!doc) return res.status(403).json({ error: 'Not authorized or thought not found' });
    res.json({ success: true });
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
      if (!playlistTitle && data.items?.[0]?.snippet?.channelTitle) {
        playlistTitle = data.items[0].snippet.playlistId || '';
      }
      nextPageToken = data.nextPageToken || '';

      for (const item of data.items || []) {
        const videoId = item.contentDetails?.videoId;
        const snippet = item.snippet;
        if (!videoId || snippet?.title === 'Deleted video' || snippet?.title === 'Private video') continue;
        videos.push({
          videoId,
          title: snippet.title,
          description: snippet.description?.slice(0, 200) || '',
          thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
          position: snippet.position,
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

    res.json({ playlistId, playlistName, videos: videos.sort((a, b) => a.position - b.position) });
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
    const { userIds, courseName, videos } = req.body;
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
        course = await Course.create({ userId: uid, name: courseName });
      }

      // Bulk insert videos (skip duplicates by link)
      const existingLinks = new Set(
        (await Video.find({ userId: uid, course: courseName }).select('link').lean()).map(v => v.link)
      );
      const newVideos = videos
        .filter(v => !existingLinks.has(v.link))
        .map((v, idx) => ({
          userId: uid,
          course: courseName,
          title: v.title,
          link: v.link,
          platform: v.platform || 'YouTube',
          duration: v.duration || 0,
          thumbnail: v.thumbnail || '',
          tag: v.tag || '',
          order: Date.now() + idx,
        }));

      if (newVideos.length) await Video.insertMany(newVideos);

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
    const { courseId, lastVideoId, watchedVideoId, watchPosition } = req.body;

    let progress = await UserProgress.findOne({ userId: req.user.id, courseId });
    if (!progress) {
      progress = new UserProgress({ userId: req.user.id, courseId });
    }

    if (lastVideoId) progress.lastVideoId = lastVideoId;
    if (watchPosition !== undefined) progress.watchPosition = watchPosition;
    if (watchedVideoId && !progress.watchedVideos.map(String).includes(String(watchedVideoId))) {
      progress.watchedVideos.push(watchedVideoId);
    }

    // Compute progress percent
    const totalVideos = await Video.countDocuments({ userId: req.user.id, course: { $exists: true } });
    if (totalVideos > 0) {
      progress.progressPercent = Math.round((progress.watchedVideos.length / totalVideos) * 100);
    }

    await progress.save();
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/progress/:courseId', authMiddleware, async (req, res) => {
  try {
    const progress = await UserProgress.findOne({ userId: req.user.id, courseId: req.params.courseId });
    res.json(progress || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    const user = await User.findByIdAndUpdate(req.params.id, { quizRole }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── User Quiz Routes ─────────────────────

app.get('/api/quiz/active', authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ status: 'active' }).sort({ startTime: -1 });
    if (!quiz) return res.json(null);
    const questionCount = await Question.countDocuments({ quizId: quiz._id });
    res.json({ ...quiz.toObject(), questionCount });
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

// ── Google Drive Integration ─────────────────────
import { extractDriveFolderId, syncDriveFolder } from './driveSync.js';

// Admin: Add Drive Folder
app.post('/api/admin/drive/add', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { url, name, description } = req.body;
    const folderId = extractDriveFolderId(url);
    if (!folderId) return res.status(400).json({ error: 'Invalid Google Drive Folder URL' });

    let folder = await DriveFolder.findOne({ folderId });
    if (folder) return res.status(400).json({ error: 'This folder is already registered.' });

    folder = new DriveFolder({
      folderId,
      folderName: name || 'Unnamed Course',
      description,
      folderUrl: url,
      addedBy: req.user.id
    });

    await folder.save();
    
    // Background sync
    syncDriveFolder(folder._id).catch(e => console.error("Auto-sync error:", e));

    res.json({ message: 'Drive folder added. Sync started in background.', folder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Sync Drive Folder
app.post('/api/admin/drive/sync/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const folder = await DriveFolder.findById(req.params.id);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    if (folder.syncStatus === 'syncing') return res.status(400).json({ error: 'Sync already in progress' });

    // Background sync
    syncDriveFolder(folder._id).catch(e => console.error("Manual sync error:", e));
    
    res.json({ message: 'Sync started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: List Drive Folders
app.get('/api/admin/drive/folders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const folders = await DriveFolder.find().sort({ createdAt: -1 });
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete Drive Folder
app.delete('/api/admin/drive/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const folder = await DriveFolder.findById(req.params.id);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    await DriveVideo.deleteMany({ driveFolderId: folder.folderId });
    await DriveFolder.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Folder and associated videos removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User: Stream Video (Secure Proxy)
app.get('/api/drive/stream/:fileId', authMiddleware, async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    const fileId = req.params.fileId;
    
    const response = await axios({
      method: 'get',
      url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`,
      responseType: 'stream',
      headers: {
        Range: req.headers.range // Support video seeking/partial content
      }
    });

    // Pass through headers
    res.set(response.headers);
    response.data.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Streaming failed' });
  }
});

// User: Get Structured Course List

app.get('/api/drive/courses', authMiddleware, async (req, res) => {
  try {
    const folders = await DriveFolder.find().select('folderId folderName description totalVideos lastSynced');
    
    // For each folder, we could provide some sample hierarchy if needed, 
    // but the frontend will likely fetch per-folder or we send a flat video list to reconstruct.
    // For performance, we send the root folders first.
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User: Get Videos for a Folder (Hierarchy included)
app.get('/api/drive/folders/:folderId/videos', authMiddleware, async (req, res) => {
  try {
    const videos = await DriveVideo.find({ driveFolderId: req.params.folderId })
      .sort({ driveOrder: 1 });
    
    // Fetch progress for these videos
    const fileIds = videos.map(v => v.fileId);
    const progressDocs = await DriveProgress.find({ userId: req.user.id, fileId: { $in: fileIds } });
    
    const progressMap = {};
    progressDocs.forEach(p => { progressMap[p.fileId] = p; });

    const results = videos.map(v => ({
      ...v.toObject(),
      progress: progressMap[v.fileId] || null
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User: Get Video Metadata
app.get('/api/drive/video/:fileId', authMiddleware, async (req, res) => {
  try {
    const video = await DriveVideo.findOne({ fileId: req.params.fileId });
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const progress = await DriveProgress.findOne({ userId: req.user.id, fileId: req.params.fileId });
    
    res.json({ video, progress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User: Save Progress
app.post('/api/drive/progress', authMiddleware, async (req, res) => {
  try {
    const { fileId, driveFolderId, watchPosition, completed } = req.body;
    
    const update = {
      watchPosition,
      lastWatched: new Date()
    };
    if (completed) {
      update.completed = true;
      update.completedAt = new Date();
    }

    const progress = await DriveProgress.findOneAndUpdate(
      { userId: req.user.id, fileId },
      { $set: update, $setOnInsert: { driveFolderId } },
      { upsert: true, new: true }
    );

    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
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


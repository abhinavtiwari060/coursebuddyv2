import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

// Models
import User from './models/User.js';
import Video from './models/Video.js';
import Course from './models/Course.js';
import Streak from './models/Streak.js';
import Discussion from './models/Discussion.js';
import admin from 'firebase-admin';

// Try initializing Firebase Admin (requires service account credentials in environment variable GOOGLE_APPLICATION_CREDENTIALS or passed manually)
try {
  admin.initializeApp();
  console.log("🔥 Firebase Admin Initialized");
} catch (err) {
  console.log("Firebase Admin not configured yet.");
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

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email, role: user.role, status: user.status },
    });
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
        email: u.email,
        avatar: u.avatar,
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

    if (tokens.length === 0) return res.status(400).json({ error: "No users have notifications enabled." });

    const message = {
      notification: { title, body },
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    res.json({ message: `Push sent successfully. Success: ${response.successCount}, Failed: ${response.failureCount}` });
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

// Fire base admin initialize
import admin from "firebase-admin";
import serviceAccount from "./config/serviceAccountKey.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// notificaton
const users = await User.find({ fcmToken: { $ne: null } });

const tokens = users.map(user => user.fcmToken);


// push notification Api 
app.post("/api/admin/push", async (req, res) => {
  const { title, body } = req.body;

  try {
    const users = await User.find({ fcmToken: { $ne: null } });
    const tokens = users.map(u => u.fcmToken);

    const message = {
      notification: { title, body },
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    res.json({
      success: true,
      sent: response.successCount,
      failed: response.failureCount
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Notification failed" });
  }
});


// for spacific user notification
const user = await User.findById(userId);

await admin.messaging().send({
  notification: {
    title: "Personal Message",
    body: "Hello Abhi bhai 🚀"
  },
  token: user.fcmToken
});
// expire tocken
response.responses.forEach((resp, idx) => {
  if (!resp.success) {
    console.log("Invalid token:", tokens[idx]);
  }
});
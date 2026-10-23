import axios from "axios";

// Base URL
const API_URL =
  import.meta.env.VITE_API_URL || "https://coursebuddyv2.onrender.com";

// Axios instance
const api = axios.create({
  baseURL: API_URL,
});


// Attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("studymate_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response error handler (logout on 401)
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("studymate_token");
      localStorage.removeItem("studymate_user");
      try {
        const { signOutFirebase } = await import("../utils/firebase");
        await signOutFirebase();
      } catch {
        // ignore
      }
      if (window.location.pathname !== "/login" && window.location.pathname !== "/signup") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth Service ─────────────────────────
export const authService = {
  signup: (name, email, password) =>
    api.post("/api/auth/signup", { name, email, password }).then((r) => r.data),

  login: (email, password) =>
    api.post("/api/auth/login", { email, password }).then((r) => r.data),

  googleLogin: (name, email, avatar) =>
    api.post("/api/auth/google", { name, email, avatar }).then((r) => r.data),

  me: () => api.get("/api/auth/me").then((r) => r.data),
};

// ── Profile Service ──────────────────────
export const profileService = {
  get: () => api.get("/api/profile").then((r) => r.data),
  update: (data) => api.put("/api/profile", data).then((r) => r.data),
  setFcmToken: (token) => api.post("/api/profile/fcm-token", { token }).then((r) => r.data),
  removeFcmToken: () => api.delete("/api/profile/fcm-token").then((r) => r.data),
};

// ── Video Service ────────────────────────
export const videoService = {
  getAll: () => api.get("/api/videos").then((r) => r.data),

  create: (videoData) => {
    const payload = { ...videoData };
    // Never send temporary frontend identifiers or malformed strings as document _id
    if (payload.id && !payload._id && typeof payload.id === 'string' && (payload.id.startsWith('yt_') || !/^[0-9a-fA-F]{24}$/.test(payload.id))) {
      delete payload.id;
    }
    if (payload._id && typeof payload._id === 'string' && (payload._id.startsWith('yt_') || !/^[0-9a-fA-F]{24}$/.test(payload._id))) {
      delete payload._id;
    }
    return api.post("/api/videos", payload).then((r) => r.data);
  },

  importPlaylist: (data) =>
    api.post("/api/videos/import-playlist", data).then((r) => r.data),

  update: (id, updates) =>
    api.put(`/api/videos/${id}`, updates).then((r) => r.data),

  delete: (id) =>
    api.delete(`/api/videos/${id}`).then((r) => r.data),

  markComplete: (id) =>
    api
      .put(`/api/videos/${id}`, {
        completed: true,
        completedAt: new Date().toISOString(),
      })
      .then((r) => r.data),

  checkCompletion: (id) =>
    api.post(`/api/videos/${id}/check-completion`).then((r) => r.data),

  markPending: (id) =>
    api
      .put(`/api/videos/${id}`, {
        completed: false,
        completedAt: null,
      })
      .then((r) => r.data),

  saveNotes: (id, notes) =>
    api.put(`/api/videos/${id}`, { notes }).then((r) => r.data),

  reorder: (orders) =>
    api.put("/api/videos/reorder", { orders }).then((r) => r.data),
};

// ── Course Service ───────────────────────
export const courseService = {
  getAll: (params) => api.get("/api/courses", { params }).then((r) => r.data),
  getMy: () => api.get("/api/courses/my").then((r) => r.data),
  getById: (id) => api.get(`/api/courses/${id}`).then((r) => r.data),
  create: (courseData) => {
    const payload = typeof courseData === 'string'
      ? { name: courseData.trim() }
      : { ...courseData, name: courseData.name ? courseData.name.trim() : '' };
    return api.post("/api/courses", payload).then((r) => r.data);
  },
  delete: (id) => api.delete(`/api/courses/${id}`).then((r) => r.data),
};

// ── Streak Service ───────────────────────
export const streakService = {
  get: () => api.get("/api/streak").then((r) => r.data),

  update: () =>
    api.post("/api/streak/update").then((r) => r.data),
};

// ── Leaderboard Service ──────────────────
export const leaderboardService = {
  get: (timeframe = 'all') => api.get("/api/leaderboard", { params: { timeframe } }).then((r) => r.data),
};

// ── To-Do Service ────────────────────────
export const todoService = {
  getAll: (params) => api.get("/api/todos", { params }).then((r) => r.data),
  create: (data) => api.post("/api/todos", data).then((r) => r.data),
  update: (id, data) => api.put(`/api/todos/${id}`, data).then((r) => r.data),
  toggle: (id) => api.patch(`/api/todos/${id}/toggle`).then((r) => r.data),
  delete: (id) => api.delete(`/api/todos/${id}`).then((r) => r.data),
};

// ── Watch Service (Verified Tracking) ─────
export const watchService = {
  heartbeat: (data) => api.post("/api/watch/heartbeat", data).then((r) => r.data),
  getStats: () => api.get("/api/watch/stats").then((r) => r.data),
};

// ── Chat Service ─────────────────────────
export const chatService = {
  getHistory: (room) => api.get(`/api/chat/messages/${room}`).then((r) => r.data),
  editMessage: (id, message) => api.put(`/api/chat/messages/${id}`, { message }).then((r) => r.data),
  deleteMessage: (id) => api.delete(`/api/chat/messages/${id}`).then((r) => r.data),
};

// ── Category Change Request Service ───────
export const categoryRequestService = {
  submit: (data) => api.post('/api/category-requests', data).then((r) => r.data),
  getMyRequest: () => api.get('/api/category-requests/my').then((r) => r.data),
  adminGetAll: () => api.get('/api/admin/category-requests').then((r) => r.data),
  adminApprove: (id) => api.post(`/api/admin/category-requests/${id}/approve`).then((r) => r.data),
  adminReject: (id) => api.post(`/api/admin/category-requests/${id}/reject`).then((r) => r.data),
};

// ── Bug Report Service ───────────────────
export const bugReportService = {
  submit: (data) => api.post("/api/bug-report", data).then((r) => r.data),
};

// ── Notification Service ─────────────────
export const notificationService = {
  get: () => api.get("/api/notifications").then((r) => r.data),
  markRead: (id) => api.put(`/api/notifications/${id}/read`).then((r) => r.data),
};

// ── Playlist Service ─────────────────────
export const playlistService = {
  adminGetAll: () => api.get("/api/admin/playlists").then((r) => r.data),
  importPlaylist: (data) => api.post("/api/admin/playlists/import", data).then((r) => r.data),
  refreshPlaylist: (id) => api.post(`/api/admin/playlists/${id}/refresh`).then((r) => r.data),
  deletePlaylist: (id) => api.delete(`/api/admin/playlists/${id}`).then((r) => r.data),
  deleteItem: (playlistId, videoId) => api.delete(`/api/playlists/${playlistId}/videos/${videoId}`).then((r) => r.data),
  assignUsers: (id, userIds) => api.post(`/api/admin/playlists/${id}/assign`, { userIds }).then((r) => r.data),
};

// ── Admin Service ────────────────────────
export const adminService = {
  getUsers: () => api.get("/api/admin/users").then((r) => r.data),
  getUserDetails: (id) => api.get(`/api/admin/users/${id}`).then((r) => r.data),
  deleteUser: (id) => api.delete(`/api/admin/users/${id}`).then((r) => r.data),
  toggleBlock: (id) => api.put(`/api/admin/users/${id}/block`).then((r) => r.data),
  updateFeatures: (id, features) => api.put(`/api/admin/users/${id}/features`, { features }).then((r) => r.data),
  updateApproval: (id, approvalStatus) => api.put(`/api/admin/users/${id}/approval`, { approvalStatus }).then((r) => r.data),
  updateAccessLevel: (id, accessLevel) => api.put(`/api/admin/users/${id}/access-level`, { accessLevel }).then((r) => r.data),
  getLeaderboard: () => api.get("/api/admin/leaderboard").then((r) => r.data),

  sendPush: (data) => api.post("/api/admin/push", data).then((r) => r.data),
  updateSettings: (settings) => api.post("/api/admin/settings", { settings }).then((r) => r.data),
  setMaxUsers: (maxUsers) => api.post("/api/admin/settings/max-users", { maxUsers }).then((r) => r.data),
  getPlaylists: () => api.get("/api/admin/playlists").then((r) => r.data),
  createPlaylist: (data) => api.post("/api/admin/playlists", data).then((r) => r.data),
  getBugReports: () => api.get("/api/admin/bug-reports").then(r => r.data),
  updateBugReport: (id, status) => api.put(`/api/admin/bug-reports/${id}`, { status }).then(r => r.data),
  deleteBugReport: (id) => api.delete(`/api/admin/bug-reports/${id}`).then(r => r.data),
  // Course Creator & Manager
  getCourses: () => api.get('/api/admin/courses').then(r => r.data),
  createCourse: (data) => api.post('/api/admin/courses', data).then(r => r.data),
  updateCourse: (id, data) => api.put(`/api/admin/courses/${id}`, data).then(r => r.data),
  deleteCourseById: (id) => api.delete(`/api/admin/courses/${id}`).then(r => r.data),
  getCoursePlaylists: (courseId) => api.get(`/api/admin/courses/${courseId}/playlists`).then(r => r.data),
  fetchYouTubePlaylist: (url) => api.get('/api/admin/youtube/playlist', { params: { url } }).then(r => r.data),
  searchYoutubePlaylists: (q) => api.get('/api/admin/youtube/search-playlists', { params: { q } }).then(r => r.data),
  assignCourse: (data) => api.post('/api/admin/courses/assign', data).then(r => r.data),
  getAssignedCourses: () => api.get('/api/admin/courses/assigned').then(r => r.data),
  deleteCourse: (courseId) => api.delete(`/api/admin/courses/${courseId}`).then(r => r.data),
  deleteCourseByName: (name) => api.delete(`/api/admin/courses/by-name/${encodeURIComponent(name)}`).then(r => r.data),
  getDeleteRequests: () => api.get('/api/admin/delete-requests').then(r => r.data),
  approveDeleteRequest: (id) => api.post(`/api/admin/delete-requests/${id}/approve`).then(r => r.data),
  rejectDeleteRequest: (id) => api.post(`/api/admin/delete-requests/${id}/reject`).then(r => r.data),
};

// ── Global Settings Service ──────────────
export const settingsService = {
  getSettings: () => api.get("/api/settings").then((r) => r.data),
};

// ── Quiz Service ────────────────────────
export const quizService = {
  getActive: () => api.get('/api/quiz/active').then(r => r.data),
  getQuiz: (id) => api.get(`/api/quiz/${id}`).then(r => r.data),
  submit: (id, data) => api.post(`/api/quiz/${id}/submit`, data).then(r => r.data),
  getResults: (id) => api.get(`/api/quiz/${id}/results`).then(r => r.data),
  getLeaderboard: (id) => api.get(`/api/quiz/${id}/leaderboard`).then(r => r.data),
  // Admin
  adminGetAll: () => api.get('/api/admin/quiz/all').then(r => r.data),
  adminGetOne: (id) => api.get(`/api/admin/quiz/${id}`).then(r => r.data),
  adminCreate: (data) => api.post('/api/admin/quiz/create', data).then(r => r.data),
  adminUpdate: (id, data) => api.put(`/api/admin/quiz/${id}`, data).then(r => r.data),
  adminDelete: (id) => api.delete(`/api/admin/quiz/${id}`).then(r => r.data),
  adminStart: (id) => api.post(`/api/admin/quiz/${id}/start`).then(r => r.data),
  adminStop: (id) => api.post(`/api/admin/quiz/${id}/stop`).then(r => r.data),
  adminGetQuestions: (quizId) => api.get(`/api/admin/quiz/${quizId}/questions`).then(r => r.data),
  adminAddQuestion: (quizId, data) => api.post(`/api/admin/quiz/${quizId}/questions`, data).then(r => r.data),
  adminUpdateQuestion: (qId, data) => api.put(`/api/admin/questions/${qId}`, data).then(r => r.data),
  adminDeleteQuestion: (qId) => api.delete(`/api/admin/questions/${qId}`).then(r => r.data),
  adminSetUserRole: (userId, quizRole) => api.put(`/api/admin/users/${userId}/quiz-role`, { quizRole }).then(r => r.data),
  adminAssignQuiz: (data) => api.post('/api/admin/quiz/assign', data).then(r => r.data),
  adminRevokeQuiz: (data) => api.post('/api/admin/quiz/revoke', data).then(r => r.data),
  adminGetAssignments: (quizId) => api.get(`/api/admin/quiz/${quizId}/assignments`).then(r => r.data),
  getAssignedQuizzes: () => api.get('/api/quiz/assigned').then(r => r.data),
};

// ── Progress Service ─────────────────────
export const progressService = {
  save: (data) => api.post('/api/progress/save', data).then(r => r.data),
  get: (courseId) => api.get(`/api/progress/${courseId}`).then(r => r.data),
};

// ── AI Quizer Service ────────────────────
export const aiQuizerService = {
  /** Generate MCQ questions via Groq AI */
  generate: (data) => api.post('/api/admin/ai-quiz/generate', data).then(r => r.data),
  /** Bulk-create a quiz + questions from AI output */
  saveQuiz: (data) => api.post('/api/quiz', data).then(r => r.data),
};


// Default export
export default api;
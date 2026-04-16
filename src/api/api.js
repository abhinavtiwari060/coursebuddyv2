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
    const token = localStorage.getItem("studyflow_token");
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
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("studyflow_token");
      localStorage.removeItem("studyflow_user");
      if (window.location.pathname !== "/login") {
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
};

// ── Profile Service ──────────────────────
export const profileService = {
  get: () => api.get("/api/profile").then((r) => r.data),
  update: (data) => api.put("/api/profile", data).then((r) => r.data),
};

// ── Video Service ────────────────────────
export const videoService = {
  getAll: () => api.get("/api/videos").then((r) => r.data),

  create: (videoData) =>
    api.post("/api/videos", videoData).then((r) => r.data),

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
  getAll: () => api.get("/api/courses").then((r) => r.data),

  create: (name) =>
    api.post("/api/courses", { name }).then((r) => r.data),

  delete: (id) =>
    api.delete(`/api/courses/${id}`).then((r) => r.data),
};

// ── Streak Service ───────────────────────
export const streakService = {
  get: () => api.get("/api/streak").then((r) => r.data),

  update: () =>
    api.post("/api/streak/update").then((r) => r.data),
};

// ── Leaderboard Service ──────────────────
export const leaderboardService = {
  get: () => api.get("/api/leaderboard").then((r) => r.data),
};

// ── Bug Report Service ───────────────────
export const bugReportService = {
  submit: (data) => api.post("/api/bug-report", data).then((r) => r.data),
};

// ── Community Service ────────────────────
export const communityService = {
  getDiscussions: () => api.get("/api/community").then((r) => r.data),
  postDiscussion: (content) => api.post("/api/community", { content }).then((r) => r.data),
  likeDiscussion: (id) => api.post(`/api/community/${id}/like`).then((r) => r.data),
};

// ── Admin Service ────────────────────────
export const adminService = {
  getUsers: () => api.get("/api/admin/users").then((r) => r.data),
  getUserDetails: (id) => api.get(`/api/admin/users/${id}`).then((r) => r.data),
  deleteUser: (id) => api.delete(`/api/admin/users/${id}`).then((r) => r.data),
  toggleBlock: (id) => api.put(`/api/admin/users/${id}/block`).then((r) => r.data),
  getLeaderboard: () => api.get("/api/admin/leaderboard").then((r) => r.data),
  sendPush: (data) => api.post("/api/admin/push", data).then((r) => r.data),
};

// Default export
export default api;
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "https://coursebuddyv2.onrender.com";

const api = axios.create({
  baseURL: API_URL,
});

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("studyflow_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// Attach JWT from localStorage to every request automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('studyflow_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response error handler: log out on 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('studyflow_token');
      localStorage.removeItem('studyflow_user');
      // Redirect to login without a hard reload if possible
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth Service ──────────────────────────────────────────────────────────────
export const authService = {
  /** Register a new user. Returns { token, user } */
  signup: (name, email, password) =>
    api.post('/auth/signup', { name, email, password }).then((r) => r.data),

  /** Log in an existing user. Returns { token, user } */
  login: (email, password) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
};

// ── Video Service ─────────────────────────────────────────────────────────────
export const videoService = {
  /** Fetch all videos for the authenticated user */
  getAll: () => api.get('/videos').then((r) => r.data),

  /** Create a new video entry */
  create: (videoData) => api.post('/videos', videoData).then((r) => r.data),

  /** Update a video (e.g. mark complete, save notes) */
  update: (id, updates) => api.put(`/videos/${id}`, updates).then((r) => r.data),

  /** Delete a video by its database _id */
  delete: (id) => api.delete(`/videos/${id}`).then((r) => r.data),

  /** Mark a video as completed and update its completedAt timestamp */
  markComplete: (id) =>
    api
      .put(`/videos/${id}`, { completed: true, completedAt: new Date().toISOString() })
      .then((r) => r.data),

  /** Mark a video as NOT completed */
  markPending: (id) =>
    api
      .put(`/videos/${id}`, { completed: false, completedAt: null })
      .then((r) => r.data),

  /** Save / update personal notes on a video */
  saveNotes: (id, notes) => api.put(`/videos/${id}`, { notes }).then((r) => r.data),
};

// ── Course Service ────────────────────────────────────────────────────────────
export const courseService = {
  /** Fetch all courses for the authenticated user */
  getAll: () => api.get('/courses').then((r) => r.data),

  /** Create a new course. Rejects if the name already exists for this user. */
  create: (name) => api.post('/courses', { name }).then((r) => r.data),

  /** Delete a course by its database _id */
  delete: (id) => api.delete(`/courses/${id}`).then((r) => r.data),
};

// ── Streak Service ────────────────────────────────────────────────────────────
export const streakService = {
  /** Fetch current streak info for the authenticated user */
  get: () => api.get('/streak').then((r) => r.data),

  /**
   * Record activity for today.
   * - Increments streak by 1 if the last active date was yesterday.
   * - Keeps streak the same if already active today.
   * - Resets streak to 1 if more than 1 day has passed.
   */
  update: () => api.post('/streak/update').then((r) => r.data),
};

// ── Admin Service ─────────────────────────────────────────────────────────────
export const adminService = {
  /** Fetch all non-admin users with aggregated stats (admin only) */
  getUsers: () => api.get('/admin/users').then((r) => r.data),

  /** Fetch detailed profile + videos for a single user (admin only) */
  getUserDetails: (id) => api.get(`/admin/users/${id}`).then((r) => r.data),

  /** Permanently delete a user and all their data (admin only) */
  deleteUser: (id) => api.delete(`/admin/users/${id}`).then((r) => r.data),

  /** Toggle block / unblock status for a user (admin only) */
  toggleBlock: (id) => api.put(`/admin/users/${id}/block`).then((r) => r.data),
};

// ── Default export (raw axios instance) ──────────────────────────────────────
// Components that call api.get('/...') directly still work without changes.
export default api;

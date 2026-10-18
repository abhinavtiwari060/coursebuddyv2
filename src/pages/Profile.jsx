import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../api/api';
import { formatDuration } from '../utils/helpers';
import {
  User, 
  Mail, 
  Edit3, 
  Save, 
  X, 
  Camera, 
  BookOpen, 
  CheckCircle2,
  Clock, 
  Flame, 
  Calendar, 
  LogOut, 
  ArrowLeft, 
  Bell, 
  BellOff, 
  Sparkles, 
  GraduationCap,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CATEGORY_CHOICES = [
  { id: 'government-exams', label: 'Government Exam Preparation' },
  { id: 'iit-neet', label: 'IIT / NEET Preparation' },
  { id: 'skills', label: 'Skills & Career Development' },
  { id: 'other', label: 'Other Subjects & General' },
];

export default function Profile() {
  const { user: authUser, logout, updateUserCategory, setUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', category: 'skills' });
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    if (!authUser) { navigate('/login'); return; }
    fetchProfile();
  }, [authUser]);

  const fetchProfile = async () => {
    try {
      const data = await api.get('/api/profile').then(r => r.data);
      setProfile(data);
      setForm({ 
        name: data.user.name, 
        bio: data.user.bio || '',
        category: data.user.category || 'skills',
      });
      setAvatarPreview(data.user.avatar || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/api/profile', {
        name: form.name,
        bio: form.bio,
        avatar: avatarPreview,
        category: form.category,
      }).then(r => r.data);

      const updatedUser = res.user || res;
      setProfile(prev => ({ ...prev, user: { ...prev.user, ...updatedUser } }));
      if (setUser) {
        setUser(updatedUser);
        localStorage.setItem('studymate_user', JSON.stringify(updatedUser));
      }
      setEditing(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const toggleNotifications = async () => {
    try {
      if (profile.user.fcmToken) {
        await api.delete('/api/profile/fcm-token');
        setProfile(prev => ({ ...prev, user: { ...prev.user, fcmToken: null } }));
        alert("Push notifications disabled.");
      } else {
        const { requestForToken } = await import('../utils/firebase');
        const token = await requestForToken();
        if (token) {
          await api.post('/api/profile/fcm-token', { token });
          setProfile(prev => ({ ...prev, user: { ...prev.user, fcmToken: token } }));
          alert("Push notifications enabled!");
        } else {
          alert("Permission denied or notification token generation failed.");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to toggle notifications.");
    }
  };

  const getInitials = (name = '') =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (loading || !profile) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF7ED]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 text-[#EA580C] animate-spin" />
        <p className="text-[#78716C] font-semibold text-sm">Loading student profile...</p>
      </div>
    </div>
  );

  const { user: u, stats, recentActivity, completedCourses } = profile;

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF7ED]">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="clay-btn-subtle mb-6 text-xs flex items-center gap-1.5"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        {/* Profile Card */}
        <div className="clay-card bg-white p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-[#FFF7ED] border-2 border-[#FED7AA] flex items-center justify-center overflow-hidden text-2xl font-black text-[#EA580C] shadow-sm">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={u.name} className="w-full h-full object-cover" />
                ) : (
                  getInitials(u.name)
                )}
              </div>
              {editing && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute inset-0 bg-[#431407]/60 rounded-2xl flex items-center justify-center text-white"
                  title="Upload Photo"
                >
                  <Camera size={24} />
                </button>
              )}
              <input
                type="file"
                ref={fileRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            {/* User Info & Edit Form */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              {editing ? (
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-bold text-[#431407] mb-1">Full Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="clay-input text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#431407] mb-1">
                      Primary Learning Path (Personalizes Dashboard & Chat)
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="clay-input text-sm bg-white"
                    >
                      {CATEGORY_CHOICES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#431407] mb-1">Bio / Goals</label>
                    <textarea
                      rows={2}
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      className="clay-input text-xs"
                      placeholder="Share your exam targets or technical goals..."
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="clay-btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                    >
                      <Save size={14} />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="clay-btn-subtle text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <h2 className="text-2xl font-black text-[#431407]">{u.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                      {CATEGORY_CHOICES.find((c) => c.id === u.category)?.label || 'General Track'}
                    </span>
                  </div>

                  <p className="text-xs text-[#78716C] mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                    <Mail size={13} /> {u.email}
                  </p>

                  <p className="text-xs sm:text-sm text-[#431407] mt-3 leading-relaxed">
                    {u.bio || 'No bio added yet. Add your study goals!'}
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-5">
                    <button
                      onClick={() => setEditing(true)}
                      className="clay-btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
                    >
                      <Edit3 size={14} /> Edit Profile & Learning Path
                    </button>

                    <button
                      onClick={toggleNotifications}
                      className="clay-btn-subtle text-xs flex items-center gap-1.5"
                    >
                      {u.fcmToken ? <BellOff size={14} /> : <Bell size={14} />}
                      {u.fcmToken ? 'Disable Notifications' : 'Enable Notifications'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Learning Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="clay-card bg-white p-4">
            <span className="text-xs text-[#78716C] font-bold uppercase flex items-center gap-1 mb-1">
              <Clock size={13} className="text-[#EA580C]" /> Watch Time
            </span>
            <p className="text-xl font-black text-[#431407]">{formatDuration(stats.totalWatchTime || 0)}</p>
          </div>

          <div className="clay-card bg-white p-4">
            <span className="text-xs text-[#78716C] font-bold uppercase flex items-center gap-1 mb-1">
              <CheckCircle2 size={13} className="text-green-600" /> Completed
            </span>
            <p className="text-xl font-black text-[#431407]">{stats.completedVideos || 0}</p>
          </div>

          <div className="clay-card bg-white p-4">
            <span className="text-xs text-[#78716C] font-bold uppercase flex items-center gap-1 mb-1">
              <Flame size={13} className="text-[#EA580C]" /> Streak
            </span>
            <p className="text-xl font-black text-[#EA580C]">{stats.currentStreak || 0}d</p>
          </div>

          <div className="clay-card bg-white p-4">
            <span className="text-xs text-[#78716C] font-bold uppercase flex items-center gap-1 mb-1">
              <BookOpen size={13} className="text-[#C2410C]" /> Courses
            </span>
            <p className="text-xl font-black text-[#431407]">{stats.totalCourses || 0}</p>
          </div>
        </div>

        {/* Completed Courses list */}
        {completedCourses && completedCourses.length > 0 && (
          <div className="clay-card bg-white p-6 mb-8">
            <h3 className="text-base font-bold text-[#431407] mb-3">
              Completed Curricula
            </h3>
            <div className="space-y-2">
              {completedCourses.map((c) => (
                <div
                  key={c._id}
                  className="p-3 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-[#431407]">{c.name}</span>
                  <span className="text-[#78716C]">
                    Completed on {new Date(c.completedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sign Out Card */}
        <div className="clay-card bg-white p-5 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-[#431407]">Sign Out of StudyMate</h4>
            <p className="text-xs text-[#78716C]">Your progress, tasks, and watch time will remain safely saved.</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="clay-btn-secondary text-xs px-4 py-2 text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import api, { categoryRequestService } from '../api/api';
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
  ArrowLeft,
  Bell,
  BellOff,
  Sparkles,
  Lock,
  Loader2,
  AlertCircle,
  HelpCircle,
  Send,
  Compass
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CATEGORY_CHOICES = [
  { id: 'government-exams', label: 'Government Exam Preparation' },
  { id: 'iit-neet', label: 'IIT / NEET Preparation' },
  { id: 'skills', label: 'Skills & Career Development' },
  { id: 'other', label: 'Other Subjects & General' },
];

export default function Profile() {
  const { user: authUser, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const fileRef = useRef();

  // Category Request State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [myCategoryRequest, setMyCategoryRequest] = useState(null);
  const [requestedCategory, setRequestedCategory] = useState('skills');
  const [changeReason, setChangeReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');

  useEffect(() => {
    if (!authUser) {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchMyCategoryRequest();
  }, [authUser, navigate]);

  const fetchProfile = async () => {
    try {
      const data = await api.get('/api/profile').then((r) => r.data);
      setProfile(data);
      setForm({
        name: data.user.name,
        bio: data.user.bio || '',
      });
      setAvatarPreview(data.user.avatar || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCategoryRequest = async () => {
    try {
      const req = await categoryRequestService.getMyRequest();
      setMyCategoryRequest(req);
    } catch (err) {
      console.error('Failed to load category request:', err);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await api
        .put('/api/profile', {
          name: form.name,
          bio: form.bio,
          avatar: avatarPreview,
        })
        .then((r) => r.data);

      const updatedUser = res.user || res;
      setProfile((prev) => ({ ...prev, user: { ...prev.user, ...updatedUser } }));
      if (setUser) {
        setUser(updatedUser);
        localStorage.setItem('studymate_user', JSON.stringify(updatedUser));
      }
      setEditing(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitCategoryRequest = async (e) => {
    e.preventDefault();
    setRequestError('');
    setRequestSuccess('');

    if (requestedCategory === profile?.user?.category) {
      setRequestError('Please select a category different from your current assigned category.');
      return;
    }

    setSubmittingRequest(true);
    try {
      const res = await categoryRequestService.submit({
        requestedCategory,
        reason: changeReason.trim(),
      });
      setMyCategoryRequest(res.request);
      setRequestSuccess('Category change request submitted! An administrator will review your request.');
      setChangeReason('');
      setTimeout(() => {
        setShowCategoryModal(false);
        setRequestSuccess('');
      }, 2500);
    } catch (err) {
      setRequestError(err.response?.data?.error || 'Failed to submit category change request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const toggleNotifications = async () => {
    try {
      if (profile.user.fcmToken) {
        await api.delete('/api/profile/fcm-token');
        setProfile((prev) => ({ ...prev, user: { ...prev.user, fcmToken: null } }));
        alert('Push notifications disabled.');
      } else {
        const { requestForToken } = await import('../utils/firebase');
        const token = await requestForToken();
        if (token) {
          await api.post('/api/profile/fcm-token', { token });
          setProfile((prev) => ({ ...prev, user: { ...prev.user, fcmToken: token } }));
          alert('Push notifications enabled!');
        } else {
          alert('Permission denied or notification token generation failed.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to toggle notifications.');
    }
  };

  const getInitials = (name = '') =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF7ED]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-[#EA580C] animate-spin" />
          <p className="text-[#78716C] font-semibold text-sm">Loading student profile...</p>
        </div>
      </div>
    );
  }

  const { user: u, stats, recentActivity, completedCourses } = profile;
  const currentCategoryLabel =
    CATEGORY_CHOICES.find((c) => c.id === u.category)?.label || 'General Curriculum';

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
        <div className="clay-card bg-white p-6 sm:p-8 mb-8 border border-[#FED7AA] rounded-2xl shadow-sm">
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

                  {/* Read-Only Category Indicator */}
                  <div>
                    <label className="block text-xs font-bold text-[#78716C] mb-1 flex items-center gap-1">
                      <Lock size={12} className="text-[#EA580C]" /> Assigned Learning Category (Locked)
                    </label>
                    <div className="px-3.5 py-2.5 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-xs font-bold text-[#431407] flex items-center justify-between">
                      <span>{currentCategoryLabel}</span>
                      <span className="text-[10px] text-[#C2410C] uppercase font-bold">Admin Managed</span>
                    </div>
                    <p className="text-[10px] text-[#78716C] mt-1">
                      Category determines your course tracks and chat room. Use "Request Category Change" to switch.
                    </p>
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
                      onClick={handleSaveProfile}
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
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                      <Lock size={11} className="text-[#EA580C]" />
                      {currentCategoryLabel}
                    </span>
                  </div>

                  <p className="text-xs text-[#78716C] mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                    <Mail size={13} /> {u.email}
                  </p>

                  <p className="text-xs sm:text-sm text-[#431407] mt-3 leading-relaxed">
                    {u.bio || 'No bio added yet. Add your study goals!'}
                  </p>

                  {/* Category Status & Request Action */}
                  <div className="mt-4 pt-3 border-t border-[#FED7AA]/60 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <button
                      onClick={() => setEditing(true)}
                      className="clay-btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
                    >
                      <Edit3 size={14} /> Edit Profile
                    </button>

                    <button
                      onClick={() => {
                        const target = CATEGORY_CHOICES.find((c) => c.id !== u.category)?.id || 'skills';
                        setRequestedCategory(target);
                        setShowCategoryModal(true);
                      }}
                      className="clay-btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5 text-[#EA580C] border-[#FED7AA]"
                    >
                      <Compass size={14} /> Request Category Change
                    </button>

                    <button
                      onClick={toggleNotifications}
                      className="clay-btn-subtle text-xs flex items-center gap-1.5"
                    >
                      {u.fcmToken ? <BellOff size={14} /> : <Bell size={14} />}
                      {u.fcmToken ? 'Disable Push' : 'Enable Push'}
                    </button>
                  </div>

                  {/* Active Request Notice Banner */}
                  {myCategoryRequest && myCategoryRequest.status === 'pending' && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 flex items-center gap-2">
                      <Clock size={15} className="flex-shrink-0 text-amber-600" />
                      <span>
                        Pending Request: You requested to change your category to{' '}
                        <strong>
                          {CATEGORY_CHOICES.find((c) => c.id === myCategoryRequest.requestedCategory)?.label ||
                            myCategoryRequest.requestedCategory}
                        </strong>
                        . Waiting for admin approval.
                      </span>
                    </div>
                  )}

                  {myCategoryRequest && myCategoryRequest.status === 'rejected' && (
                    <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2">
                      <AlertCircle size={15} className="flex-shrink-0 text-red-600" />
                      <span>
                        Your previous request to change to{' '}
                        {CATEGORY_CHOICES.find((c) => c.id === myCategoryRequest.requestedCategory)?.label} was
                        rejected by the admin team.
                      </span>
                    </div>
                  )}

                  {myCategoryRequest && myCategoryRequest.status === 'approved' && (
                    <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200 text-xs font-bold text-green-700 flex items-center gap-2">
                      <CheckCircle2 size={15} className="flex-shrink-0 text-green-600" />
                      <span>
                        Your category change was approved! You are enrolled in{' '}
                        {currentCategoryLabel}.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Learning Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="clay-card bg-white p-4 border border-[#FED7AA] rounded-2xl shadow-sm">
            <span className="text-xs text-[#78716C] font-bold uppercase flex items-center gap-1 mb-1">
              <Clock size={13} className="text-[#EA580C]" /> Watch Time
            </span>
            <p className="text-xl font-black text-[#431407]">{formatDuration(stats.totalWatchTime || 0)}</p>
          </div>

          <div className="clay-card bg-white p-4 border border-[#FED7AA] rounded-2xl shadow-sm">
            <span className="text-xs text-[#78716C] font-bold uppercase flex items-center gap-1 mb-1">
              <CheckCircle2 size={13} className="text-green-600" /> Completed
            </span>
            <p className="text-xl font-black text-[#431407]">{stats.completedVideos || 0}</p>
          </div>

          <div className="clay-card bg-white p-4 border border-[#FED7AA] rounded-2xl shadow-sm">
            <span className="text-xs text-[#78716C] font-bold uppercase flex items-center gap-1 mb-1">
              <Flame size={13} className="text-[#EA580C]" /> Streak
            </span>
            <p className="text-xl font-black text-[#EA580C]">{stats.currentStreak || 0}d</p>
          </div>

          <div className="clay-card bg-white p-4 border border-[#FED7AA] rounded-2xl shadow-sm">
            <span className="text-xs text-[#78716C] font-bold uppercase flex items-center gap-1 mb-1">
              <BookOpen size={13} className="text-[#EA580C]" /> Curricula
            </span>
            <p className="text-xl font-black text-[#431407]">{stats.totalCourses || 0}</p>
          </div>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: REQUEST CATEGORY CHANGE
         ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setRequestError('');
          setRequestSuccess('');
        }}
        title="Request Category Change"
        subtitle="Changes your primary learning track and category chat room."
        icon={<Compass size={20} className="text-[#EA580C]" />}
        isDirty={Boolean(changeReason.trim())}
        maxWidth="max-w-lg"
      >
        {requestError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{requestError}</span>
          </div>
        )}

        {requestSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>{requestSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSubmitCategoryRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#431407] uppercase tracking-wider mb-1">
              Current Category
            </label>
            <div className="px-3.5 py-2.5 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-xs font-bold text-[#78716C]">
              {currentCategoryLabel}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#431407] uppercase tracking-wider mb-1">
              Requested Category <span className="text-red-500">*</span>
            </label>
            <select
              value={requestedCategory}
              onChange={(e) => setRequestedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-bold bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-[#431407] focus:outline-none"
            >
              {CATEGORY_CHOICES.filter((c) => c.id !== u.category).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#431407] uppercase tracking-wider mb-1">
              Reason for Change (Optional)
            </label>
            <textarea
              rows={3}
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="Tell the administration why you want to switch tracks..."
              maxLength={500}
              className="w-full px-3.5 py-2.5 text-xs bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-[#431407] focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#FED7AA]">
            <button
              type="button"
              onClick={() => {
                setShowCategoryModal(false);
                setRequestError('');
                setRequestSuccess('');
              }}
              className="px-4 py-2 text-xs font-bold text-[#78716C] hover:bg-[#FFF7ED] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingRequest || myCategoryRequest?.status === 'pending'}
              className="clay-btn-primary px-5 py-2 text-xs font-black shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {submittingRequest ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send size={14} /> Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      <Footer />
    </div>
  );
}

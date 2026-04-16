import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { formatDuration } from '../utils/helpers';
import {
  User, Mail, Edit3, Save, X, Camera, BookOpen, CheckCircle2,
  Clock, Flame, Trophy, Calendar, LogOut, ArrowLeft, Bell, BellOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '' });
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
      setForm({ name: data.user.name, bio: data.user.bio || '' });
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
      const updated = await api.put('/api/profile', {
        name: form.name,
        bio: form.bio,
        avatar: avatarPreview,
      }).then(r => r.data);
      setProfile(prev => ({ ...prev, user: { ...prev.user, ...updated } }));
      setEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleNotifications = async () => {
    try {
      if (profile.user.fcmToken) {
        await api.delete('/api/profile/fcm-token');
        setProfile(prev => ({ ...prev, user: { ...prev.user, fcmToken: null } }));
        alert("Push notifications completely disabled.");
      } else {
        const { requestForToken } = await import('../utils/firebase');
        const token = await requestForToken();
        if (token) {
          await api.post('/api/profile/fcm-token', { token });
          setProfile(prev => ({ ...prev, user: { ...prev.user, fcmToken: token } }));
          alert("Push notifications enabled!");
        } else {
          alert("Permission denied or error generating token. Check browser settings.");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to toggle notifications.");
    }
  };

  const getInitials = (name = '') =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Loading profile...</p>
      </div>
    </div>
  );

  const { user: u, stats, recentActivity } = profile;
  const joinDate = new Date(u.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const completionRate = stats.totalVideos > 0
    ? Math.round((stats.completedVideos / stats.totalVideos) * 100)
    : 0;

  const AVATARS = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe',
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white theme-lavender:from-violet-500 theme-lavender:via-purple-500 theme-lavender:to-fuchsia-500">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-48 h-48 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-5 right-10 w-64 h-32 bg-yellow-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition backdrop-blur-sm"
            >
              <ArrowLeft size={16} /> Back
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            {/* Avatar */}
            <div className="relative group flex-shrink-0">
              <div className="w-28 h-28 rounded-3xl overflow-hidden border-4 border-white/50 shadow-2xl bg-orange-400">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-black text-white">
                    {getInitials(u.name)}
                  </div>
                )}
              </div>
              {editing && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute inset-0 bg-black/40 rounded-3xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <Camera size={22} className="text-white" />
                  <span className="text-xs font-bold mt-1">Upload</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left flex flex-col items-center sm:items-start">
              {editing && (
                <div className="flex gap-2 mb-4 overflow-x-auto justify-center sm:justify-start w-full px-2 max-w-[250px] sm:max-w-md">
                  {AVATARS.map((av) => (
                    <img 
                      key={av} src={av} alt="avatar option" 
                      onClick={() => setAvatarPreview(av)}
                      className={`w-10 h-10 rounded-full cursor-pointer border-2 transition ${avatarPreview === av ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}`}
                    />
                  ))}
                </div>
              )}
              
              {editing ? (
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="text-2xl font-black bg-white/20 border border-white/40 rounded-xl px-4 py-2 text-white placeholder-white/60 mb-2 w-full sm:w-auto"
                />
              ) : (
                <h1 className="text-3xl font-black drop-shadow">{u.name}</h1>
              )}
              <p className="text-white/80 text-sm font-medium flex items-center justify-center sm:justify-start gap-2 mt-1">
                <Mail size={14} /> {u.email}
              </p>
              <p className="text-white/70 text-xs mt-1 flex items-center justify-center sm:justify-start gap-2">
                <Calendar size={13} /> Joined {joinDate}
              </p>
              
              {!editing && (
                 <button 
                   onClick={toggleNotifications}
                   className={`mt-4 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition ${u.fcmToken ? 'bg-green-500/20 text-green-100 hover:bg-green-500/30' : 'bg-slate-500/20 text-slate-200 hover:bg-slate-500/30'}`}
                 >
                   {u.fcmToken ? <><Bell size={14}/> Push Active</> : <><BellOff size={14}/> Push Inactive (Click to Enable)</>}
                 </button>
              )}

              {editing ? (
                <textarea
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Write a short bio..."
                  className="mt-3 w-full bg-white/20 border border-white/40 rounded-xl px-4 py-2 text-white placeholder-white/60 text-sm resize-none min-h-[60px]"
                />
              ) : (
                <p className="text-white/80 text-sm mt-2 italic">{u.bio || 'No bio yet. Click Edit to add one!'}</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 flex-shrink-0">
              {editing ? (
                <>
                  <button
                    onClick={() => { setEditing(false); setForm({ name: u.name, bio: u.bio || '' }); setAvatarPreview(u.avatar || ''); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm transition"
                  >
                    <X size={15} /> Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-white text-orange-600 hover:bg-orange-50 rounded-xl font-bold text-sm transition shadow-lg"
                  >
                    {saving ? <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm transition"
                  >
                    <Edit3 size={15} /> Edit Profile
                  </button>
                  <button
                    onClick={() => { logout(); navigate('/login'); }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/30 hover:bg-red-500/50 rounded-xl font-bold text-sm transition"
                  >
                    <LogOut size={15} /> Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <CheckCircle2 size={22} className="text-green-500" />, label: 'Completed', value: stats.completedVideos, sub: `of ${stats.totalVideos} videos`, bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
            { icon: <Clock size={22} className="text-indigo-500" />, label: 'Watch Time', value: formatDuration(stats.totalWatchTime), sub: 'total', bg: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' },
            { icon: <Flame size={22} className="text-orange-500" />, label: 'Streak', value: `${stats.currentStreak} 🔥`, sub: 'days', bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' },
            { icon: <BookOpen size={22} className="text-blue-500" />, label: 'Courses', value: stats.totalCourses, sub: 'enrolled', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
          ].map((s, i) => (
            <div key={i} className={`p-5 rounded-2xl border ${s.bg} glass-card flex flex-col items-center text-center gap-2`}>
              <div className="p-2 bg-white/60 dark:bg-slate-800/60 rounded-xl">{s.icon}</div>
              <span className="text-2xl font-black dark:text-white">{s.value}</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{s.label}</span>
              <span className="text-xs text-slate-400">{s.sub}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-800 dark:text-white">Overall Completion</h3>
            <span className="text-2xl font-black text-orange-500">{completionRate}%</span>
          </div>
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-1000"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {stats.completedVideos} of {stats.totalVideos} videos completed
          </p>
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-orange-500" /> Recent Completions
          </h3>
          {recentActivity.length === 0 ? (
            <p className="text-slate-400 text-sm italic text-center py-8">No completed videos yet. Start learning!</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((v, i) => (
                <div key={v._id || i} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm dark:text-white truncate">{v.title}</p>
                    <p className="text-xs text-slate-400">{v.course} · {formatDuration(v.duration)}</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {v.completedAt ? new Date(v.completedAt).toLocaleDateString('en-IN') : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

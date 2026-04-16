import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../api/api';
import { formatDuration } from '../utils/helpers';
import {
  Users, Trash2, Clock, PlayCircle, LogOut, ShieldAlert, X, BookOpen,
  CheckCircle2, Trophy, Medal, Crown, BarChart2, Activity, Eye,
  Search, Filter, ChevronDown, TrendingUp, Flame, AlertTriangle, Send, Palette
} from 'lucide-react';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const TABS = [
  { id: 'users', label: 'Users', icon: <Users size={16} /> },
  { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={16} /> },
  { id: 'notifications', label: 'Push & Theme', icon: <Send size={16} /> },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Push notification state
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushSending, setPushSending] = useState(false);

  // Theme state
  const [isLavender, setIsLavender] = useState(false);

  useEffect(() => {
    // Check if lavender theme is active
    setIsLavender(document.documentElement.classList.contains('theme-lavender'));
  }, []);

  const toggleLavenderTheme = () => {
    if (isLavender) {
      document.documentElement.classList.remove('theme-lavender');
      localStorage.removeItem('cb_theme_lavender');
    } else {
      document.documentElement.classList.add('theme-lavender');
      localStorage.setItem('cb_theme_lavender', 'true');
    }
    setIsLavender(!isLavender);
  };

  const handleSendPush = async () => {
    if (!pushTitle || !pushBody) return alert("Title and Body required.");
    const recipientIds = selectedUser ? [selectedUser._id] : [];
    
    setPushSending(true);
    try {
      const res = await adminService.sendPush({ title: pushTitle, body: pushBody, userIds: recipientIds });
      alert(res.message);
      setPushTitle('');
      setPushBody('');
    } catch (err) {
      alert(err.response?.data?.error || "Push failed");
    } finally {
      setPushSending(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchAll();
  }, [user, navigate]);

  const fetchAll = async () => {
    try {
      const [usersData, lbData] = await Promise.all([
        adminService.getUsers(),
        adminService.getLeaderboard(),
      ]);
      setUsers(usersData);
      setLeaderboard(lbData);
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user and ALL their data permanently?')) return;
    try {
      await adminService.deleteUser(id);
      setUsers(users.filter(u => u._id !== id));
      if (selectedUser?._id === id) setSelectedUser(null);
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const handleBlockUser = async (id) => {
    try {
      const data = await adminService.toggleBlock(id);
      setUsers(users.map(u => u._id === id ? { ...u, status: data.user.status } : u));
      if (userDetails?.user?._id === id) {
        setUserDetails(prev => ({ ...prev, user: { ...prev.user, status: data.user.status } }));
      }
    } catch (err) {
      alert('Failed to update user status');
    }
  };

  const handleViewUser = async (u) => {
    setSelectedUser(u);
    setLoadingDetails(true);
    try {
      const data = await adminService.getUserDetails(u._id);
      setUserDetails(data);
    } catch (err) {
      alert('Failed to fetch user details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalCompletedVideos = users.reduce((a, u) => a + (u.completedVideos || 0), 0);
  const totalWatchTime = users.reduce((a, u) => a + (u.totalWatchTime || 0), 0);
  const blockedUsers = users.filter(u => u.status === 'blocked').length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Loading admin panel...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-500/20 border border-red-500/40 rounded-2xl flex items-center justify-center">
            <ShieldAlert size={24} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Admin Control Panel</h1>
            <p className="text-slate-400 text-sm">Course Buddy · Total {users.length} users managed</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold transition"
        >
          <LogOut size={15} /> Logout
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Users size={20} className="text-blue-500" />, label: 'Total Users', value: users.length, bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
            { icon: <CheckCircle2 size={20} className="text-green-500" />, label: 'Videos Done', value: totalCompletedVideos, bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
            { icon: <Clock size={20} className="text-indigo-500" />, label: 'Total Watch Time', value: formatDuration(totalWatchTime), bg: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' },
            { icon: <AlertTriangle size={20} className="text-red-500" />, label: 'Blocked Users', value: blockedUsers, bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
          ].map((s, i) => (
            <div key={i} className={`p-5 rounded-2xl border glass-card ${s.bg} flex flex-col gap-2`}>
              <div className="p-2 bg-white/60 dark:bg-slate-800/60 rounded-xl w-fit">{s.icon}</div>
              <span className="text-2xl font-black dark:text-white">{s.value}</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                activeTab === t.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className={`grid gap-6 ${selectedUser ? 'grid-cols-1 xl:grid-cols-5' : 'grid-cols-1'}`}>
            {/* User Table */}
            <div className={`glass-card rounded-2xl overflow-hidden ${selectedUser ? 'xl:col-span-3' : ''}`}>
              {/* Table search/filter bar */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex gap-3 flex-wrap">
                <div className="flex-1 relative min-w-[200px]">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 dark:text-white"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-sm">User</th>
                      {!selectedUser && <>
                        <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-sm">Status</th>
                        <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-sm text-center">Watch Time</th>
                        <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-sm text-center">Videos</th>
                        <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-sm text-center">Streak</th>
                      </>}
                      <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-sm text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredUsers.map(u => (
                      <tr
                        key={u._id}
                        onClick={() => handleViewUser(u)}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition cursor-pointer ${selectedUser?._id === u._id ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${u.status === 'blocked' ? 'bg-red-100 text-red-500 dark:bg-red-900/30' : 'bg-gradient-to-br from-orange-400 to-amber-500 text-white'}`}>
                              {getInitials(u.name)}
                            </div>
                            <div>
                              <p className="font-bold text-sm dark:text-white">{u.name}</p>
                              <p className="text-xs text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        {!selectedUser && <>
                          <td className="p-4">
                            <span className={`badge text-xs ${u.status === 'blocked' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                              {u.status || 'active'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="text-sm font-bold dark:text-slate-300">{formatDuration(u.totalWatchTime || 0)}</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="badge bg-amber-100 text-amber-700 dark:bg-slate-800 dark:text-amber-400 text-xs">
                              <PlayCircle size={11} className="mr-1"/> {u.completedVideos}/{u.totalVideos}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="text-sm font-bold text-orange-500">{u.currentStreak || 0}🔥</span>
                          </td>
                        </>}
                        <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleViewUser(u)}
                              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-900/30 dark:hover:text-orange-400 transition"
                              title="View details"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleBlockUser(u._id)}
                              className={`p-2 rounded-lg transition ${u.status === 'blocked' ? 'bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white dark:bg-orange-900/30 dark:text-orange-400' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                              title={u.status === 'blocked' ? 'Unblock' : 'Block'}
                            >
                              <ShieldAlert size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u._id)}
                              className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white dark:bg-red-900/20 dark:hover:bg-red-600 rounded-lg transition"
                              title="Delete user"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan="7" className="p-12 text-center text-slate-400 italic">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* User Detail Sidebar */}
            {selectedUser && (
              <div className="xl:col-span-2 glass-card rounded-2xl overflow-hidden h-fit">
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-5 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${userDetails?.user?.status === 'blocked' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      {getInitials(selectedUser.name)}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white">{selectedUser.name}</h2>
                      <p className="text-slate-400 text-xs">{selectedUser.email}</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedUser(null); setUserDetails(null); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition">
                    <X size={16}/>
                  </button>
                </div>

                {loadingDetails ? (
                  <div className="p-12 flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : userDetails ? (
                  <div className="p-5 space-y-5">
                    {/* Status + Actions */}
                    <div className="flex items-center justify-between">
                      <span className={`badge ${userDetails.user.status === 'blocked' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                        {userDetails.user.status || 'active'}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBlockUser(selectedUser._id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition ${userDetails.user.status === 'blocked' ? 'bg-orange-100 text-orange-700 hover:bg-orange-500 hover:text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-red-100 hover:text-red-600'}`}
                        >
                          <ShieldAlert size={13} />
                          {userDetails.user.status === 'blocked' ? 'Unblock' : 'Block'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(selectedUser._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Courses', value: userDetails.stats.totalCourses, icon: <BookOpen size={14} />, color: 'text-blue-500' },
                        { label: 'Streak', value: `${userDetails.stats.currentStreak}🔥`, icon: <Flame size={14} />, color: 'text-orange-500' },
                        { label: 'Videos Done', value: `${userDetails.stats.completedVideos}/${userDetails.stats.totalVideos}`, icon: <CheckCircle2 size={14} />, color: 'text-green-500' },
                        { label: 'Watch Time', value: formatDuration(userDetails.stats.totalWatchTime), icon: <Clock size={14} />, color: 'text-indigo-500' },
                      ].map((s, i) => (
                        <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-center">
                          <div className={`flex items-center justify-center gap-1 ${s.color} mb-1`}>{s.icon}</div>
                          <p className="font-black text-lg dark:text-white">{s.value}</p>
                          <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Joined date */}
                    <div className="text-xs text-slate-400 text-center">
                      Joined {new Date(userDetails.user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>

                    {/* All Videos */}
                    <div>
                      <h3 className="font-bold text-sm dark:text-slate-200 mb-3 flex items-center gap-2">
                        <Activity size={15} className="text-orange-500" /> All Videos ({userDetails.videos.length})
                      </h3>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {userDetails.videos.length === 0 ? (
                          <p className="text-xs text-slate-400 italic text-center py-4">No videos added yet.</p>
                        ) : userDetails.videos.map(v => (
                          <div key={v._id} className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${v.completed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                {v.completed ? <CheckCircle2 size={12} className="text-green-500" /> : <PlayCircle size={12} className="text-slate-400" />}
                              </span>
                              <span className="font-semibold dark:text-slate-200 truncate flex-1">{v.title}</span>
                              <span className="text-slate-400 whitespace-nowrap">{formatDuration(v.duration)}</span>
                            </div>
                            <div className="flex justify-between mt-1 pl-7 text-slate-400">
                              <span>{v.course}</span>
                              {v.completed && v.completedAt && (
                                <span>✓ {new Date(v.completedAt).toLocaleDateString('en-IN')}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Courses List */}
                    {userDetails.courses.length > 0 && (
                      <div>
                        <h3 className="font-bold text-sm dark:text-slate-200 mb-3 flex items-center gap-2">
                          <BookOpen size={15} className="text-blue-500" /> Courses ({userDetails.courses.length})
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {userDetails.courses.map(c => (
                            <span key={c._id} className="badge bg-blue-100 text-blue-700 dark:bg-slate-800 dark:text-blue-300 text-xs">{c.name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-black text-lg dark:text-white flex items-center gap-2">
                <Trophy size={20} className="text-yellow-500" /> Watch Time Leaderboard
              </h2>
              <p className="text-slate-400 text-sm">All users ranked by total completed video watch time</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-sm">#</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-sm">User</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-sm">Status</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-sm text-center">Watch Time</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-sm text-center">Videos</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-sm text-center">Courses</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-sm text-center">Streak</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-sm">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {leaderboard.map((u, idx) => {
                    const rank = idx + 1;
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                        <td className="p-4">
                          <span className="text-xl">{rank <= 3 ? medals[rank - 1] : rank}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {u.avatar ? (
                              <img src={u.avatar} className="w-9 h-9 rounded-xl object-cover" alt="" />
                            ) : (
                              <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                                {getInitials(u.name)}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-sm dark:text-white">{u.name}</p>
                              <p className="text-xs text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`badge text-xs ${u.status === 'blocked' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                            {u.status || 'active'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-black text-indigo-600 dark:text-indigo-400">{formatDuration(u.totalWatchTime)}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold dark:text-slate-300">{u.completedVideos}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold dark:text-slate-300">{u.totalCourses}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-orange-500">{u.currentStreak}🔥</span>
                        </td>
                        <td className="p-4 text-xs text-slate-400">
                          {new Date(u.joinedAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan="8" className="p-12 text-center text-slate-400 italic">No users yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Push & Theme Tab */}
        {activeTab === 'notifications' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Theme Changer */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                  <Palette size={20} />
                </div>
                <h2 className="text-xl font-black dark:text-white">Theme & Styling</h2>
              </div>
              <p className="text-sm text-slate-500 mb-6">Switch the entire application color schema dynamically. Users will see the default, but this sets your personal admin session theme!</p>
              
              <button
                onClick={toggleLavenderTheme}
                className={`w-full py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 border-2 transition ${isLavender ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
              >
                <div className="flex gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#f97316] shadow"></span>
                  <span className="w-6 h-6 rounded-full bg-[#8b5cf6] shadow"></span>
                </div>
                {isLavender ? 'Lavender Theme Active ✨' : 'Switch to Lavender ✨'}
              </button>
            </div>

            {/* Push Notifications Setup */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <Send size={20} />
                </div>
                <h2 className="text-xl font-black dark:text-white">Send Push Notification</h2>
              </div>
              <p className="text-sm text-slate-500 mb-6">Send an FCM notification to all active devices or select a user from the 'Users' tab first.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Send To</label>
                  <p className="text-sm font-bold bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl dark:text-white">
                    {selectedUser ? `Target: ${selectedUser.name}` : 'Broadcast to ALL USERS'}
                  </p>
                </div>
                <div>
                   <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Title</label>
                   <input 
                     value={pushTitle} onChange={e => setPushTitle(e.target.value)} 
                     className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:text-white"
                     placeholder="New feature announcement!"
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Message Body</label>
                   <textarea 
                     value={pushBody} onChange={e => setPushBody(e.target.value)} 
                     rows="3"
                     className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:text-white resize-none"
                     placeholder="Tap here to check out the new Community section..."
                   />
                </div>
                
                <button 
                  onClick={handleSendPush}
                  disabled={pushSending}
                  className="w-full btn-primary py-3 rounded-xl font-bold flex justify-center items-center gap-2"
                >
                  {pushSending ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <><Send size={18}/> Push Now</>}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

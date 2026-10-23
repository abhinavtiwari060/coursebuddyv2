import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../api/api';
import { formatDuration } from '../utils/helpers';
import {
  Users, Trash2, Clock, PlayCircle, LogOut, ShieldAlert, X, BookOpen,
  CheckCircle2, Trophy, Activity, Eye, Search, Flame, AlertTriangle, Send,
  Palette, Bug, ToggleLeft, ToggleRight, Settings as SettingsIcon, ShieldCheck,
  Compass
} from 'lucide-react';
import AdminUserLimit from '../components/AdminUserLimit';
import SuggestedPlaylistsAdmin from '../components/SuggestedPlaylistsAdmin';
import AdminCourseManager from '../components/AdminCourseManager';
import AdminCategoryRequests from '../components/AdminCategoryRequests';
import AdminDeleteRequests from '../components/AdminDeleteRequests';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const TABS = [
  { id: 'users',             label: 'Users',              icon: <Users size={16} /> },
  { id: 'leaderboard',       label: 'Leaderboard',        icon: <Trophy size={16} /> },
  { id: 'courses',           label: 'Course Management',  icon: <BookOpen size={16} /> },
  { id: 'playlists',         label: 'Playlist Management',icon: <PlayCircle size={16} /> },
  { id: 'category_requests', label: 'Category Requests',  icon: <Compass size={16} /> },
  { id: 'delete_requests',   label: 'Delete Requests',    icon: <Trash2 size={16} /> },
  { id: 'bugs',              label: 'Bug Reports',        icon: <Bug size={16} /> },
  { id: 'notifications',     label: 'Settings & Push',    icon: <SettingsIcon size={16} /> },
];

const FEATURE_LABELS = {
  canAccessCourses: 'YouTube Courses',
  canAddCourse: 'Add Course',
  canDeleteCourse: 'Delete Course',
  canUsePomodoro: 'Pomodoro Timer',
  canUseLeaderboard: 'Leaderboard',
  canReportBug: 'Bug Report',
};

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

  // Bug reports state
  const [bugReports, setBugReports] = useState([]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchAll();
  }, [user, navigate]);

  const fetchAll = async () => {
    try {
      const [usersData, lbData, bugsData] = await Promise.all([
        adminService.getUsers(),
        adminService.getLeaderboard(),
        adminService.getBugReports().catch(() => []),
      ]);
      setUsers(usersData || []);
      setLeaderboard(lbData || []);
      setBugReports(bugsData || []);
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendPush = async () => {
    if (!pushTitle || !pushBody) return alert('Title and Body required.');
    const recipientIds = selectedUser ? [selectedUser._id] : [];
    
    setPushSending(true);
    try {
      const res = await adminService.sendPush({ title: pushTitle, body: pushBody, userIds: recipientIds });
      alert(res.message || 'Notification broadcast sent successfully!');
      setPushTitle('');
      setPushBody('');
    } catch (err) {
      alert(err.response?.data?.error || 'Push failed');
    } finally {
      setPushSending(false);
    }
  };

  const handleUpdateBugStatus = async (id, status) => {
    try {
      const updated = await adminService.updateBugReport(id, status);
      setBugReports(prev => prev.map(b => b._id === id ? updated : b));
    } catch (err) {
      alert('Failed to update bug report');
    }
  };

  const handleDeleteBug = async (id) => {
    if (!window.confirm('Delete this bug report?')) return;
    try {
      await adminService.deleteBugReport(id);
      setBugReports(prev => prev.filter(b => b._id !== id));
    } catch (err) {
      alert('Failed to delete bug report');
    }
  };

  const handleToggleFeature = async (userId, featureKey, currentValue) => {
    const u = users.find(x => x._id === userId);
    const newFeatures = { ...u?.features, [featureKey]: !currentValue };
    try {
      await adminService.updateFeatures(userId, newFeatures);
      setUsers(prev => prev.map(x => x._id === userId ? { ...x, features: newFeatures } : x));
      if (userDetails?.user?._id === userId) {
        setUserDetails(prev => ({ ...prev, user: { ...prev.user, features: newFeatures } }));
      }
    } catch (err) {
      alert('Failed to update feature');
    }
  };

  const handleUpdateApproval = async (userId, approvalStatus) => {
    try {
      const u = await adminService.updateApproval(userId, approvalStatus);
      setUsers(prev => prev.map(x => x._id === userId ? { ...x, approvalStatus: u.approvalStatus, approvalTimestamp: u.approvalTimestamp } : x));
      if (userDetails?.user?._id === userId) {
        setUserDetails(prev => ({ ...prev, user: { ...prev.user, approvalStatus: u.approvalStatus, approvalTimestamp: u.approvalTimestamp } }));
      }
    } catch (err) {
      alert('Failed to update approval status');
    }
  };

  const handleUpdateAccessLevel = async (userId, accessLevel) => {
    try {
      const u = await adminService.updateAccessLevel(userId, accessLevel);
      setUsers(prev => prev.map(x => x._id === userId ? { ...x, accessLevel: u.accessLevel } : x));
      if (userDetails?.user?._id === userId) {
        setUserDetails(prev => ({ ...prev, user: { ...prev.user, accessLevel: u.accessLevel } }));
      }
    } catch (err) {
      alert('Failed to update access level');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user and ALL their data permanently?')) return;
    try {
      await adminService.deleteUser(id);
      setUsers(users.filter(u => u._id !== id));
      if (selectedUser?._id === id) {
        setSelectedUser(null);
        setUserDetails(null);
      }
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
    const matchSearch = (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalCompletedVideos = users.reduce((a, u) => a + (u.completedVideos || 0), 0);
  const totalWatchTime = users.reduce((a, u) => a + (u.totalWatchTime || 0), 0);
  const blockedUsers = users.filter(u => u.status === 'blocked').length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF7ED]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-[#EA580C] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#78716C] font-semibold text-sm">Loading StudyMate Admin Panel...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFF7ED] text-[#431407] font-sans pb-16">
      {/* Admin Top Header - Solid Deep Orange, Zero Gradients */}
      <header className="bg-[#9A3412] text-white px-6 py-5 flex items-center justify-between border-b border-[#7C2D12] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#EA580C] border border-[#FED7AA] rounded-2xl flex items-center justify-center shadow-inner">
            <ShieldAlert size={24} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">Admin Control Panel</h1>
              <span className="text-[10px] font-black uppercase tracking-wider bg-[#FED7AA] text-[#9A3412] px-2 py-0.5 rounded-full">
                StudyMate Core
              </span>
            </div>
            <p className="text-[#FED7AA] text-xs font-medium">Total {users.length} enrolled students managed</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-[#C2410C] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition border border-[#9A3412]"
          >
            ← View Student Platform
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition text-white border border-white/20"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Users size={20} className="text-[#EA580C]" />, label: 'Total Users', value: users.length },
            { icon: <CheckCircle2 size={20} className="text-[#15803D]" />, label: 'Videos Done', value: totalCompletedVideos },
            { icon: <Clock size={20} className="text-[#C2410C]" />, label: 'Total Watch Time', value: formatDuration(totalWatchTime) },
            { icon: <AlertTriangle size={20} className="text-[#DC2626]" />, label: 'Blocked Accounts', value: blockedUsers },
          ].map((s, i) => (
            <div key={i} className="clay-card p-5 bg-white border border-[#FED7AA] rounded-2xl flex flex-col gap-2">
              <div className="p-2.5 bg-[#FFF7ED] rounded-xl w-fit border border-[#FED7AA]">{s.icon}</div>
              <span className="text-2xl font-black text-[#431407]">{s.value}</span>
              <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="clay-card p-2 bg-white border border-[#FED7AA] rounded-2xl flex flex-wrap gap-1.5 w-full">
          {TABS.map(t => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id);
                  if (t.id !== 'users') {
                    setSelectedUser(null);
                    setUserDetails(null);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition whitespace-nowrap ${
                  isActive
                    ? 'bg-[#EA580C] text-white shadow-sm'
                    : 'text-[#78716C] hover:text-[#431407] hover:bg-[#FFF7ED]'
                }`}
              >
                {t.icon} {t.label}
              </button>
            );
          })}
        </div>

        {/* ── Users Tab ── */}
        {activeTab === 'users' && (
          <div className={`grid gap-6 ${selectedUser ? 'grid-cols-1 xl:grid-cols-5' : 'grid-cols-1'}`}>
            {/* User Table */}
            <div className={`clay-card bg-white border border-[#FED7AA] rounded-2xl overflow-hidden ${selectedUser ? 'xl:col-span-3' : ''}`}>
              <div className="p-4 border-b border-[#FED7AA] flex gap-3 flex-wrap items-center justify-between">
                <div className="flex-1 relative min-w-[220px]">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search students by name or email..."
                    className="w-full pl-9 pr-4 py-2 text-sm bg-[#FFF7ED] border border-[#FED7AA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C] text-[#431407]"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-[#FFF7ED] border border-[#FED7AA] rounded-xl focus:outline-none text-[#431407]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="blocked">Blocked Only</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#FFF7ED] border-b border-[#FED7AA] text-xs font-black text-[#78716C] uppercase">
                      <th className="p-4">Student</th>
                      {!selectedUser && <>
                        <th className="p-4">Category</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-center">Watch Time</th>
                        <th className="p-4 text-center">Videos</th>
                        <th className="p-4 text-center">Streak</th>
                      </>}
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FED7AA]/50">
                    {filteredUsers.map(u => (
                      <tr
                        key={u._id}
                        onClick={() => handleViewUser(u)}
                        className={`hover:bg-[#FFF7ED]/70 transition cursor-pointer ${selectedUser?._id === u._id ? 'bg-[#FFF7ED]' : ''}`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 ${
                              u.status === 'blocked' ? 'bg-red-100 text-red-600' : 'bg-[#EA580C] text-white'
                            }`}>
                              {getInitials(u.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[#431407] truncate">{u.name}</p>
                              <p className="text-xs text-[#78716C] truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        {!selectedUser && <>
                          <td className="p-4">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA]">
                              {u.category || 'other'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-full ${
                              u.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {u.status || 'active'}
                            </span>
                          </td>
                          <td className="p-4 text-center font-bold text-[#431407]">
                            {formatDuration(u.totalWatchTime || 0)}
                          </td>
                          <td className="p-4 text-center font-bold text-[#78716C]">
                            {u.completedVideos || 0}
                          </td>
                          <td className="p-4 text-center font-black text-[#EA580C]">
                            {u.currentStreak || 0}🔥
                          </td>
                        </>}
                        <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleViewUser(u)}
                              className="p-1.5 rounded-lg bg-[#FFF7ED] text-[#78716C] hover:bg-[#FED7AA] hover:text-[#431407] transition"
                              title="View details"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleBlockUser(u._id)}
                              className={`p-1.5 rounded-lg transition ${
                                u.status === 'blocked'
                                  ? 'bg-[#EA580C] text-white hover:bg-[#C2410C]'
                                  : 'bg-[#FFF7ED] text-[#78716C] hover:bg-orange-100 hover:text-[#EA580C]'
                              }`}
                              title={u.status === 'blocked' ? 'Unblock user' : 'Block user'}
                            >
                              <ShieldAlert size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u._id)}
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition"
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
                        <td colSpan="7" className="p-12 text-center text-[#78716C] italic">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* User Detail Sidebar */}
            {selectedUser && (
              <div className="xl:col-span-2 clay-card bg-white border border-[#FED7AA] rounded-2xl overflow-hidden h-fit">
                <div className="bg-[#9A3412] p-5 flex items-start justify-between text-white border-b border-[#7C2D12]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#EA580C] text-white flex items-center justify-center font-black text-lg border border-[#FED7AA]">
                      {getInitials(selectedUser.name)}
                    </div>
                    <div>
                      <h2 className="text-lg font-black">{selectedUser.name}</h2>
                      <p className="text-[#FED7AA] text-xs">{selectedUser.email}</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedUser(null); setUserDetails(null); }} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition">
                    <X size={16}/>
                  </button>
                </div>

                {loadingDetails ? (
                  <div className="p-12 flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-[#EA580C] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : userDetails ? (
                  <div className="p-5 space-y-5">
                    {/* Status & Actions */}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-full ${
                        userDetails.user.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {userDetails.user.status || 'active'}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBlockUser(selectedUser._id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                            userDetails.user.status === 'blocked' ? 'bg-[#EA580C] text-white hover:bg-[#C2410C]' : 'bg-[#FFF7ED] text-[#78716C] hover:bg-red-50 hover:text-red-600'
                          }`}
                        >
                          <ShieldAlert size={13} />
                          {userDetails.user.status === 'blocked' ? 'Unblock' : 'Block'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(selectedUser._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Category', value: userDetails.user.category || 'skills', icon: <BookOpen size={14} /> },
                        { label: 'Study Streak', value: `${userDetails.stats.currentStreak}🔥`, icon: <Flame size={14} /> },
                        { label: 'Videos Done', value: `${userDetails.stats.completedVideos}/${userDetails.stats.totalVideos}`, icon: <CheckCircle2 size={14} /> },
                        { label: 'Watch Time', value: formatDuration(userDetails.stats.totalWatchTime), icon: <Clock size={14} /> },
                      ].map((s, i) => (
                        <div key={i} className="p-3 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-center">
                          <div className="flex items-center justify-center gap-1 text-[#EA580C] mb-1">{s.icon}</div>
                          <p className="font-black text-sm text-[#431407] truncate">{s.value}</p>
                          <p className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Approval Management */}
                    <div className="p-4 bg-[#FFF7ED] rounded-xl border border-[#FED7AA]">
                      <h3 className="font-bold text-xs uppercase tracking-wider text-[#78716C] mb-3 flex items-center gap-2">
                        <ShieldCheck size={14} className="text-[#EA580C]" /> Account Verification
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {['pending', 'approved', 'rejected'].map(status => (
                          <button
                            key={status}
                            onClick={() => handleUpdateApproval(userDetails.user._id, status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition ${
                              userDetails.user.approvalStatus === status
                                ? 'bg-[#EA580C] text-white shadow-sm'
                                : 'bg-white text-[#78716C] border border-[#FED7AA]'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-[#78716C] uppercase">Access Level:</label>
                        <select
                          value={userDetails.user.accessLevel || 1}
                          onChange={(e) => handleUpdateAccessLevel(userDetails.user._id, parseInt(e.target.value))}
                          className="bg-white border border-[#FED7AA] rounded-lg px-2 py-1 text-xs font-bold text-[#431407] outline-none"
                        >
                          {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>Level {v}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Feature Access */}
                    <div>
                      <h3 className="font-bold text-xs uppercase tracking-wider text-[#78716C] mb-3 flex items-center gap-2">
                        <ToggleLeft size={14} className="text-[#EA580C]" /> Feature Permissions
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                          const enabled = userDetails.user.features?.[key] !== false;
                          return (
                            <button
                              key={key}
                              onClick={() => handleToggleFeature(userDetails.user._id, key, enabled)}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition border ${
                                enabled
                                  ? 'border-green-300 bg-green-50 text-green-700'
                                  : 'border-red-300 bg-red-50 text-red-600'
                              }`}
                            >
                              <span className="truncate">{label}</span>
                              {enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* ── Leaderboard Tab ── */}
        {activeTab === 'leaderboard' && (
          <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-[#FED7AA] flex items-center justify-between">
              <div>
                <h2 className="font-black text-lg text-[#431407] flex items-center gap-2">
                  <Trophy size={20} className="text-[#EA580C]" /> Verified Watch Time Rankings
                </h2>
                <p className="text-xs text-[#78716C] mt-0.5">Calculated from verified server-side playback session heartbeats</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#FFF7ED] border-b border-[#FED7AA] text-xs font-black text-[#78716C] uppercase">
                    <th className="p-4">Rank</th>
                    <th className="p-4">Student</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-center">Verified Study Time</th>
                    <th className="p-4 text-center">Videos Finished</th>
                    <th className="p-4 text-center">Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FED7AA]/50">
                  {leaderboard.map((u, idx) => {
                    const rank = idx + 1;
                    return (
                      <tr key={u._id} className="hover:bg-[#FFF7ED]/70 transition">
                        <td className="p-4 font-black text-[#EA580C]">#{rank}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#EA580C] text-white rounded-xl flex items-center justify-center font-bold text-xs">
                              {getInitials(u.name)}
                            </div>
                            <div>
                              <p className="font-bold text-[#431407]">{u.name}</p>
                              <p className="text-xs text-[#78716C]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA]">
                            {u.category || 'skills'}
                          </span>
                        </td>
                        <td className="p-4 text-center font-black text-[#EA580C]">
                          {formatDuration(u.totalWatchTime || 0)}
                        </td>
                        <td className="p-4 text-center font-bold text-[#78716C]">
                          {u.completedVideos || 0}
                        </td>
                        <td className="p-4 text-center font-black text-[#C2410C]">
                          {u.currentStreak || 0}🔥
                        </td>
                      </tr>
                    );
                  })}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-12 text-center text-[#78716C] italic">No ranking records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Bug Reports Tab ── */}
        {activeTab === 'bugs' && (
          <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-[#FED7AA]">
              <h2 className="font-black text-lg text-[#431407] flex items-center gap-2">
                <Bug size={20} className="text-[#DC2626]" /> Student Bug Reports
              </h2>
              <p className="text-xs text-[#78716C] mt-0.5">
                {bugReports.filter(b => b.status === 'pending').length} pending · {bugReports.filter(b => b.status === 'resolved').length} resolved
              </p>
            </div>

            <div className="divide-y divide-[#FED7AA]/50">
              {bugReports.length === 0 ? (
                <div className="p-12 text-center text-[#78716C] italic">No active bug reports. Everything is running smoothly! 🎉</div>
              ) : (
                bugReports.map(bug => (
                  <div key={bug._id} className="p-5 hover:bg-[#FFF7ED]/50 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-[#431407] truncate">{bug.title}</h3>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            bug.severity === 'critical' ? 'bg-red-100 text-red-700' :
                            bug.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{bug.severity || 'low'}</span>
                        </div>
                        <p className="text-xs text-[#78716C]">{bug.description}</p>
                        {bug.steps && <p className="text-xs text-[#78716C] mt-1">Steps: {bug.steps}</p>}
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-[#78716C]">
                          <span>Reported by: <strong>{bug.userId?.name || 'Student'}</strong></span>
                          <span>{new Date(bug.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleUpdateBugStatus(bug._id, bug.status === 'resolved' ? 'pending' : 'resolved')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                            bug.status === 'resolved' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {bug.status === 'resolved' ? 'Reopen' : 'Resolve'}
                        </button>
                        <button
                          onClick={() => handleDeleteBug(bug._id)}
                          className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Course Management Tab ── */}
        {activeTab === 'courses' && (
          <div className="max-w-6xl mx-auto">
            <AdminCourseManager initialTab="courses" />
          </div>
        )}

        {/* ── Playlist Management Tab ── */}
        {activeTab === 'playlists' && (
          <div className="max-w-6xl mx-auto">
            <AdminCourseManager initialTab="playlists" />
          </div>
        )}

        {/* ── Category Requests Tab ── */}
        {activeTab === 'category_requests' && (
          <div className="max-w-6xl mx-auto">
            <AdminCategoryRequests />
          </div>
        )}

        {/* ── Delete Requests Tab ── */}
        {activeTab === 'delete_requests' && (
          <div className="max-w-4xl mx-auto">
            <AdminDeleteRequests />
          </div>
        )}

        {/* ── Settings & Push Tab ── */}
        {activeTab === 'notifications' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Design System Status */}
            <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-[#FFF7ED] border border-[#FED7AA] text-[#EA580C] rounded-xl">
                  <Palette size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#431407]">Orange Claymorphism System</h2>
                  <p className="text-xs text-[#78716C]">Design Token Architecture (Zero Gradients Policy)</p>
                </div>
              </div>
              <p className="text-xs text-[#78716C] mb-4 leading-relaxed">
                StudyMate strictly enforces a standardized, student-focused orange claymorphic palette across all pages.
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { name: 'Primary Orange', hex: '#EA580C', bg: 'bg-[#EA580C]', text: 'text-white' },
                  { name: 'Burnt Orange', hex: '#C2410C', bg: 'bg-[#C2410C]', text: 'text-white' },
                  { name: 'Deep Orange', hex: '#9A3412', bg: 'bg-[#9A3412]', text: 'text-white' },
                  { name: 'Bright Orange', hex: '#F97316', bg: 'bg-[#F97316]', text: 'text-white' },
                  { name: 'Light Orange', hex: '#FED7AA', bg: 'bg-[#FED7AA]', text: 'text-[#431407]' },
                  { name: 'Pale Background', hex: '#FFF7ED', bg: 'bg-[#FFF7ED]', text: 'text-[#431407]' },
                ].map(c => (
                  <div key={c.name} className={`p-2.5 rounded-xl border border-[#FED7AA] ${c.bg} ${c.text}`}>
                    <p className="text-xs font-black">{c.name}</p>
                    <p className="text-[10px] font-mono opacity-80">{c.hex}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Push Notifications Broadcast */}
            <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-[#FFF7ED] border border-[#FED7AA] text-[#EA580C] rounded-xl">
                  <Send size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#431407]">Student Push Broadcast</h2>
                  <p className="text-xs text-[#78716C]">Send FCM notifications to all active student devices</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#78716C] mb-1">Target Audience</label>
                  <p className="text-xs font-black bg-[#FFF7ED] border border-[#FED7AA] px-3 py-2 rounded-xl text-[#EA580C]">
                    {selectedUser ? `Specific Student: ${selectedUser.name}` : 'Broadcast to All Active Students'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#78716C] mb-1">Notification Title</label>
                  <input
                    value={pushTitle}
                    onChange={e => setPushTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#FED7AA] bg-[#FFF7ED] focus:outline-none focus:ring-2 focus:ring-[#EA580C] text-[#431407]"
                    placeholder="New study schedule posted!"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#78716C] mb-1">Message Content</label>
                  <textarea
                    value={pushBody}
                    onChange={e => setPushBody(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#FED7AA] bg-[#FFF7ED] focus:outline-none focus:ring-2 focus:ring-[#EA580C] text-[#431407] resize-none"
                    placeholder="Check out your updated curriculum and upcoming study goals..."
                  />
                </div>
                
                <button
                  onClick={handleSendPush}
                  disabled={pushSending}
                  className="w-full btn-primary py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 text-sm"
                >
                  {pushSending ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <><Send size={15}/> Send Broadcast</>}
                </button>
              </div>
            </div>

            {/* User Limit Control */}
            <AdminUserLimit />

            {/* Suggested Playlists */}
            <SuggestedPlaylistsAdmin />
          </div>
        )}
      </main>
    </div>
  );
}

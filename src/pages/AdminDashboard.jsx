import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api, { adminService } from '../api/api';
import { Users, Trash2, Clock, PlayCircle, LogOut, ShieldAlert, X, BookOpen, CheckCircle2 } from 'lucide-react';
import { formatDuration } from '../utils/helpers';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }

    const fetchUsers = async () => {
      try {
        const data = await adminService.getUsers();
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch users', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [user, navigate]);

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user and ALL their data permanently?')) return;
    try {
      await adminService.deleteUser(id);
      setUsers(users.filter(u => u._id !== id));
      if (selectedUser === id) setSelectedUser(null);
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const handleBlockUser = async (id) => {
    try {
      const data = await adminService.toggleBlock(id);
      setUsers(users.map(u => u._id === id ? { ...u, status: data.user.status } : u));
    } catch (err) {
      alert('Failed to update user status');
    }
  };

  const handleViewUser = async (id) => {
    try {
      const data = await adminService.getUserDetails(id);
      setUserDetails(data);
      setSelectedUser(id);
    } catch (err) {
      alert('Failed to fetch user details');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center dark:text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between glass-card p-6 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center rounded-2xl">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black dark:text-white">Admin Control Panel</h1>
              <p className="text-slate-500 font-medium text-sm">Manage users and platform data</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition">
            <LogOut size={16} /> Logout
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-3xl">
            <h3 className="text-slate-500 dark:text-slate-400 font-bold mb-2">Total Users</h3>
            <p className="text-4xl font-black dark:text-white">{users.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className={`glass-card rounded-3xl overflow-hidden ${selectedUser ? 'col-span-2' : 'col-span-3'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Name</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Email</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Status</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-center">Videos</th>
                    <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map(u => (
                    <tr key={u._id} onClick={() => handleViewUser(u._id)} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition cursor-pointer ${selectedUser === u._id ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}>
                      <td className="p-4 font-medium dark:text-white">{u.name}</td>
                      <td className="p-4 text-slate-500">{u.email}</td>
                      <td className="p-4">
                        <span className={`badge ${u.status === 'blocked' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                           {u.status || 'active'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="badge bg-amber-100 text-amber-700 dark:bg-slate-800 dark:text-amber-400">
                          <PlayCircle size={12} className="mr-1"/> {u.completedVideos} / {u.totalVideos}
                        </span>
                      </td>
                      <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => handleBlockUser(u._id)}
                          className={`p-2 rounded-lg transition mr-2 ${u.status === 'blocked' ? 'bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                          title={u.status === 'blocked' ? 'Unblock user' : 'Block user'}
                        >
                          <ShieldAlert size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u._id)}
                          className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white dark:bg-red-900/20 dark:hover:bg-red-600 rounded-lg transition"
                          title="Delete user"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
           </div>

           {/* Detail Sidebar */}
           {selectedUser && userDetails && (
             <div className="glass-card p-6 rounded-3xl col-span-1 h-fit sticky top-6">
                <div className="flex justify-between items-start mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
                   <div>
                     <h2 className="text-xl font-black dark:text-white">{userDetails.user.name}</h2>
                     <p className="text-slate-500 text-sm">{userDetails.user.email}</p>
                   </div>
                   <button onClick={() => setSelectedUser(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition">
                     <X size={16}/>
                   </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                   <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex flex-col items-center">
                     <span className="text-slate-400 text-xs font-bold uppercase mb-1">Courses</span>
                     <span className="text-2xl font-black dark:text-white">{userDetails.stats.totalCourses}</span>
                   </div>
                   <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex flex-col items-center">
                     <span className="text-slate-400 text-xs font-bold uppercase mb-1">Streak</span>
                     <span className="text-2xl font-black text-orange-500">{userDetails.stats.currentStreak} 🔥</span>
                   </div>
                   <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex flex-col items-center col-span-2">
                     <span className="text-slate-400 text-xs font-bold uppercase mb-1">Total Watch Time</span>
                     <span className="text-xl font-black dark:text-white"><Clock size={16} className="inline mr-1 text-indigo-400"/> {formatDuration(userDetails.stats.totalWatchTime)}</span>
                   </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold flex items-center gap-2 dark:text-slate-200"><BookOpen size={16} className="text-orange-500"/> Recent Activity</h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {userDetails.videos.filter(v => v.completed).sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt)).slice(0, 5).map(v => (
                       <div key={v._id} className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-sm">
                         <div className="font-bold truncate dark:text-slate-200 flex items-center gap-1">
                           <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" /> {v.title}
                         </div>
                         <div className="text-xs text-slate-500 mt-1 flex justify-between">
                            <span>{v.course}</span>
                            <span>{new Date(v.completedAt).toLocaleDateString()}</span>
                         </div>
                       </div>
                    ))}
                    {userDetails.videos.filter(v => v.completed).length === 0 && (
                      <p className="text-sm text-slate-500 italic text-center py-4">No completed videos yet.</p>
                    )}
                  </div>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

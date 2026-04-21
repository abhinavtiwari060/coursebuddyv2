import ProgressBar from './ProgressBar';
import { formatDuration } from '../utils/helpers';
import { Clock, PlayCircle, CheckCircle2, TrendingUp, Sparkles, Bell, Video } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notificationService } from '../api/api';

export default function Dashboard({ videos }) {
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const data = await notificationService.get();
        setNotifications(data);
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    };
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const total            = videos.length;
  const completedVideos  = videos.filter(v => v.completed);
  const completed        = completedVideos.length;
  const remaining        = total - completed;
  const progress         = total === 0 ? 0 : Math.round((completed / total) * 100);
  const totalWatchSecs   = completedVideos.reduce((a, v) => a + (Number(v.duration) || 0), 0);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Total Videos Stat */}
        <div className="stat-card glass-card p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500 shadow-inner">
              <PlayCircle size={26} strokeWidth={2.5} />
            </div>
            <span className="badge bg-orange-100 dark:bg-slate-800 text-orange-600 dark:text-orange-400">Total</span>
          </div>
          <p className="text-4xl font-black dark:text-white tracking-tight">{total}</p>
          <h3 className="font-semibold text-slate-500 dark:text-slate-400 mt-1">Saved Videos</h3>
        </div>

        {/* Completed Stat */}
        <div className="stat-card glass-card p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-green-500/10 dark:text-green-400/5">
            <CheckCircle2 size={120} />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-500 shadow-inner">
                <CheckCircle2 size={26} strokeWidth={2.5} />
              </div>
              <span className="badge bg-green-100 dark:bg-slate-800 text-green-600 dark:text-green-400">Done</span>
            </div>
            <p className="text-4xl font-black dark:text-white tracking-tight">{completed}</p>
            <h3 className="font-semibold text-slate-500 dark:text-slate-400 mt-1">Completed</h3>
          </div>
        </div>

        {/* Progress Stat */}
        <div className="stat-card glass-card p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-amber-400/10 dark:bg-amber-400/5 rounded-bl-[100px] pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-500 shadow-inner">
              <TrendingUp size={26} strokeWidth={2.5} />
            </div>
            <span className="badge bg-amber-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400"><Sparkles size={12} className="inline mr-1" />{progress}%</span>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <p className="text-4xl font-black dark:text-white tracking-tight">{progress}%</p>
            <span className="text-sm font-medium text-slate-400 mb-1">({remaining} left)</span>
          </div>
          <ProgressBar progress={progress} />
        </div>

        {/* Watch Time Stat */}
        <div className="stat-card glass-card p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 shadow-inner">
              <Clock size={26} strokeWidth={2.5} />
            </div>
            <span className="badge bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">Time</span>
          </div>
          <p className="text-3xl font-black dark:text-white tracking-tight break-words relative z-10 mt-1">
            {formatDuration(totalWatchSecs)}
          </p>
          <h3 className="font-semibold text-slate-500 dark:text-slate-400 mt-2 relative z-10">Watch Time</h3>
        </div>
      </div>

      {/* Telegram Sync Banner */}
      <div className="glass-card mb-8 p-6 rounded-3xl bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2 dark:text-white mb-2">
            <Video className="text-blue-500" /> Telegram Video Sync
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-lg">
            Securely connect your Telegram account and sync videos directly from your private channels or groups right into Course Buddy!
          </p>
        </div>
        <Link 
          to="/telegram-sync" 
          className="btn-primary w-full md:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 bg-blue-500 hover:bg-blue-600 border-none"
        >
          <Video size={18} /> Connect Telegram
        </Link>
      </div>

      {/* Notifications Section */}
      <div className="glass-card p-6 rounded-3xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black flex items-center gap-2 dark:text-white">
            <Bell className="text-orange-500" /> Notifications
          </h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {unreadCount} New
            </span>
          )}
        </div>
        
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
          {notifications.length === 0 ? (
            <p className="text-slate-500 text-sm italic">No notifications yet.</p>
          ) : (
            notifications.map(n => (
              <div 
                key={n._id} 
                className={`p-4 rounded-2xl border transition ${n.isRead ? 'bg-white/50 border-slate-100 dark:bg-slate-800/30 dark:border-slate-800 opacity-75' : 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'}`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">{n.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{n.body}</p>
                    <span className="text-xs text-slate-400 mt-2 block">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {!n.isRead && (
                    <button 
                      onClick={() => handleMarkRead(n._id)}
                      className="text-xs bg-white dark:bg-slate-700 font-bold px-3 py-1 rounded-full shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

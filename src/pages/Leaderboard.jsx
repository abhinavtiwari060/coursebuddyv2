import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { formatDuration } from '../utils/helpers';
import { Trophy, Clock, CheckCircle2, Flame, BookOpen, Medal, Crown, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MEDAL_STYLES = [
  { bg: 'bg-gradient-to-br from-yellow-400 to-amber-500', text: 'text-white', icon: <Crown size={16} />, ring: 'ring-yellow-400' },
  { bg: 'bg-gradient-to-br from-slate-400 to-slate-500', text: 'text-white', icon: <Medal size={16} />, ring: 'ring-slate-400' },
  { bg: 'bg-gradient-to-br from-amber-700 to-amber-800', text: 'text-white', icon: <Medal size={16} />, ring: 'ring-amber-700' },
];

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Leaderboard() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('watchTime');

  useEffect(() => {
    if (!authUser) { navigate('/login'); return; }
    fetchLeaderboard();
  }, [authUser]);

  const fetchLeaderboard = async () => {
    try {
      const data = await api.get('/api/leaderboard').then(r => r.data);
      setLeaders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sorted = [...leaders].sort((a, b) => {
    if (sortBy === 'watchTime') return b.totalWatchTime - a.totalWatchTime;
    if (sortBy === 'videos') return b.completedVideos - a.completedVideos;
    if (sortBy === 'streak') return b.currentStreak - a.currentStreak;
    return 0;
  });

  const myRank = sorted.findIndex(l => l._id === authUser?.id) + 1;
  const myEntry = sorted.find(l => l._id === authUser?.id);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-slate-500 font-medium">Loading leaderboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-8 left-12 w-40 h-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-4 right-12 w-60 h-24 bg-purple-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-10">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition mb-6"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Trophy size={32} className="text-yellow-300" />
            </div>
            <div>
              <h1 className="text-3xl font-black drop-shadow">Leaderboard</h1>
              <p className="text-white/70 text-sm mt-1">Ranked by total watch time · {leaders.length} learners</p>
            </div>
          </div>

          {/* My Rank Card */}
          {myEntry && (
            <div className="mt-6 bg-white/15 backdrop-blur-sm border border-white/30 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-yellow-400 text-yellow-900 rounded-xl flex items-center justify-center font-black text-lg">
                #{myRank}
              </div>
              <div>
                <p className="font-bold text-sm">Your Ranking</p>
                <p className="text-white/70 text-xs">
                  {formatDuration(myEntry.totalWatchTime)} watched · {myEntry.completedVideos} videos · {myEntry.currentStreak}🔥 streak
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Sort Controls */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {[
            { key: 'watchTime', label: '⏱ Watch Time', icon: <Clock size={14} /> },
            { key: 'videos', label: '✅ Videos Done', icon: <CheckCircle2 size={14} /> },
            { key: 'streak', label: '🔥 Streak', icon: <Flame size={14} /> },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
                sortBy === s.key
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Top 3 Podium */}
        {sorted.length >= 3 && (
          <div className="flex items-end justify-center gap-4 mb-8">
            {[sorted[1], sorted[0], sorted[2]].map((leader, podIdx) => {
              const rank = podIdx === 0 ? 2 : podIdx === 1 ? 1 : 3;
              const heights = ['h-28', 'h-36', 'h-24'];
              const medal = MEDAL_STYLES[rank - 1];
              return (
                <div key={leader._id} className={`flex flex-col items-center gap-2 flex-1 max-w-[180px]`}>
                  <div className="relative">
                    {leader.avatar ? (
                      <img src={leader.avatar} className={`w-14 h-14 rounded-full object-cover ring-4 ${medal.ring}`} alt="" />
                    ) : (
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-lg ${medal.bg} ${medal.text} ring-4 ${medal.ring}`}>
                        {getInitials(leader.name)}
                      </div>
                    )}
                    <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full ${medal.bg} ${medal.text} flex items-center justify-center text-xs font-black`}>
                      {rank}
                    </div>
                  </div>
                  <p className="font-bold text-sm dark:text-white text-center truncate w-full text-center">{leader.name}</p>
                  <p className="text-xs text-slate-500">{formatDuration(leader.totalWatchTime)}</p>
                  <div className={`w-full ${heights[podIdx]} ${medal.bg} rounded-t-2xl opacity-80`} />
                </div>
              );
            })}
          </div>
        )}

        {/* Full Ranking List */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {sorted.length === 0 ? (
            <div className="py-16 text-center text-slate-400">No learners yet. Be the first!</div>
          ) : (
            sorted.map((leader, idx) => {
              const rank = idx + 1;
              const isMe = leader._id === authUser?.id;
              const medal = MEDAL_STYLES[rank - 1];
              return (
                <div
                  key={leader._id}
                  className={`flex items-center gap-4 p-4 border-b border-slate-100 dark:border-slate-800 last:border-0 transition ${
                    isMe ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  {/* Rank */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                    rank <= 3 ? `${medal.bg} ${medal.text}` : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    {rank <= 3 ? medal.icon : rank}
                  </div>

                  {/* Avatar */}
                  {leader.avatar ? (
                    <img src={leader.avatar} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center font-bold text-white flex-shrink-0">
                      {getInitials(leader.name)}
                    </div>
                  )}

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${leader.isOnline ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} title={leader.isOnline ? 'Active' : 'Inactive'} />
                      <p className="font-bold text-sm dark:text-white truncate">{leader.name}</p>
                      {isMe && <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">You</span>}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-1">
                      {leader.name} • {leader.isOnline ? <span className="text-green-500 font-medium">Active</span> : <span>Inactive</span>}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 text-xs text-right flex-shrink-0">
                    <div className="hidden sm:flex flex-col items-center">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{leader.completedVideos}</span>
                      <span className="text-slate-400">videos</span>
                    </div>
                    <div className="hidden sm:flex flex-col items-center">
                      <span className="font-bold text-orange-500">{leader.currentStreak}🔥</span>
                      <span className="text-slate-400">streak</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-black text-slate-800 dark:text-white">{formatDuration(leader.totalWatchTime)}</span>
                      <span className="text-slate-400">watched</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

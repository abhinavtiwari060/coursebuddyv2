import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { leaderboardService } from '../api/api';
import { formatDuration } from '../utils/helpers';
import { 
  Trophy, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Crown, 
  Medal, 
  Loader2, 
  Calendar,
  Sparkles,
  UserCheck
} from 'lucide-react';

function getInitials(name = '') {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('all'); // all, weekly, monthly
  const [rankings, setRankings] = useState([]);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [currentUserStats, setCurrentUserStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRankings = async (tf) => {
    setLoading(true);
    try {
      const data = await leaderboardService.get(tf);
      if (Array.isArray(data)) {
        // Fallback if array
        setRankings(data);
        const myIndex = data.findIndex((l) => l._id === user?.id || l._id === user?._id);
        setCurrentUserRank(myIndex !== -1 ? myIndex + 1 : data.length + 1);
        setCurrentUserStats(myIndex !== -1 ? data[myIndex] : null);
      } else {
        setRankings(data.rankings || []);
        setCurrentUserRank(data.currentUserRank || null);
        setCurrentUserStats(data.currentUserStats || null);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings(timeframe);
  }, [timeframe]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF7ED]">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#C2410C] border border-[#FED7AA] text-xs font-bold uppercase tracking-wider mb-2">
            <Trophy size={14} className="text-[#EA580C]" /> Verified Study Rankings
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#431407] tracking-tight">
            Learning Leaderboard
          </h1>
          <p className="text-sm text-[#78716C] mt-2">
            Ranked purely by verified video playback study time. Consistency and discipline rewarded.
          </p>
        </div>

        {/* Timeframe Filter Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1.5 rounded-2xl bg-white border border-[#FED7AA] shadow-[2px_2px_6px_rgba(154,52,18,0.06)] gap-1">
            {[
              { id: 'all', label: 'All-Time' },
              { id: 'monthly', label: 'Last 30 Days' },
              { id: 'weekly', label: 'This Week' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                  timeframe === t.id
                    ? 'bg-[#EA580C] text-white shadow-sm'
                    : 'text-[#78716C] hover:text-[#EA580C] hover:bg-[#FFF7ED]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logged in User Rank Card */}
        {currentUserStats && (
          <div className="clay-card-pale p-5 sm:p-6 border-2 border-[#EA580C] mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EA580C] text-white flex items-center justify-center font-black text-xl shadow-[2px_2px_6px_rgba(154,52,18,0.3)]">
                #{currentUserRank || '-'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#431407]">
                    Your Standing ({user?.name || 'You'})
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EA580C] text-white">
                    You
                  </span>
                </div>
                <p className="text-xs text-[#78716C] mt-0.5">
                  Verified Watch Time: <strong className="text-[#C2410C]">{formatDuration(currentUserStats.totalWatchTime)}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold text-[#431407]">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#FED7AA]">
                <CheckCircle2 size={15} className="text-green-600" />
                <span>{currentUserStats.completedVideos} Videos Done</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#FED7AA]">
                <Flame size={15} className="text-[#EA580C]" />
                <span>{currentUserStats.currentStreak} Day Streak</span>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table / Cards */}
        {loading ? (
          <div className="clay-card bg-white p-12 text-center text-[#78716C] flex items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-[#EA580C]" /> Loading rankings...
          </div>
        ) : rankings.length === 0 ? (
          <div className="clay-card bg-white p-12 text-center">
            <Trophy size={40} className="mx-auto text-[#FED7AA] mb-3" />
            <h3 className="text-base font-bold text-[#431407]">No study records yet</h3>
            <p className="text-xs text-[#78716C] mt-1">
              Start watching videos to record verified study hours and appear on the leaderboard!
            </p>
          </div>
        ) : (
          <div className="clay-card bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#FED7AA] bg-[#FFF7ED] text-[#78716C] text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-bold w-16 text-center">Rank</th>
                    <th className="py-3.5 px-4 font-bold">Student</th>
                    <th className="py-3.5 px-4 font-bold text-center">Verified Study Time</th>
                    <th className="py-3.5 px-4 font-bold text-center hidden sm:table-cell">Completed Videos</th>
                    <th className="py-3.5 px-4 font-bold text-center hidden md:table-cell">Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FED7AA]/60">
                  {rankings.map((student, idx) => {
                    const rankNum = student.rank || idx + 1;
                    const isMe = student._id === user?.id || student._id === user?._id;

                    return (
                      <tr
                        key={student._id || idx}
                        className={`transition ${
                          isMe
                            ? 'bg-[#FFF7ED] font-semibold'
                            : 'hover:bg-[#FFF7ED]/40'
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3.5 px-4 text-center font-bold">
                          {rankNum === 1 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#EA580C] text-white shadow-sm font-black text-xs">
                              <Crown size={14} />
                            </span>
                          ) : rankNum === 2 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#FB923C] text-white shadow-sm font-black text-xs">
                              2
                            </span>
                          ) : rankNum === 3 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#FED7AA] text-[#9A3412] font-black text-xs">
                              3
                            </span>
                          ) : (
                            <span className="text-xs text-[#78716C]">#{rankNum}</span>
                          )}
                        </td>

                        {/* Student Name & Avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] border border-[#FED7AA] text-[#C2410C] flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {student.avatar ? (
                                <img
                                  src={student.avatar}
                                  alt={student.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                getInitials(student.name)
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-[#431407] truncate">
                                {student.name} {isMe && '(You)'}
                              </p>
                              <p className="text-[10px] text-[#78716C] truncate">
                                {student.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Verified Watch Time */}
                        <td className="py-3.5 px-4 text-center font-bold text-[#EA580C] text-xs sm:text-sm">
                          {formatDuration(student.totalWatchTime)}
                        </td>

                        {/* Completed Videos */}
                        <td className="py-3.5 px-4 text-center text-xs text-[#431407] hidden sm:table-cell">
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <CheckCircle2 size={13} className="text-green-600" />
                            {student.completedVideos}
                          </span>
                        </td>

                        {/* Streak */}
                        <td className="py-3.5 px-4 text-center text-xs text-[#431407] hidden md:table-cell">
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <Flame size={13} className="text-[#EA580C]" />
                            {student.currentStreak}d
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

import ProgressBar from './ProgressBar';
import { formatDuration } from '../utils/helpers';
import { Clock, PlayCircle, CheckCircle2, TrendingUp, Sparkles, Zap } from 'lucide-react';
import Logo from './Logo';

export default function Dashboard({ videos }) {
  const total = videos.length;
  const completedVideos = videos.filter(v => v.completed);
  const completed = completedVideos.length;
  const remaining = total - completed;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  const totalWatchSecs = completedVideos.reduce((a, v) => a + (Number(v.duration) || 0), 0);

  return (
    <div className="mb-8">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-[#9A3412] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border border-[#7C2D12]">
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl flex items-center justify-center shadow-inner">
            <Logo size={54} />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight">Your Study <span className="text-blue-400">Command Center</span></h2>
            <p className="text-slate-300 font-bold text-sm flex items-center gap-2 mt-1">
              <Zap size={14} className="text-purple-400" /> Keep the consistency alive!
            </p>
          </div>
        </div>

        <div className="flex gap-4 relative z-10">
           <div className="px-6 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-center min-w-[100px]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Efficiency</p>
              <p className="text-xl font-black text-blue-400">{progress}%</p>
           </div>
           <div className="px-6 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-center min-w-[100px]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</p>
              <p className="text-xl font-black text-green-400">{completed}/{total}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Total Videos Stat */}
        <div className="stat-card glass-card p-6 rounded-3xl group hover:-translate-y-1 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 shadow-inner group-hover:scale-110 transition">
              <PlayCircle size={26} strokeWidth={2.5} />
            </div>
            <span className="badge bg-red-100 dark:bg-slate-800 text-red-600 dark:text-red-400 text-[10px] font-black uppercase">Lessons</span>
          </div>
          <p className="text-4xl font-black dark:text-white tracking-tight">{total}</p>
          <h3 className="font-bold text-slate-500 dark:text-slate-400 mt-1 text-sm">Saved Lessons</h3>
        </div>

        {/* Completed Stat */}
        <div className="stat-card glass-card p-6 rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition-transform">
          <div className="absolute -right-6 -top-6 text-green-500/10 dark:text-green-400/5 group-hover:scale-125 transition-transform duration-700">
            <CheckCircle2 size={120} />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-500 shadow-inner group-hover:scale-110 transition">
                <CheckCircle2 size={26} strokeWidth={2.5} />
              </div>
              <span className="badge bg-green-100 dark:bg-slate-800 text-green-600 dark:text-green-400 text-[10px] font-black uppercase">Victory</span>
            </div>
            <p className="text-4xl font-black dark:text-white tracking-tight">{completed}</p>
            <h3 className="font-bold text-slate-500 dark:text-slate-400 mt-1 text-sm">Completed</h3>
          </div>
        </div>

        {/* Progress Stat */}
        <div className="stat-card glass-card p-6 rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition-transform">
          <div className="absolute right-0 top-0 w-32 h-32 bg-purple-400/10 dark:bg-purple-400/5 rounded-bl-[100px] pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-500 shadow-inner group-hover:scale-110 transition">
              <TrendingUp size={26} strokeWidth={2.5} />
            </div>
            <span className="badge bg-purple-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase"><Sparkles size={10} className="inline mr-1" />{progress}%</span>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <p className="text-4xl font-black dark:text-white tracking-tight">{progress}%</p>
            <span className="text-xs font-bold text-slate-400 mb-1">({remaining} left)</span>
          </div>
          <ProgressBar progress={progress} />
        </div>

        {/* Watch Time Stat */}
        <div className="stat-card glass-card p-6 rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition-transform">
          <div className="absolute inset-0 bg-[#FFF7ED] pointer-events-none opacity-50" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 shadow-inner group-hover:scale-110 transition">
              <Clock size={26} strokeWidth={2.5} />
            </div>
            <span className="badge bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase">Mastery</span>
          </div>
          <p className="text-3xl font-black dark:text-white tracking-tight break-words relative z-10 mt-1">
            {formatDuration(totalWatchSecs)}
          </p>
          <h3 className="font-bold text-slate-500 dark:text-slate-400 mt-2 relative z-10 text-sm">Focus Time</h3>
        </div>
      </div>
    </div>
  );
}

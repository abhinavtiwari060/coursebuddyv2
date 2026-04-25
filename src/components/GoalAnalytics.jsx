import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Target, Trophy, CalendarDays, Maximize2 } from 'lucide-react';
import { formatDuration } from '../utils/helpers';

export default function GoalAnalytics({ videos, streak, goalTarget, onUpdateGoal }) {
  const completedVideos = videos.filter(v => v.completed);
  const now = new Date();
  const todayStr = now.toDateString();

  const completedToday = completedVideos.filter(v => new Date(v.completedAt).toDateString() === todayStr).length;

  useEffect(() => {
    if (completedToday >= goalTarget && goalTarget > 0) {
      if (localStorage.getItem('studymate_goal_celebrated') !== todayStr) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        localStorage.setItem('studymate_goal_celebrated', todayStr);
      }
    }
  }, [completedToday, goalTarget, todayStr]);

  // Weekly analytics
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const thisWeekCompleted = completedVideos.filter(v => new Date(v.completedAt) > weekStart);

  const totalTimeThisWeek = thisWeekCompleted.reduce((acc, curr) => acc + (curr.duration || 0), 0);

  // Best day
  const dayCounts = {};
  thisWeekCompleted.forEach(v => {
    const d = new Date(v.completedAt).toLocaleDateString(undefined, { weekday: 'short' });
    dayCounts[d] = (dayCounts[d] || 0) + 1;
  });
  let bestDay = 'None';
  let bestCount = 0;
  Object.keys(dayCounts).forEach(day => {
    if (dayCounts[day] > bestCount) {
      bestCount = dayCounts[day];
      bestDay = day;
    }
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
            <Target size={20} className="text-indigo-500" /> Daily Target
          </h3>
          <input 
            type="number" min="1" 
            className="w-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-center dark:text-white"
            value={goalTarget}
            onChange={(e) => onUpdateGoal(parseInt(e.target.value) || 1)}
          />
        </div>
        <div className="relative pt-4">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
                Progress
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-indigo-600 dark:text-indigo-400">
                {Math.min(100, Math.round((completedToday / goalTarget) * 100))}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2.5 mb-4 text-xs flex rounded-full bg-slate-200 dark:bg-slate-700">
            <div style={{ width: `${Math.min(100, Math.round((completedToday / goalTarget) * 100))}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-1000"></div>
          </div>
          <p className="text-sm text-slate-500 text-center">{completedToday} / {goalTarget} Videos Completed Today</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
          <Trophy size={20} className="text-yellow-500" /> Weekly Analytics
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center mt-4">
          <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="text-2xl font-black text-slate-800 dark:text-white">{thisWeekCompleted.length}</div>
            <div className="text-xs text-slate-500 mt-1">Videos Watched</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col justify-center items-center">
            <div className="text-sm font-black text-slate-800 dark:text-white leading-tight">{formatDuration(totalTimeThisWeek)}</div>
            <div className="text-xs text-slate-500 mt-1">Total Time</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="text-lg font-black text-slate-800 dark:text-white leading-tight mt-1">{bestDay}</div>
            <div className="text-xs text-slate-500 mt-2">Best Day</div>
          </div>
        </div>
      </div>
    </div>
  );
}

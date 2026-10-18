import { Award, Zap, Star } from 'lucide-react';

export default function Badges({ videos, streak }) {
  const completedCount = videos.filter(v => v.completed).length;

  const achievements = [
    { title: 'First Steps', description: 'Complete 1 Video', icon: <Star size={24} />, unlocked: completedCount >= 1 },
    { title: 'Getting Serious', description: 'Complete 10 Videos', icon: <Award size={24} />, unlocked: completedCount >= 10 },
    { title: 'Streak Master', description: 'Reach 7-Day Streak', icon: <Zap size={24} />, unlocked: streak >= 7 },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
        <Award size={20} className="text-orange-500" /> Achievement Badges
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {achievements.map((ach, i) => (
          <div key={i} className={`flex flex-col items-center p-4 rounded-xl border text-center transition-all ${
            ach.unlocked 
              ? 'bg-[#FFF7ED] border border-[#FED7AA] shadow-sm'
              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-60 grayscale'
          }`}>
            <div className={`p-3 rounded-full mb-2 ${ach.unlocked ? 'bg-orange-100 text-orange-600 dark:bg-orange-800/50' : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
              {ach.icon}
            </div>
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{ach.title}</h4>
            <p className="text-xs text-slate-500 mt-1">{ach.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Flame } from 'lucide-react';

export default function StreakCard({ streak }) {
  return (
    <div className="bg-[#EA580C] rounded-2xl p-6 text-white shadow-md border border-[#C2410C] flex items-center justify-between">
      <div>
        <h2 className="text-lg font-medium opacity-90">Daily Streak</h2>
        <div className="text-4xl font-bold mt-1">{streak} Days</div>
        <p className="text-sm opacity-80 mt-2">Keep up the good work!</p>
      </div>
      <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
        <Flame size={40} className="text-white drop-shadow-md" />
      </div>
    </div>
  );
}

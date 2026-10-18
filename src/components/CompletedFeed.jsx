import { CheckCircle2, Calendar } from 'lucide-react';

export default function CompletedFeed({ videos }) {
  if (videos.length === 0) return null;

  // sort latest on top
  const sorted = [...videos].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2 dark:text-white">
        <CheckCircle2 className="text-green-500" />
        Completed Feed
      </h2>
      
      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-[#FED7AA]">
        {sorted.map(video => {
          const date = new Date(video.completedAt);
          const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
          
          return (
            <div key={video.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-800 bg-green-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <CheckCircle2 size={20} />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{video.course}</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={12}/>{formattedDate}</span>
                </div>
                <h3 className="font-medium text-slate-900 dark:text-white line-clamp-1">{video.title}</h3>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

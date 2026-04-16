import { BookOpen, Clock, PlayCircle } from 'lucide-react';
import ProgressBar from './ProgressBar';
import { formatDuration } from '../utils/helpers';

export default function CourseProgress({ courses, videos }) {
  if (courses.length === 0) return (
    <div className="glass-card p-8 rounded-3xl text-center text-slate-500 dark:text-slate-400">
      <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
      <p>No courses created yet. Create a course to organize your videos!</p>
    </div>
  );

  return (
    <div className="glass-card p-6 md:p-8 rounded-3xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 dark:bg-teal-500/5 rounded-bl-[100px] pointer-events-none" />
      
      <h3 className="text-2xl font-black mb-8 dark:text-white flex items-center gap-3 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600">
          <BookOpen size={24} />
        </div>
        Course Overview
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        {courses.map(course => {
          const courseVideos = videos.filter(v => v.course === course.name);
          const total = courseVideos.length;
          const completed = courseVideos.filter(v => v.completed).length;
          const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
          
          const totalSeconds = courseVideos.reduce((acc, v) => acc + (Number(v.duration) || 0), 0);
          const completedSeconds = courseVideos.filter(v => v.completed).reduce((acc, v) => acc + (Number(v.duration) || 0), 0);

          return (
            <div key={course.id} className="bg-white/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 p-5 rounded-2xl hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <span className="font-bold text-lg text-slate-800 dark:text-white w-2/3 truncate" title={course.name}>
                  {course.name}
                </span>
                <span className="badge bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-bold whitespace-nowrap">
                  {progress}% Done
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4 font-medium font-mono">
                <div className="flex items-center gap-1.5" title="Completed / Total Videos">
                  <PlayCircle size={16} className="text-blue-500" />
                  {completed} / {total} vids
                </div>
                <div className="flex items-center gap-1.5" title="Total Course Watch Time">
                  <Clock size={16} className="text-amber-500" />
                  {formatDuration(totalSeconds)} 
                </div>
              </div>

              <div className="mb-1 flex justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                <span>Progress</span>
                <span>{formatDuration(completedSeconds)} watched</span>
              </div>
              <ProgressBar progress={progress} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

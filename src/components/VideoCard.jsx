import { useState } from 'react';
import { Youtube, Send, CheckCircle2, Clock, Check, FileText } from 'lucide-react';
import { formatDuration } from '../utils/helpers';

export default function VideoCard({ video, onToggleComplete, onUpdateNotes }) {
  const isYouTube = video.platform === 'YouTube';
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(video.notes || '');

  const saveNotes = () => {
    onUpdateNotes(video.id, notes);
    setShowNotes(false);
  };

  return (
    <div className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col gap-3
      ${video.completed 
        ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-75' 
        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex justify-between items-start gap-4">
        <h3 className={`font-semibold text-lg line-clamp-2 flex-1 ${video.completed ? 'line-through text-slate-500' : 'text-slate-900 dark:text-white'}`}>
          <a href={video.link} target="_blank" rel="noreferrer" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {video.title}
          </a>
        </h3>
        <div className="flex-shrink-0 mt-1">
          {isYouTube ? (
            <Youtube className="text-red-500" size={24} />
          ) : video.platform === 'Telegram' ? (
            <Send className="text-sky-500" size={24} />
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700" />
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 items-center text-sm mt-auto">
        <span className="px-2.5 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium">
          {video.course}
        </span>
        {video.tag && (
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            #{video.tag}
          </span>
        )}
        <span className="flex items-center gap-1 text-slate-500 ml-auto">
          <Clock size={14} />
          {formatDuration(video.duration)}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setShowNotes(!showNotes)}
          title="Notes"
          className="mt-2 w-10 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors flex-shrink-0"
        >
          <FileText size={18} />
        </button>
        <button
          onClick={() => onToggleComplete(video.id)}
          className={`mt-2 flex-1 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors
            ${video.completed 
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              : 'bg-green-500 hover:bg-green-600 text-white shadow-sm'
            }`}
        >
          {video.completed ? <><Check size={18} /> Completed</> : <><CheckCircle2 size={18} /> Mark as Done</>}
        </button>
      </div>

      {showNotes && (
        <div className="mt-2 border-t border-slate-200 dark:border-slate-700 pt-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add your study notes here..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm min-h-[80px] transition-shadow"
          />
          <button 
            onClick={saveNotes}
            className="mt-2 text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-3 py-1.5 rounded-lg w-full hover:bg-indigo-200 transition-colors"
          >
            Save Notes
          </button>
        </div>
      )}
    </div>
  );
}

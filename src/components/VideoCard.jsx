import { useState } from 'react';
import { Youtube, Send, CheckCircle2, Clock, Check, FileText, Trash2, Hash, BookOpen } from 'lucide-react';
import { formatDuration } from '../utils/helpers';

export default function VideoCard({ video, onToggleComplete, onUpdateNotes, onDelete, sequenceNumber }) {
  const isYouTube = video.platform === 'YouTube';
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(video.notes || '');
  const [isToggling, setIsToggling] = useState(false);

  // ✅ FIX: Always use _id first (MongoDB), fallback to id
  const videoId = video._id || video.id;

  const saveNotes = () => {
    onUpdateNotes(videoId, notes);
    setShowNotes(false);
  };

  const handleToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      await onToggleComplete(videoId);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className={`video-card p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden backdrop-blur-sm transition-all duration-300
      ${video.completed
        ? 'glass-card opacity-80 border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10'
        : 'glass-card bg-white/70 dark:bg-slate-800/70 hover:bg-white/90 dark:hover:bg-slate-800/90'
      }`}
    >
      {/* Decorative top border */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${video.completed ? 'bg-green-400' : 'bg-gradient-to-r from-orange-400 to-amber-400'}`} />

      {/* Sequence number badge */}
      {sequenceNumber !== undefined && (
        <div className={`absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black z-10 ${video.completed ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400'}`}>
          {sequenceNumber}
        </div>
      )}

      {/* Video Thumbnail / Header */}
      <div className="flex gap-4">
        {video.thumbnail && (
          <a href={video.link} target="_blank" rel="noreferrer" className="flex-shrink-0 group relative rounded-xl overflow-hidden block w-24 h-16 bg-slate-200 dark:bg-slate-700">
            <img src={video.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              {formatDuration(video.duration) || '🔗'}
            </div>
          </a>
        )}
        
        <div className={`flex-1 min-w-0 flex justify-between items-start gap-4 ${sequenceNumber !== undefined ? 'pl-5' : ''}`}>
          <h3 className={`font-semibold text-base leading-tight line-clamp-2 flex-1 mt-1 ${video.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
            <a href={video.link} target="_blank" rel="noreferrer" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
              {video.title}
            </a>
          </h3>
          <div className="flex-shrink-0 mt-1">
            <a href={video.link} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 hover:bg-orange-100 dark:hover:bg-slate-600 transition-colors inline-block group">
              {isYouTube ? (
                <Youtube className="text-red-500 group-hover:scale-110 transition-transform" size={20} />
              ) : video.platform === 'Telegram' ? (
                <Send className="text-sky-500 group-hover:scale-110 transition-transform" size={20} />
              ) : (
                <div className="w-5 h-5 rounded-full bg-orange-200 dark:bg-slate-600 group-hover:scale-110 transition-transform" />
              )}
            </a>
          </div>
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-2 items-center text-xs mt-auto pt-2 border-t border-slate-100 dark:border-slate-700/50">
        <span className="badge bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 shadow-sm border border-orange-200/50 dark:border-orange-800/50 flex items-center gap-1">
          <BookOpen size={10} /> {video.course}
        </span>
        {video.tag && (
          <span className="badge bg-amber-50 dark:bg-slate-700 text-amber-700 dark:text-slate-300 border border-amber-200/50 dark:border-slate-600 flex items-center gap-1">
            <Hash size={10} />{video.tag}
          </span>
        )}
        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 ml-auto font-medium">
          <Clock size={13} />
          {formatDuration(video.duration)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onDelete && onDelete(videoId)}
          title="Delete Video"
          className="flex-shrink-0 w-11 py-2.5 rounded-xl border flex items-center justify-center transition-colors shadow-sm bg-white dark:bg-slate-800 border-red-200 dark:border-red-900/50 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 size={18} />
        </button>
        <button
          onClick={() => setShowNotes(!showNotes)}
          title="Notes"
          className={`flex-shrink-0 w-11 py-2.5 rounded-xl border flex items-center justify-center transition-colors shadow-sm
            ${showNotes 
              ? 'bg-orange-500 text-white border-orange-500 glow-orange' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 hover:border-orange-200 dark:hover:border-slate-600'
            }`}
        >
          <FileText size={18} />
        </button>
        <button
          onClick={handleToggle}
          disabled={isToggling}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm
            ${video.completed
              ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
              : 'btn-primary border border-transparent'
            } ${isToggling ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {isToggling ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : video.completed ? (
            <><Check size={16} strokeWidth={3} /> Completed</>
          ) : (
            <><CheckCircle2 size={16} /> Mark as Done</>
          )}
        </button>
      </div>

      {/* Notes text area */}
      {showNotes && (
        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 slide-in">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add your study notes here..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 dark:text-white min-h-[80px] transition-shadow shadow-inner resize-none"
          />
          <button
            onClick={saveNotes}
            className="mt-2 w-full text-xs font-bold uppercase tracking-wider bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-4 py-2 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors border border-orange-200 dark:border-orange-800/50"
          >
            Save Notes
          </button>
        </div>
      )}
    </div>
  );
}

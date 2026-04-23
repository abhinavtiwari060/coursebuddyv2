import React from 'react';
import { Play, Clock, Calendar, Database, CheckCircle2, ChevronRight, ExternalLink } from 'lucide-react';

export default function TelegramVideoRow({ video, onPlay }) {
  // Convert duration to mm:ss
  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formattedDate = new Date(video.upload_time).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  });
  
  const syncDate = new Date(video.sync_date).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleOpenTelegram = (e) => {
    e.stopPropagation();
    window.location.href = video.telegram_link;
  };

  return (
    <div 
      className="group flex flex-col sm:flex-row bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl hover:border-indigo-500/30 transition-all cursor-pointer mb-4"
      onClick={() => onPlay(video)}
    >
      {/* Thumbnail column (Left) */}
      <div className="relative w-full sm:w-64 md:w-72 aspect-video bg-slate-900 overflow-hidden flex-shrink-0">
        {video.thumbnail ? (
          <img 
            src={`${API_URL}/api/telegram/thumb/${video.thumbnail.split(/[\/\\]/).pop()}`}
            alt="Thumbnail" 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-indigo-900/40">
            <Play size={48} className="text-white/20" />
          </div>
        )}
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 flex items-center justify-center transition-colors">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center scale-90 group-hover:scale-110 transition-transform">
            <Play size={24} className="text-white ml-1" />
          </div>
        </div>
      </div>

      {/* Metadata Column (Center to Right) */}
      <div className="p-5 flex flex-col flex-1 min-w-0">
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight mb-3 group-hover:text-indigo-500 transition-colors">
          {video.caption || 'Telegram Video'}
        </h3>
        
        {/* Chips row */}
        <div className="flex flex-wrap gap-2 mb-auto pb-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-1 rounded-lg">
            {video.channel_name || 'Channel'}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Clock size={12} className="text-slate-400" /> {formatDuration(video.duration)}
          </span>
          {video.size_mb > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <Database size={12} className="text-slate-400" /> {video.size_mb} MB
            </span>
          )}
        </div>
        
        {/* Footer info & Button Row */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-200 dark:border-slate-700/50">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs text-slate-500">
             <span className="flex items-center gap-1"><Calendar size={12}/> {formattedDate}</span>
             <span className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400"><CheckCircle2 size={12}/> Synced: {syncDate}</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleOpenTelegram}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-1 transition-colors"
            >
              Open in Telegram <ExternalLink size={12} />
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
               <ChevronRight size={16} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

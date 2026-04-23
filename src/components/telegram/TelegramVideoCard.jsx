import React from 'react';
import { Play, Clock, Calendar } from 'lucide-react';

export default function TelegramVideoCard({ video, onPlay }) {
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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  return (
    <div 
      className="group relative bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all cursor-pointer hover:-translate-y-1"
      onClick={() => onPlay(video)}
    >
      {/* Thumbnail Area */}
      <div className="relative aspect-video bg-slate-900 overflow-hidden">
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
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center transition-colors">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center scale-90 group-hover:scale-110 transition-transform">
            <Play size={24} className="text-white ml-1" />
          </div>
        </div>

        {/* Duration Badge */}
        {video.duration > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur px-2 py-1 rounded text-xs font-medium text-white flex items-center gap-1">
            <Clock size={12} /> {formatDuration(video.duration)}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-2 text-sm leading-tight mb-2 group-hover:text-indigo-500 transition-colors">
          {video.caption || 'Telegram Video'}
        </h3>
        
        <div className="flex flex-col gap-1.5 mt-3 border-t border-slate-200/50 dark:border-slate-700/50 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
              {video.channel_name || 'Channel'}
            </span>
            <div className="flex items-center text-slate-400 text-xs gap-1">
              <Calendar size={12} />
              {formattedDate}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

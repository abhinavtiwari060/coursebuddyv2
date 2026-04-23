import React, { useState } from 'react';
import { Play, Clock, Calendar, Database, CheckCircle2, ChevronRight, ExternalLink, Send } from 'lucide-react';

/**
 * Smart Telegram deep-link opener.
 * Priority: telegramDeepLink → telegramPrivateLink → telegramWebLink → telegram_link (legacy)
 *
 * Strategy:
 *  1. Set window.location.href to the tg:// deep link (opens Telegram app instantly if installed).
 *  2. After 1.5 s, if the page is still visible (app didn't steal focus), fall back to the web URL.
 */
function openInTelegram(video) {
  const deepLink    = video.telegramDeepLink;
  const privateLink = video.telegramPrivateLink;
  const webLink     = video.telegramWebLink || video.telegram_link;

  // Best native deep link available
  const nativeLink  = deepLink || privateLink || null;
  // Best web fallback
  const fallback    = webLink || privateLink || null;

  if (!nativeLink && !fallback) return;

  if (nativeLink) {
    // Try the tg:// scheme
    window.location.href = nativeLink;

    // After 1.5 s check whether the page/tab is still active.
    // If the Telegram app intercepted the URL the page usually goes into
    // a "hidden" or "blurred" state, so we skip the redirect.
    const start = Date.now();
    const timer = setTimeout(() => {
      // Only fallback if we're still the focused tab AND the deep link was given time
      if (Date.now() - start < 2000 && fallback && !document.hidden) {
        window.open(fallback, '_blank', 'noopener,noreferrer');
      }
    }, 1500);

    // If the user comes back to the tab later the timer was already cleared no-op
    const cleanup = () => clearTimeout(timer);
    window.addEventListener('blur', cleanup, { once: true });
  } else if (fallback) {
    window.open(fallback, '_blank', 'noopener,noreferrer');
  }
}

export default function TelegramVideoRow({ video, onPlay }) {
  const [opening, setOpening] = useState(false);

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

  const isPublic  = !!(video.telegramDeepLink && video.telegramDeepLink.startsWith('tg://resolve'));
  const isPrivate = !!(video.telegramPrivateLink && video.channel_username == null);

  const handleOpenTelegram = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setOpening(true);
    openInTelegram(video);
    setTimeout(() => setOpening(false), 2000);
  };

  return (
    <div
      className="group flex flex-col sm:flex-row bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl hover:border-indigo-500/30 transition-all cursor-pointer mb-4"
      onClick={() => onPlay(video)}
    >
      {/* Thumbnail column */}
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

        {/* Channel type badge */}
        <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm border ${
          isPublic
            ? 'bg-green-500/80 border-green-400/50 text-white'
            : 'bg-amber-500/80 border-amber-400/50 text-white'
        }`}>
          {isPublic ? '🔓 Public' : '🔒 Private'}
        </div>
      </div>

      {/* Metadata column */}
      <div className="p-5 flex flex-col flex-1 min-w-0">
        {/* Title */}
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight mb-3 group-hover:text-indigo-500 transition-colors">
          {video.caption || 'Telegram Video'}
        </h3>

        {/* Chips */}
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

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-200 dark:border-slate-700/50 gap-3 flex-wrap">
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Calendar size={12} /> {formattedDate}</span>
            <span className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400"><CheckCircle2 size={12} /> Synced: {syncDate}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Smart deep link button */}
            <button
              onClick={handleOpenTelegram}
              disabled={opening}
              className={`relative text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all duration-200 overflow-hidden
                ${opening
                  ? 'bg-indigo-500 text-white scale-95'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/30'
                }`}
            >
              {opening ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Opening…
                </>
              ) : (
                <>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" alt="" className="w-3.5 h-3.5" />
                  Open in Telegram
                  <ExternalLink size={11} />
                </>
              )}
            </button>

            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors flex-shrink-0">
              <ChevronRight size={16} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

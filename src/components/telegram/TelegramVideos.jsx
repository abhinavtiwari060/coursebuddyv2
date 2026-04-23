import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Phone, History, Video as VideoIcon } from 'lucide-react';
import { telegramService } from '../../api/api';
import TelegramApp from '../../pages/TelegramApp'; // Legacy OTP widget
import TelegramVideoCard from './TelegramVideoCard';
import TelegramPlayer from './TelegramPlayer';

export default function TelegramVideos() {
  const [status, setStatus] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [search, setSearch] = useState('');
  const [activePlayerVideo, setActivePlayerVideo] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await telegramService.getStatus();
      setStatus(res);
      if (res.connected) {
        fetchVideos();
      }
    } catch (err) {
      setError("Failed to reach Telegram Service. It may be offline.");
    } finally {
      setLoading(false);
    }
  };

  const fetchVideos = async () => {
    try {
      const vids = await telegramService.getVideos();
      setVideos(vids);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 animate-pulse">Checking Telegram connectivity...</div>;
  }

  if (error) {
    return <div className="p-12 text-center text-red-500 font-medium bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">{error}</div>;
  }

  // NeedOTP
  if (!status?.connected) {
    return (
      <div className="w-full">
        <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800">
          <h2 className="text-xl font-bold text-indigo-700 dark:text-indigo-400 mb-2">Connect Telegram Account</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            You need to authenticate to sync videos from your Telegram channels into your permanent library.
          </p>
        </div>
        <TelegramApp onConnected={fetchStatus} />
      </div>
    );
  }

  // Logged In
  const filtered = videos.filter(v => 
    (v.caption?.toLowerCase().includes(search.toLowerCase())) ||
    (v.channel_name?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="w-full space-y-6">
      {/* Account Status Hero */}
      <div className="glass-card p-6 rounded-3xl bg-gradient-to-r from-blue-500 to-indigo-600 overflow-hidden relative shadow-lg">
        {/* Abstract background blobs */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-900/40 rounded-full blur-3xl"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" alt="Telegram" className="w-8 h-8 drop-shadow-md" />
              Telegram Library Active
            </h2>
            <p className="text-blue-100 flex items-center gap-2 text-sm">
              <Phone size={14} /> {status.phone || 'Connected'}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="bg-black/20 backdrop-blur px-4 py-3 rounded-2xl border border-white/10 flex flex-col items-center">
              <span className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><VideoIcon size={12}/> Synced Videos</span>
              <span className="text-2xl font-black text-white leading-none">{videos.length}</span>
            </div>
            <div className="bg-black/20 backdrop-blur px-4 py-3 rounded-2xl border border-white/10 flex flex-col items-center">
              <span className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><History size={12}/> Last Sync</span>
              <span className="text-lg font-bold text-white leading-none">
                {status.last_sync ? new Date(status.last_sync*1000).toLocaleTimeString([],{hour: '2-digit', minute:'2-digit'}) : 'Never'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search captions or channels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
          />
        </div>
        <button 
          onClick={fetchVideos}
          className="btn-secondary rounded-xl px-5 py-2.5 text-sm font-bold flex items-center gap-2"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
         <div className="py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
           <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
             <VideoIcon size={28} />
           </div>
           <p className="text-slate-500 font-medium">No videos found</p>
           {search && <p className="text-slate-400 text-sm mt-1">Try clearing your search filters</p>}
         </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map(video => (
            <TelegramVideoCard key={video.video_id} video={video} onPlay={setActivePlayerVideo} />
          ))}
        </div>
      )}

      {/* Player Modal */}
      <TelegramPlayer video={activePlayerVideo} onClose={() => setActivePlayerVideo(null)} />
    </div>
  );
}

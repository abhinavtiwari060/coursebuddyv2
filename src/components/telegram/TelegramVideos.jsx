import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Phone, History, Video as VideoIcon } from 'lucide-react';
import { telegramService } from '../../api/api';
import TelegramApp from '../../pages/TelegramApp'; // Legacy OTP widget
import TelegramVideoRow from './TelegramVideoRow';
import TelegramPlayer from './TelegramPlayer';
import TelegramSyncProgress from './TelegramSyncProgress';

export default function TelegramVideos() {
  const [status, setStatus] = useState(null);
  const [videos, setVideos] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [search, setSearch] = useState('');
  const [activePlayerVideo, setActivePlayerVideo] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const observerRef = React.useRef(null);
  const listRef = React.useRef(null);

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
        fetchChannels();
        // Silently backfill deep-link fields for pre-existing records
        telegramService.backfillLinks().catch(() => {});
      }
    } catch (err) {
      setError("Failed to reach Telegram Service. It may be offline.");
    } finally {
      setLoading(false);
    }
  };

  const fetchVideos = async (pageToLoad = 1, append = false) => {
    try {
      if (pageToLoad === 1) setLoading(true);
      else setLoadingMore(true);
      
      const res = await telegramService.getVideos(pageToLoad, 10);
      
      if (append) {
        setVideos(prev => [...prev, ...res.videos]);
      } else {
        setVideos(res.videos);
      }
      
      setHasMore(res.hasMore);
      setPage(res.page);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleBatchCompleted = async () => {
    // Just fetch the first page and merge uniquely on top.
    try {
      const res = await telegramService.getVideos(1, 10);
      setVideos(prev => {
        const existingIds = new Set(prev.map(v => v.video_id));
        const newVids = res.videos.filter(v => !existingIds.has(v.video_id));
        return [...newVids, ...prev];
      });
    } catch(err) {
      console.error(err);
    }
  };

  const handleObserver = (entries) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !loadingMore && status?.connected) {
      fetchVideos(page + 1, true);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 1.0 });
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, page, status]);

  const fetchChannels = async () => {
    try {
      const chans = await telegramService.getChannels();
      setChannels(chans);
      if (chans.length > 0) setSelectedChannel(chans[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefresh = async () => {
    await fetchVideos();
    if (listRef.current) {
      listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Sync completion handler
  const handleSyncComplete = () => {
    setIsSyncing(false);
    handleRefresh();
  };

  const executeManualSync = async () => {
    if (!selectedChannel) return;
    try {
      setIsSyncing(true);
      await telegramService.syncChannel(selectedChannel);
    } catch (err) {
      console.error("Manual sync failed to start", err);
      setIsSyncing(false);
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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-16 z-20 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search captions or channels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <select 
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 w-32 md:w-48 truncate outline-none"
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            disabled={isSyncing || channels.length === 0}
          >
            {channels.length === 0 ? <option value="">Loading...</option> : null}
            {channels.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <button 
            disabled={isSyncing || !selectedChannel}
            onClick={executeManualSync}
            className="btn-primary rounded-xl px-4 sm:px-5 py-2.5 text-sm font-bold flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
          >
            {isSyncing ? "Syncing..." : "Manual Sync"}
          </button>
          <button 
            disabled={isSyncing || loading}
            onClick={handleRefresh}
            className="btn-secondary rounded-xl px-4 sm:px-5 py-2.5 text-sm font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>
      
      {/* Progress Polling Component - Stuck to the top so you can scroll list */}
      <div className="sticky top-[140px] z-10 w-full">
         {isSyncing && <TelegramSyncProgress onComplete={handleSyncComplete} onBatchComplete={handleBatchCompleted} />}
      </div>

      {/* List */}
      <div ref={listRef} className="pt-2" />
      {filtered.length === 0 ? (
         <div className="py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
           <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
             <VideoIcon size={28} />
           </div>
           <p className="text-slate-500 font-medium">No videos found</p>
           {search && <p className="text-slate-400 text-sm mt-1">Try clearing your search filters</p>}
         </div>
      ) : (
        <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full pb-10">
          {filtered.map(video => (
            <TelegramVideoRow key={video.video_id} video={video} onPlay={setActivePlayerVideo} />
          ))}
          
          {/* Infinite Scroll Trigger */}
          {hasMore && (
            <div ref={observerRef} className="w-full flex items-center justify-center p-6">
               <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin"></div>
            </div>
          )}
          {!hasMore && filtered.length > 10 && (
             <div className="text-center p-6 text-slate-500 font-medium">You've reached the end of your library.</div>
          )}
        </div>
      )}

      {/* Player Modal */}
      <TelegramPlayer video={activePlayerVideo} onClose={() => setActivePlayerVideo(null)} />
    </div>
  );
}

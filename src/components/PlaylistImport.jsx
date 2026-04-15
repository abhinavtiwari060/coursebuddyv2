import { useState } from 'react';
import { ListVideo, Download, Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Youtube, Clock } from 'lucide-react';
import { formatDuration } from '../utils/helpers';

// ── helpers ──────────────────────────────────────────────────────────────────
function extractPlaylistId(url) {
  try {
    const u = new URL(url);
    if (u.searchParams.has('list')) return u.searchParams.get('list');
    return null;
  } catch {
    const match = url.match(/[?&]list=([^&]+)/);
    return match ? match[1] : null;
  }
}

// Helper to parse YouTube ISO 8601 duration (e.g. PT1H2M10S) to total seconds
function parseISO8601Duration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  return (hours * 3600) + (minutes * 60) + seconds;
}

// Use YouTube API v3 to fetch videos and their durations
// Make sure to add VITE_YOUTUBE_API_KEY=your_api_key in a .env file!
async function fetchPlaylistVideosWithTime(playlistId) {
  const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

  if (!API_KEY) {
    throw new Error('API Key missing. Please add VITE_YOUTUBE_API_KEY to your .env file.');
  }

  // 1. Fetch Playlist Items
  const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${API_KEY}`;
  const plRes = await fetch(playlistUrl);
  if (!plRes.ok) throw new Error('Failed to fetch playlist or playlist is private.');
  const plData = await plRes.json();

  if (!plData.items || plData.items.length === 0) {
    throw new Error('No videos found in this playlist.');
  }

  const items = plData.items;
  const videoIds = items.map(item => item.contentDetails.videoId);

  // 2. Fetch Video Details (to get contentDetails.duration)
  // Can only query 50 ids at a time, but since our maxResults above is 50, one call is enough.
  const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(',')}&key=${API_KEY}`;
  const vidRes = await fetch(videosUrl);
  if (!vidRes.ok) throw new Error('Failed to fetch video details.');
  const vidData = await vidRes.json();

  // Create a map of videoId -> duration in seconds
  const durationMap = {};
  vidData.items?.forEach(v => {
    durationMap[v.id] = parseISO8601Duration(v.contentDetails.duration);
  });

  return items.map((item, idx) => {
    const videoId = item.contentDetails.videoId;
    const title = item.snippet.title;
    const link = `https://www.youtube.com/watch?v=${videoId}`;
    const thumbnail = item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
    const duration = durationMap[videoId] || 0;

    return { videoId, title, link, thumbnail, duration };
  });
}

// ── component ─────────────────────────────────────────────────────────────────
export default function PlaylistImport({ courses, onAddVideo }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videos, setVideos] = useState([]);
  const [course, setCourse] = useState('');
  const [importing, setImporting] = useState(new Set());
  const [imported, setImported] = useState(new Set());
  const [expanded, setExpanded] = useState(true);

  const handleFetch = async () => {
    setError('');
    setVideos([]);
    setImported(new Set());
    const playlistId = extractPlaylistId(url);
    if (!playlistId) { setError('Could not find a playlist ID in that URL. Make sure it contains ?list=...'); return; }
    setLoading(true);
    try {
      const vids = await fetchPlaylistVideosWithTime(playlistId);
      setVideos(vids);
      setExpanded(true);
    } catch (err) {
      setError(err.message || 'Error communicating with YouTube API');
    } finally {
      setLoading(false);
    }
  };

  const importVideo = (vid) => {
    if (!course) { setError('Please select a course before importing.'); return; }
    if (imported.has(vid.videoId)) return;
    setImporting(prev => new Set([...prev, vid.videoId]));
    setTimeout(() => {
      onAddVideo({
        id: `yt_${vid.videoId}_${Date.now()}`,
        title: vid.title,
        link: vid.link,
        platform: 'YouTube',
        duration: vid.duration, // ⏳ Now we actually have the exact time!
        course,
        tag: 'playlist',
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
        notes: '',
        order: Date.now(),
        thumbnail: vid.thumbnail,
      });
      setImporting(prev => { const s = new Set(prev); s.delete(vid.videoId); return s; });
      setImported(prev => new Set([...prev, vid.videoId]));
    }, 300);
  };

  const importAll = () => {
    if (!course) { setError('Please select a course before importing.'); return; }
    videos.forEach(v => importVideo(v));
  };

  const notImported = videos.filter(v => !imported.has(v.videoId));

  return (
    <div className="glass-card rounded-3xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-bl-full pointer-events-none" />

      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-6 bg-transparent text-slate-800 dark:text-white"
      >
        <span className="flex items-center gap-2 font-bold text-xl relative z-10">
          <ListVideo size={24} className="text-indigo-500" />
          Playlist Importer
        </span>
        {expanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 tracking-wide font-medium relative z-10 -mt-2">
            Paste a YouTube playlist link to auto-fetch videos + duration.
          </p>

          {/* URL input row */}
          <div className="flex flex-col sm:flex-row gap-2 relative z-10">
            <input
              type="url"
              placeholder="https://youtube.com/playlist?list=..."
              value={url}
              onChange={e => { setUrl(e.target.value); setError(''); }}
              className="flex-1 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm transition-shadow"
            />
            <button
              onClick={handleFetch}
              disabled={loading || !url.trim()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-colors shadow-sm shadow-indigo-500/20 whitespace-nowrap"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {loading ? 'Fetching…' : 'Fetch'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-sm relative z-10 border border-red-100 dark:border-red-900/30">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Results */}
          {videos.length > 0 && (
            <div className="relative z-10 border-t border-slate-100 dark:border-slate-700/50 pt-4 mt-2">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {videos.length} videos found
                  {imported.size > 0 && <span className="ml-2 text-green-600 dark:text-green-400">· {imported.size} imported</span>}
                </span>

                {/* Course selector + Import All */}
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  <select
                    value={course}
                    onChange={e => { setCourse(e.target.value); setError(''); }}
                    className="flex-1 sm:flex-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  >
                    <option value="">Select course…</option>
                    {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  {notImported.length > 0 && (
                    <button
                      onClick={importAll}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                    >
                      <Download size={14} /> Import All ({notImported.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Video list */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scroll">
                {videos.map((vid, idx) => {
                  const done = imported.has(vid.videoId);
                  const busy = importing.has(vid.videoId);
                  return (
                    <div
                      key={vid.videoId}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${done
                          ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800/40'
                          : 'border-slate-100 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800'
                        }`}
                    >
                      {/* Thumbnail & duration overlay */}
                      <a href={vid.link} target="_blank" rel="noreferrer" className="relative w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-700 group block">
                        <img src={vid.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                          {formatDuration(vid.duration)}
                        </div>
                      </a>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium line-clamp-2 leading-tight mb-1 ${done ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-white'}`}>
                          {vid.title}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {done ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 text-green-600 dark:text-green-400 text-xs font-bold uppercase tracking-wider bg-green-100/50 dark:bg-green-900/30 rounded-lg">
                            <CheckCircle2 size={14} /> Added
                          </span>
                        ) : (
                          <button
                            onClick={() => importVideo(vid)}
                            disabled={busy}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold tracking-wider transition-colors disabled:opacity-50 border border-indigo-200/50 dark:border-indigo-800/50"
                          >
                            {busy ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} strokeWidth={2.5} />}
                            {busy ? '…' : 'ADD'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

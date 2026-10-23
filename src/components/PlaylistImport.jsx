import { useState, useEffect } from 'react';
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

import { videoService } from '../api/api';

// ── component ─────────────────────────────────────────────────────────────────
export default function PlaylistImport({ courses = [], onAddVideo, onAdd, onClose, onDirtyChange, onSuccess }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [videos, setVideos] = useState([]);
  const [course, setCourse] = useState('');
  const [importing, setImporting] = useState(new Set());
  const [imported, setImported] = useState(new Set());
  const [skipped, setSkipped] = useState(new Set());
  const [importingAll, setImportingAll] = useState(false);

  const addHandler = onAddVideo || onAdd;

  // Automatically select first course if available
  useEffect(() => {
    if (!course && courses.length > 0) {
      setCourse(courses[0].name || courses[0]._id);
    }
  }, [courses, course]);

  // Track dirty state
  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(Boolean(url.trim() || videos.length > 0));
    }
  }, [url, videos, onDirtyChange]);

  const handleFetch = async () => {
    setError('');
    setSuccessMessage('');
    setVideos([]);
    setImported(new Set());
    setSkipped(new Set());
    const playlistId = extractPlaylistId(url);
    if (!playlistId) { setError('Could not find a playlist ID in that URL. Make sure it contains ?list=...'); return; }
    setLoading(true);
    try {
      const vids = await fetchPlaylistVideosWithTime(playlistId);
      setVideos(vids);
    } catch (err) {
      setError(err.message || 'Error communicating with YouTube API');
    } finally {
      setLoading(false);
    }
  };

  const importAll = async () => {
    if (!course) { setError('Please select a course before importing.'); return; }
    setError('');
    setSuccessMessage('');
    setImportingAll(true);

    try {
      const selectedCourseObj = courses.find(c => c.name === course || c._id === course);
      const res = await videoService.importPlaylist({
        courseId: selectedCourseObj?._id,
        courseName: selectedCourseObj?.name || course,
        playlistId: extractPlaylistId(url) || '',
        videos: videos.map((v, idx) => ({
          title: v.title,
          link: v.link,
          youtubeVideoId: v.videoId,
          duration: v.duration,
          thumbnail: v.thumbnail,
          position: idx
        }))
      });

      const newlyAddedYtIds = (res.addedVideos || []).map(v => v.youtubeVideoId).filter(Boolean);
      const skippedYtIds = (res.skippedVideos || []).map(v => v.youtubeVideoId).filter(Boolean);

      setImported(prev => new Set([...prev, ...newlyAddedYtIds]));
      setSkipped(prev => new Set([...prev, ...skippedYtIds]));

      setSuccessMessage(res.message || `Successfully imported ${res.addedCount} lessons. ${res.skippedCount} duplicate(s) skipped.`);

      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to import playlist lessons');
    } finally {
      setImportingAll(false);
    }
  };

  const importVideo = async (vid, customOrder = null) => {
    if (!course) { setError('Please select a course before importing.'); return; }
    if (imported.has(vid.videoId) || skipped.has(vid.videoId)) return;
    setError('');
    setImporting(prev => new Set([...prev, vid.videoId]));

    const selectedCourseObj = courses.find(c => c.name === course || c._id === course);

    const payload = {
      title: vid.title,
      link: vid.link,
      youtubeVideoId: vid.videoId,
      platform: 'YouTube',
      duration: vid.duration,
      course: selectedCourseObj?.name || course,
      courseId: selectedCourseObj?._id,
      tag: 'playlist',
      completed: false,
      notes: '',
      thumbnail: vid.thumbnail,
      order: customOrder || Date.now()
    };

    try {
      if (addHandler) {
        await addHandler(payload);
      } else {
        await videoService.create(payload);
      }
      setImported(prev => new Set([...prev, vid.videoId]));
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.duplicate) {
        // Genuine duplicate in this course
        setSkipped(prev => new Set([...prev, vid.videoId]));
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to add lesson');
      }
    } finally {
      setImporting(prev => { const s = new Set(prev); s.delete(vid.videoId); return s; });
    }
  };

  const notImported = videos.filter(v => !imported.has(v.videoId) && !skipped.has(v.videoId));

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#78716C] leading-relaxed">
        Paste a public YouTube playlist link to auto-fetch all video lessons, order, and verified durations into your StudyMate curriculum.
      </p>

      {/* URL input row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          placeholder="https://youtube.com/playlist?list=PL..."
          value={url}
          onChange={e => { setUrl(e.target.value); setError(''); setSuccessMessage(''); }}
          className="flex-1 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C] text-[#431407] text-xs sm:text-sm"
        />
        <button
          type="button"
          onClick={handleFetch}
          disabled={loading || !url.trim()}
          className="clay-btn-primary flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold whitespace-nowrap shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {loading ? 'Fetching…' : 'Fetch Videos'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 text-red-700 bg-red-50 rounded-xl p-3 text-xs border border-red-200">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-start gap-2 text-green-800 bg-green-50 rounded-xl p-3 text-xs border border-green-200">
          <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-green-600" />
          <span className="font-bold">{successMessage}</span>
        </div>
      )}

      {/* Results */}
      {videos.length > 0 && (
        <div className="border-t border-[#FED7AA] pt-4 mt-2 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-black text-[#431407]">
              {videos.length} videos found
              {imported.size > 0 && (
                <span className="ml-2 text-green-700 font-bold">· {imported.size} imported</span>
              )}
              {skipped.size > 0 && (
                <span className="ml-2 text-amber-700 font-bold">· {skipped.size} skipped duplicates</span>
              )}
            </span>

            {/* Course selector + Import All */}
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <select
                value={course}
                onChange={e => { setCourse(e.target.value); setError(''); }}
                className="flex-1 sm:flex-none bg-[#FFF7ED] border border-[#FED7AA] rounded-xl px-3 py-1.5 text-xs font-bold text-[#431407] focus:outline-none"
              >
                <option value="">Select course track…</option>
                {courses.map(c => (
                  <option key={c.id || c._id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              {notImported.length > 0 && (
                <button
                  type="button"
                  onClick={importAll}
                  disabled={importingAll}
                  className="clay-btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {importingAll ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  {importingAll ? 'Importing…' : `Import All (${notImported.length})`}
                </button>
              )}
            </div>
          </div>

          {/* Video list */}
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {videos.map((vid) => {
              const done = imported.has(vid.videoId);
              const isSkipped = skipped.has(vid.videoId);
              const busy = importing.has(vid.videoId);
              return (
                <div
                  key={vid.videoId}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                    done
                      ? 'border-green-200 bg-green-50/60'
                      : isSkipped
                      ? 'border-amber-200 bg-amber-50/60'
                      : 'border-[#FED7AA]/60 bg-[#FFF7ED]/50 hover:bg-[#FFF7ED]'
                  }`}
                >
                  {/* Thumbnail & duration overlay */}
                  <a
                    href={vid.link}
                    target="_blank"
                    rel="noreferrer"
                    className="relative w-20 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 group block"
                  >
                    <img
                      src={vid.thumbnail}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-bold px-1 py-0.2 rounded">
                      {formatDuration(vid.duration)}
                    </div>
                  </a>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-bold line-clamp-2 leading-tight ${
                        done ? 'text-green-800' : isSkipped ? 'text-amber-800' : 'text-[#431407]'
                      }`}
                    >
                      {vid.title}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {done ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 text-green-700 text-[10px] font-black uppercase bg-green-100 rounded-lg">
                        <CheckCircle2 size={13} /> Added
                      </span>
                    ) : isSkipped ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 text-amber-700 text-[10px] font-black uppercase bg-amber-100 rounded-lg">
                        <CheckCircle2 size={13} /> In Course
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => importVideo(vid)}
                        disabled={busy || importingAll}
                        className="clay-btn-secondary text-[11px] px-3 py-1 flex items-center gap-1 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        {busy ? 'Adding' : 'Add'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer cancel button if onClose is provided */}
      {onClose && (
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#FED7AA]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#78716C] hover:text-[#431407] hover:bg-[#FFF7ED] rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

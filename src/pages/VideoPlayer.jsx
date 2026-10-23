import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { videoService, progressService, watchService } from '../api/api';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  PlayCircle, 
  List, 
  X, 
  BookOpen, 
  Clock, 
  FileText, 
  Save, 
  Sparkles,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { formatDuration } from '../utils/helpers';

export default function VideoPlayer() {
  const { courseId, videoId } = useParams();
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [activeWatchSec, setActiveWatchSec] = useState(0);

  // Playback session state
  const playerRef = useRef(null);
  const playerContainerRef = useRef(null);
  const sessionIdRef = useRef('sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
  const isPlayingRef = useRef(false);
  const timerRef = useRef(null);
  const unsentSecondsRef = useRef(0);
  const currentVideoRef = useRef(null);

  // Sync current video to ref
  useEffect(() => {
    currentVideoRef.current = currentVideo;
    if (currentVideo) {
      setNotes(currentVideo.notes || '');
    }
  }, [currentVideo]);

  // Load course videos sorted strictly by numeric sequence
  useEffect(() => {
    let cancelled = false;

    const loadVideos = async () => {
      setLoading(true);
      try {
        const allVideos = await videoService.getAll();
        const courseVideos = allVideos.filter(
          (v) =>
            v.courseId === courseId ||
            String(v.courseId) === courseId ||
            v.course === courseId ||
            v.courseName === courseId
        );

        // Sort strictly by source playlist position / order
        const sorted = [...courseVideos].sort((a, b) => {
          const posA = a.position !== undefined && a.position !== 0 ? a.position : (a.order || 0);
          const posB = b.position !== undefined && b.position !== 0 ? b.position : (b.order || 0);
          return posA - posB;
        });

        if (!cancelled) {
          setVideos(sorted);
          const active = sorted.find((v) => v._id === videoId) || sorted[0];
          setCurrentVideo(active);
        }
      } catch (err) {
        if (!cancelled) console.error('[VideoPlayer] Failed to load videos:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadVideos();
    return () => {
      cancelled = true;
    };
  }, [courseId, videoId]);

  // Flush accumulated watch time to backend
  const flushWatchHeartbeat = useCallback(async () => {
    const inc = unsentSecondsRef.current;
    if (inc < 3 || !currentVideoRef.current) return;

    unsentSecondsRef.current = 0;
    try {
      const player = playerRef.current;
      const currentPos = player && typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;
      const dur = player && typeof player.getDuration === 'function' ? player.getDuration() : (currentVideoRef.current.duration || 0);

      await watchService.heartbeat({
        sessionId: sessionIdRef.current,
        videoId: currentVideoRef.current._id,
        courseId,
        playlistId: currentVideoRef.current.playlistId || '',
        currentPosition: Math.round(currentPos),
        durationSeconds: Math.round(dur),
        incrementSeconds: inc,
      });
    } catch (err) {
      console.warn('[WatchTracking] Heartbeat failed:', err.message);
    }
  }, [courseId]);

  // Handle YouTube IFrame Player API initialization
  useEffect(() => {
    if (!currentVideo?.youtubeVideoId) return;

    let isDisposed = false;

    const initPlayer = () => {
      if (isDisposed || !window.YT || !window.YT.Player) return;

      // Destroy existing player if any
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch { /* ignore */ }
      }

      try {
        playerRef.current = new window.YT.Player('yt-player-container', {
          videoId: currentVideo.youtubeVideoId,
          playerVars: {
            autoplay: 1,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onStateChange: (event) => {
              if (isDisposed) return;
              const state = event.data;

              // YT.PlayerState.PLAYING === 1
              if (state === 1) {
                isPlayingRef.current = true;
                if (!timerRef.current) {
                  timerRef.current = setInterval(() => {
                    if (isPlayingRef.current) {
                      unsentSecondsRef.current += 1;
                      setActiveWatchSec((prev) => prev + 1);

                      // Send heartbeat every 10 seconds of verified active playback
                      if (unsentSecondsRef.current >= 10) {
                        flushWatchHeartbeat();
                      }
                    }
                  }, 1000);
                }
              } else {
                // Paused (2), Buffering (3), Ended (0), or Cued (5)
                isPlayingRef.current = false;
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
                flushWatchHeartbeat();

                // Video completed
                if (state === 0) {
                  handleComplete();
                }
              }
            },
          },
        });
      } catch (err) {
        console.error('[YouTubeAPI] Player setup error:', err);
      }
    };

    // Load YouTube API script if not loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else {
      initPlayer();
    }

    return () => {
      isDisposed = true;
      isPlayingRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      flushWatchHeartbeat();
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch { /* ignore */ }
      }
    };
  }, [currentVideo?.youtubeVideoId, flushWatchHeartbeat]);

  const handleComplete = async () => {
    if (!currentVideo) return;
    try {
      await videoService.markComplete(currentVideo._id);
      setVideos((vids) =>
        vids.map((v) => (v._id === currentVideo._id ? { ...v, completed: true } : v))
      );
      await progressService.save({
        courseId,
        lastVideoId: currentVideo._id,
        watchedVideoId: currentVideo._id,
      });
    } catch (err) {
      console.error('[VideoPlayer] Failed to mark complete:', err);
    }
  };

  const handleSaveNotes = async () => {
    if (!currentVideo) return;
    setSavingNotes(true);
    try {
      await videoService.saveNotes(currentVideo._id, notes);
    } catch (err) {
      console.error('[VideoPlayer] Failed to save notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const currentIndex = videos.findIndex((v) => v._id === currentVideo?._id);
  const prevVideo = currentIndex > 0 ? videos[currentIndex - 1] : null;
  const nextVideo = currentIndex < videos.length - 1 ? videos[currentIndex + 1] : null;

  const completedCount = videos.filter((v) => v.completed).length;
  const progressPercent = videos.length > 0 ? Math.round((completedCount / videos.length) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF7ED] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FED7AA] border-t-[#EA580C] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF7ED] flex flex-col font-sans">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#FED7AA] px-4 py-3 shadow-[1px_1px_4px_rgba(154,52,18,0.05)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={`/course/${courseId}`}
              className="p-2 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-[#C2410C] hover:bg-[#FED7AA]/50 transition"
              title="Back to Course"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-[#431407] truncate">
                {currentVideo?.title || 'Video Player'}
              </h1>
              {currentVideo?.course && (
                <p className="text-[11px] text-[#78716C] flex items-center gap-1">
                  <BookOpen size={11} className="text-[#EA580C]" /> {currentVideo.course}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live verified study time tracker badge */}
            <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF7ED] border border-[#FED7AA] text-xs font-bold text-[#EA580C]">
              <Clock size={13} />
              <span>Session: {formatDuration(activeWatchSec)}</span>
            </div>

            {/* Course progress meter */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-xs font-bold text-[#78716C]">
                {completedCount}/{videos.length} Done ({progressPercent}%)
              </div>
              <div className="w-24 clay-progress-track h-2">
                <div
                  className="clay-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-[#C2410C] hover:bg-[#FED7AA]/50 transition"
              title="Toggle Playlist Sidebar"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
        {/* Left: Video Player & Controls */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video Container */}
          <div className="w-full aspect-video clay-card overflow-hidden bg-black relative flex items-center justify-center">
            {currentVideo?.youtubeVideoId ? (
              <div id="yt-player-container" className="w-full h-full" />
            ) : (
              <div className="text-center text-white p-6">
                <PlayCircle size={48} className="mx-auto text-white/40 mb-2" />
                <p className="font-bold text-sm">No valid YouTube Video ID</p>
                {currentVideo?.link && (
                  <a
                    href={currentVideo.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#FB923C] hover:underline mt-2"
                  >
                    Open externally <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Player Navigation & Status Bar */}
          <div className="clay-card bg-white p-4 mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (prevVideo) navigate(`/course/${courseId}/video/${prevVideo._id}`);
                }}
                disabled={!prevVideo}
                className="clay-btn-secondary text-xs px-3.5 py-2 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft size={16} /> Previous Video
              </button>

              <button
                onClick={() => {
                  if (nextVideo) navigate(`/course/${courseId}/video/${nextVideo._id}`);
                }}
                disabled={!nextVideo}
                className="clay-btn-secondary text-xs px-3.5 py-2 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next Video <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleComplete}
                disabled={currentVideo?.completed}
                className={`text-xs px-4 py-2 font-bold rounded-xl flex items-center gap-1.5 transition ${
                  currentVideo?.completed
                    ? 'bg-green-100 text-green-800 border border-green-300 cursor-default'
                    : 'clay-btn-primary'
                }`}
              >
                <CheckCircle2 size={16} />
                {currentVideo?.completed ? 'Video Completed ✓' : 'Mark as Completed'}
              </button>

              <button
                onClick={async () => {
                  if (!currentVideo) return;
                  if (!window.confirm(`Are you sure you want to delete "${currentVideo.title}" from this course? This action cannot be undone.`)) return;
                  try {
                    await videoService.delete(currentVideo._id);
                    const remaining = videos.filter((v) => v._id !== currentVideo._id);
                    if (remaining.length > 0) {
                      const next = remaining.find((v) => !v.completed) || remaining[0];
                      setVideos(remaining);
                      navigate(`/course/${courseId}/video/${next._id}`, { replace: true });
                    } else {
                      navigate(`/course/${courseId}`, { replace: true });
                    }
                  } catch (err) {
                    alert(err.response?.data?.error || 'Failed to delete video');
                  }
                }}
                className="p-2 rounded-xl text-[#78716C] hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition"
                title="Delete this lesson"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Study Notes Card */}
          <div className="clay-card bg-white p-5 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#431407]">
                <FileText size={16} className="text-[#EA580C]" />
                <span>My Study Notes</span>
              </div>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="clay-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
              >
                <Save size={13} />
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
            <textarea
              rows={4}
              placeholder="Record key formulas, timestamps, and study reminders here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="clay-input text-xs leading-relaxed"
            />
          </div>
        </div>

        {/* Right: Playlist Sequence Sidebar */}
        {sidebarOpen && (
          <aside className="w-full lg:w-80 clay-card bg-white flex flex-col max-h-[720px] overflow-hidden">
            <div className="p-4 border-b border-[#FED7AA] bg-[#FFF7ED] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#431407]">
                  Playlist Sequence
                </h3>
                <p className="text-[11px] text-[#78716C]">
                  {videos.length} videos in original order
                </p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 text-[#78716C] hover:text-[#431407]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#FED7AA]/50 p-2 space-y-1">
              {videos.map((vid, idx) => {
                const isActive = vid._id === currentVideo?._id;
                const posNumber = vid.position !== undefined && vid.position !== 0 ? vid.position : idx + 1;

                return (
                  <button
                    key={vid._id}
                    onClick={() => navigate(`/course/${courseId}/video/${vid._id}`)}
                    className={`w-full text-left p-3 rounded-xl transition flex items-start gap-2.5 ${
                      isActive
                        ? 'bg-[#FFF7ED] border border-[#FED7AA] shadow-sm'
                        : 'hover:bg-[#FFF7ED]/50'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-[#EA580C] text-white'
                          : 'bg-white border border-[#FED7AA] text-[#78716C]'
                      }`}
                    >
                      {posNumber}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-bold line-clamp-2 ${
                          isActive ? 'text-[#EA580C]' : 'text-[#431407]'
                        }`}
                      >
                        {vid.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[#78716C]">
                        {vid.duration > 0 && (
                          <span>{formatDuration(vid.duration)}</span>
                        )}
                        {vid.completed && (
                          <span className="text-green-700 font-bold flex items-center gap-0.5">
                            <CheckCircle2 size={11} /> Done
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { videoService, courseService, progressService, watchService } from '../api/api';
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
  ExternalLink,
  Trash2,
  AlertCircle,
  Loader2,
  Check
} from 'lucide-react';
import { formatDuration } from '../utils/helpers';

// Helper to reliably extract the 11-character YouTube video ID
function extractYouTubeId(video) {
  if (!video) return null;
  const candidates = [video.youtubeVideoId, video.link];
  for (const str of candidates) {
    if (!str || typeof str !== 'string') continue;
    const s = str.trim();
    // 1. If starts with temporary frontend prefix yt_
    if (s.startsWith('yt_')) {
      const extracted = s.slice(3, 14);
      if (/^[a-zA-Z0-9_-]{11}$/.test(extracted)) return extracted;
    }
    // 2. Exact 11-character YouTube video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) {
      return s;
    }
    // 3. YouTube URL formats (watch?v=, youtu.be/, /embed/, /shorts/, /v/)
    const urlMatch = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|\/v\/)([a-zA-Z0-9_-]{11})/);
    if (urlMatch) return urlMatch[1];
  }
  return null;
}

export default function VideoPlayer() {
  const { courseId, videoId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [videos, setVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [savedNotesFeedback, setSavedNotesFeedback] = useState(false);
  const [activeWatchSec, setActiveWatchSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Playback session ref tracking for background heartbeats
  const sessionIdRef = useRef('sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
  const timerRef = useRef(null);
  const unsentSecondsRef = useRef(0);
  const currentVideoRef = useRef(null);
  const playerRef = useRef(null);
  const iframeRef = useRef(null);

  // Sync current video to ref and notes
  useEffect(() => {
    currentVideoRef.current = currentVideo;
    if (currentVideo) {
      setNotes(currentVideo.notes || '');
    }
    // Video switched: pause timer until playback resumes
    setIsPlaying(false);
  }, [currentVideo]);

  // Load course details and its videos from the backend
  useEffect(() => {
    let cancelled = false;

    const loadVideoPlayerData = async () => {
      setLoading(true);
      try {
        let resolvedCourse = null;
        let courseVideos = [];

        // 1. Primary: Fetch through courseService.getById(courseId)
        try {
          const courseData = await courseService.getById(courseId);
          if (courseData) {
            resolvedCourse = courseData;
            courseVideos = Array.isArray(courseData.videos) ? courseData.videos : [];
          }
        } catch (courseErr) {
          console.warn('[VideoPlayer] Course fetch error, falling back:', courseErr.message);
        }

        // 2. Fallback: Search all user videos if not populated
        if (courseVideos.length === 0) {
          const allVideos = await videoService.getAll().catch(() => []);
          courseVideos = allVideos.filter(
            (v) =>
              String(v.courseId) === String(courseId) ||
              v.course === courseId ||
              (resolvedCourse && (v.course === resolvedCourse.name || v.course === String(resolvedCourse._id)))
          );
        }

        // 3. Sort strictly by source playlist position / order
        const sorted = [...courseVideos].sort((a, b) => {
          const posA = a.position !== undefined && a.position !== 0 ? a.position : (a.order || 0);
          const posB = b.position !== undefined && b.position !== 0 ? b.position : (b.order || 0);
          return posA - posB;
        });

        if (cancelled) return;

        setCourse(resolvedCourse);
        setVideos(sorted);

        if (sorted.length > 0) {
          // Identify active video
          let active = null;
          if (videoId) {
            active = sorted.find((v) => String(v._id) === String(videoId) || v.youtubeVideoId === videoId);
          }

          if (!active) {
            // Check last watched from saved progress
            try {
              const prog = await progressService.get(resolvedCourse?._id || courseId);
              if (prog?.lastVideoId) {
                active = sorted.find((v) => String(v._id) === String(prog.lastVideoId));
              }
            } catch { /* ignore */ }
          }

          // Fallback to first incomplete video, or first video in playlist
          if (!active) {
            active = sorted.find((v) => !v.completed) || sorted[0];
          }

          setCurrentVideo(active);

          // Update URL if no videoId was provided in route
          if (!videoId && active && resolvedCourse) {
            navigate(`/course/${resolvedCourse._id}/video/${active._id}`, { replace: true });
          }
        } else {
          setCurrentVideo(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[VideoPlayer] Failed to load course and videos:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadVideoPlayerData();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  // Sync active video when videoId route param changes and videos are already loaded
  useEffect(() => {
    if (videoId && videos.length > 0) {
      const matched = videos.find((v) => String(v._id) === String(videoId) || v.youtubeVideoId === videoId);
      if (matched) {
        if (String(matched._id) !== String(currentVideo?._id)) {
          setCurrentVideo(matched);
          setActiveWatchSec(0);
        }
      } else {
        // Safe fallback if videoId in URL was not found in curriculum
        const fallback = videos.find((v) => !v.completed) || videos[0];
        if (fallback) {
          navigate(`/course/${course?._id || courseId}/video/${fallback._id}`, { replace: true });
        }
      }
    }
  }, [videoId, videos, course?._id, courseId, currentVideo?._id, navigate]);

  // Flush accumulated watch time to backend
  const flushWatchHeartbeat = useCallback(async () => {
    const inc = unsentSecondsRef.current;
    if (inc < 3 || !currentVideoRef.current) return;

    unsentSecondsRef.current = 0;
    try {
      await watchService.heartbeat({
        sessionId: sessionIdRef.current,
        videoId: currentVideoRef.current._id,
        courseId: course?._id || courseId,
        playlistId: currentVideoRef.current.playlistId || '',
        currentPosition: Math.round(activeWatchSec),
        durationSeconds: Math.round(currentVideoRef.current.duration || 0),
        incrementSeconds: inc,
      });
    } catch (err) {
      console.warn('[WatchTracking] Heartbeat notice:', err.message);
    }
  }, [courseId, course?._id, activeWatchSec]);

  // Initialize YouTube Iframe API player wrapper
  const initYTPlayer = useCallback(() => {
    if (typeof window === 'undefined' || !window.YT || !window.YT.Player || !iframeRef.current) return;

    try {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch { /* ignore */ }
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(iframeRef.current, {
        events: {
          onStateChange: (event) => {
            // window.YT.PlayerState: PLAYING = 1, PAUSED = 2, ENDED = 0
            if (event.data === 1) {
              setIsPlaying(true);
            } else if (event.data === 2 || event.data === 0) {
              setIsPlaying(false);
            }
          },
        },
      });
    } catch (err) {
      console.warn('[YTPlayer] Iframe binding note:', err?.message || err);
    }
  }, []);

  // Dynamically load YouTube IFrame API script and bind to ready event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!window.YT) {
      const existing = document.getElementById('youtube-iframe-api');
      if (!existing) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === 'function') prevReady();
      initYTPlayer();
    };

    if (window.YT && window.YT.Player) {
      initYTPlayer();
    }

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch { /* ignore */ }
        playerRef.current = null;
      }
    };
  }, [currentVideo?._id, initYTPlayer]);

  // Synchronize via YouTube iframe postMessage events for instant reactivity
  useEffect(() => {
    const handleWindowMessage = (event) => {
      if (!event.origin || (!event.origin.includes('youtube.com') && !event.origin.includes('youtube-nocookie.com'))) {
        return;
      }

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data) return;

        // 1. YouTube onStateChange event
        if (data.event === 'onStateChange') {
          if (data.info === 1) {
            setIsPlaying(true);
          } else if (data.info === 2 || data.info === 0) {
            setIsPlaying(false);
          }
        }
        // 2. YouTube infoDelivery event with playerState
        else if (data.event === 'infoDelivery' && data.info) {
          if (data.info.playerState === 1) {
            setIsPlaying(true);
          } else if (data.info.playerState === 2 || data.info.playerState === 0) {
            setIsPlaying(false);
          }
        }
      } catch {
        // Non-JSON message from external browser extensions, safely ignore
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, []);

  // Active study watch timer: runs ONLY while video is playing and document is visible
  useEffect(() => {
    // If paused, ended, or no video, clear any running interval immediately
    if (!isPlaying || !currentVideo) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      flushWatchHeartbeat();
      return;
    }

    // Video is playing: clear any stale timer and start fresh 1-second interval
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setInterval(() => {
      if (!document.hidden) {
        unsentSecondsRef.current += 1;
        setActiveWatchSec((prev) => prev + 1);

        if (unsentSecondsRef.current >= 10) {
          flushWatchHeartbeat();
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      flushWatchHeartbeat();
    };
  }, [isPlaying, currentVideo?._id, flushWatchHeartbeat]);

  const handleComplete = async () => {
    if (!currentVideo) return;
    try {
      await videoService.markComplete(currentVideo._id);
      setVideos((vids) =>
        vids.map((v) => (v._id === currentVideo._id ? { ...v, completed: true, completedAt: new Date().toISOString() } : v))
      );
      setCurrentVideo((prev) => ({ ...prev, completed: true, completedAt: new Date().toISOString() }));

      await progressService.save({
        courseId: course?._id || courseId,
        lastVideoId: currentVideo._id,
        watchedVideoId: currentVideo._id,
      });

      await videoService.checkCompletion(currentVideo._id).catch(() => {});
    } catch (err) {
      console.error('[VideoPlayer] Failed to mark complete:', err);
      alert(err.response?.data?.error || 'Failed to mark video as complete');
    }
  };

  const handleSaveNotes = async () => {
    if (!currentVideo) return;
    setSavingNotes(true);
    try {
      await videoService.saveNotes(currentVideo._id, notes);
      setSavedNotesFeedback(true);
      setTimeout(() => setSavedNotesFeedback(false), 2500);
    } catch (err) {
      console.error('[VideoPlayer] Failed to save notes:', err);
      alert('Failed to save study notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const currentIndex = videos.findIndex((v) => String(v._id) === String(currentVideo?._id));
  const prevVideo = currentIndex > 0 ? videos[currentIndex - 1] : null;
  const nextVideo = currentIndex >= 0 && currentIndex < videos.length - 1 ? videos[currentIndex + 1] : null;

  const completedCount = videos.filter((v) => v.completed).length;
  const progressPercent = videos.length > 0 ? Math.round((completedCount / videos.length) * 100) : 0;
  const activeYtId = extractYouTubeId(currentVideo);
  const isDirectVideoLink = Boolean(
    !activeYtId &&
    currentVideo?.link &&
    /\.(mp4|webm|ogg|m4v)(\?.*)?$/i.test(currentVideo.link)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF7ED] flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="animate-spin text-[#EA580C]" />
        <p className="text-xs font-bold text-[#78716C]">Loading StudyMate Video Player...</p>
      </div>
    );
  }

  // Helpful empty state when course has zero videos
  if (!loading && videos.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFF7ED] flex flex-col font-sans">
        <header className="bg-white border-b border-[#FED7AA] px-4 py-3 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <Link
              to={course ? `/course/${course._id}` : '/my-learning'}
              className="p-2 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-[#C2410C] hover:bg-[#FED7AA]/50 transition"
              title="Return to Course"
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-base font-bold text-[#431407]">
              {course?.name || 'Course Player'}
            </h1>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="clay-card bg-white p-8 max-w-lg w-full text-center rounded-3xl border border-[#FED7AA] shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center mx-auto mb-4 text-[#EA580C]">
              <BookOpen size={28} />
            </div>
            <h2 className="text-lg font-black text-[#431407]">No Lessons in this Course Yet</h2>
            <p className="text-xs sm:text-sm text-[#78716C] mt-2 leading-relaxed">
              This curriculum does not have any video lessons attached yet. You can add YouTube video lessons or import a full playlist from the course details page.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
              <Link
                to={`/course/${course?._id || courseId}`}
                className="clay-btn-primary w-full sm:w-auto text-xs px-5 py-2.5 flex items-center justify-center gap-2"
              >
                <ArrowLeft size={14} /> Go to Course Curriculum
              </Link>
              <Link
                to="/my-learning"
                className="clay-btn-secondary w-full sm:w-auto text-xs px-5 py-2.5 flex items-center justify-center gap-2"
              >
                My Learning
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF7ED] flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#FED7AA] px-4 py-3 shadow-[1px_1px_4px_rgba(154,52,18,0.05)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={course ? `/course/${course._id}` : `/course/${courseId}`}
              className="p-2 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-[#C2410C] hover:bg-[#FED7AA]/50 transition"
              title="Back to Course Details"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-[#431407] truncate">
                {currentVideo?.title || 'Video Player'}
              </h1>
              <p className="text-[11px] text-[#78716C] flex items-center gap-1 truncate">
                <BookOpen size={11} className="text-[#EA580C] flex-shrink-0" />
                <span className="truncate">{course?.name || currentVideo?.course || 'Curriculum'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live session time badge */}
            <div
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition ${
                isPlaying
                  ? 'bg-[#FFF7ED] border-[#EA580C] text-[#EA580C] shadow-xs'
                  : 'bg-white border-[#FED7AA] text-[#78716C]'
              }`}
              title={isPlaying ? 'Video playing - study timer running' : 'Video paused - study timer stopped'}
            >
              <Clock size={13} className={isPlaying ? 'animate-pulse text-[#EA580C]' : 'text-[#78716C]'} />
              <span>Session: {formatDuration(activeWatchSec)}</span>
              {!isPlaying && activeWatchSec > 0 && (
                <span className="text-[10px] font-semibold text-[#A8A29E] ml-0.5">(Paused)</span>
              )}
            </div>

            {/* Course progress indicator */}
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
        {/* Left Column: Video Player & Controls */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Responsive Video Container */}
          <div className="w-full aspect-video clay-card overflow-hidden bg-black relative flex items-center justify-center rounded-2xl shadow-md border border-[#FED7AA]">
            {activeYtId ? (
              <>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 pointer-events-none z-0">
                  <Loader2 size={32} className="animate-spin text-[#EA580C] mb-2" />
                  <span className="text-xs font-semibold">Loading video player...</span>
                </div>
                <iframe
                  ref={iframeRef}
                  id="studymate-yt-iframe"
                  key={activeYtId}
                  src={`https://www.youtube.com/embed/${activeYtId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}&rel=0&modestbranding=1`}
                  title={currentVideo?.title || 'YouTube Video Player'}
                  className="w-full h-full border-0 relative z-10"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  onLoad={initYTPlayer}
                />
              </>
            ) : isDirectVideoLink ? (
              <video
                src={currentVideo.link}
                controls
                autoPlay
                className="w-full h-full relative z-10"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
            ) : (
              <div className="text-center text-white p-6 max-w-md">
                <AlertCircle size={44} className="mx-auto text-amber-400 mb-3" />
                <h3 className="font-bold text-sm sm:text-base text-white">Video Source Unavailable</h3>
                <p className="text-xs text-white/70 mt-1 leading-relaxed">
                  This lesson does not have a valid YouTube video ID or embedding source.
                </p>
                {currentVideo?.link && (
                  <a
                    href={currentVideo.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#FB923C] hover:text-white font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl mt-3 transition"
                  >
                    Open Original Link <ExternalLink size={13} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Player Navigation & Status Bar */}
          <div className="clay-card bg-white p-4 mt-4 rounded-2xl border border-[#FED7AA] flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (prevVideo) {
                    navigate(`/course/${course?._id || courseId}/video/${prevVideo._id}`);
                  }
                }}
                disabled={!prevVideo}
                className="clay-btn-secondary text-xs px-3.5 py-2 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-bold"
                title={prevVideo ? `Previous: ${prevVideo.title}` : 'No previous video'}
              >
                <ChevronLeft size={16} /> Previous Video
              </button>

              <button
                onClick={() => {
                  if (nextVideo) {
                    navigate(`/course/${course?._id || courseId}/video/${nextVideo._id}`);
                  }
                }}
                disabled={!nextVideo}
                className="clay-btn-secondary text-xs px-3.5 py-2 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-bold"
                title={nextVideo ? `Next: ${nextVideo.title}` : 'No next video'}
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

              {currentVideo?.link && (
                <a
                  href={currentVideo.link}
                  target="_blank"
                  rel="noreferrer"
                  className="clay-btn-secondary text-xs px-3 py-2 flex items-center gap-1 font-bold"
                  title="Open video on YouTube"
                >
                  <ExternalLink size={14} />
                  <span className="hidden sm:inline">YouTube</span>
                </a>
              )}

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
                      navigate(`/course/${course?._id || courseId}/video/${next._id}`, { replace: true });
                    } else {
                      navigate(`/course/${course?._id || courseId}`, { replace: true });
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
          <div className="clay-card bg-white p-5 mt-4 rounded-2xl border border-[#FED7AA] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#431407]">
                <FileText size={16} className="text-[#EA580C]" />
                <span>My Study Notes</span>
              </div>
              <div className="flex items-center gap-2">
                {savedNotesFeedback && (
                  <span className="text-xs font-bold text-green-700 flex items-center gap-1">
                    <Check size={12} /> Notes saved
                  </span>
                )}
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="clay-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 font-bold"
                >
                  <Save size={13} />
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
            <textarea
              rows={4}
              placeholder="Record key formulas, timestamps, and study reminders here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs sm:text-sm bg-[#FFF7ED] border border-[#FED7AA] rounded-xl p-3 text-[#431407] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#EA580C] leading-relaxed transition"
            />
          </div>
        </div>

        {/* Right Column: Playlist Sequence Sidebar */}
        {sidebarOpen && (
          <aside className="w-full lg:w-80 clay-card bg-white flex flex-col max-h-[720px] rounded-2xl border border-[#FED7AA] overflow-hidden shadow-sm flex-shrink-0">
            <div className="p-4 border-b border-[#FED7AA] bg-[#FFF7ED] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#431407]">
                  Playlist Sequence
                </h3>
                <p className="text-[11px] text-[#78716C]">
                  {videos.length} {videos.length === 1 ? 'lesson' : 'lessons'} in curriculum
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
                    onClick={() => navigate(`/course/${course?._id || courseId}/video/${vid._id}`)}
                    className={`w-full text-left p-3 rounded-xl transition flex items-start gap-2.5 ${
                      isActive
                        ? 'bg-[#FFF7ED] border border-[#FED7AA] shadow-sm'
                        : 'hover:bg-[#FFF7ED]/50 border border-transparent'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-[#EA580C] text-white shadow-sm'
                          : 'bg-white border border-[#FED7AA] text-[#78716C]'
                      }`}
                    >
                      {posNumber}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-bold line-clamp-2 leading-tight ${
                          isActive ? 'text-[#EA580C]' : 'text-[#431407]'
                        }`}
                      >
                        {vid.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#78716C]">
                        {vid.duration > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock size={10} /> {formatDuration(vid.duration)}
                          </span>
                        )}
                        {vid.completed && (
                          <span className="text-green-700 font-bold flex items-center gap-0.5">
                            <CheckCircle2 size={11} /> Completed
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

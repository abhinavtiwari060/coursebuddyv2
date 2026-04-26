import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { videoService } from '../api/api';
import { progressService } from '../api/api';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, PlayCircle, Lock, List, X, BookOpen } from 'lucide-react';
import { formatDuration } from '../utils/helpers';

export default function VideoPlayer() {
  const { courseId, videoId } = useParams();
  const navigate = useNavigate();
  const playerRef = useRef(null);

  const [videos, setVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [progress, setProgress] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  
  const ytPlayer = useRef(null);
  const isReady = useRef(false);

  // Extract YouTube video ID from link
  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const progressTimerRef = useRef(null);
  const lastSavedTime = useRef(0);

  useEffect(() => {
    loadData();
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [videoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allVideos = await videoService.getAll();
      // Filter to only this course's videos
      const courseVideos = allVideos.filter(v => 
        v.courseId === courseId || 
        String(v.courseId) === courseId || 
        v.course === courseId || 
        v.courseName === courseId
      );
      const sorted = [...courseVideos].sort((a, b) => (a.order || 0) - (b.order || 0));
      setVideos(sorted);

      const vid = sorted.find(v => v._id === videoId) || sorted[0];
      setCurrentVideo(vid);

      // Load progress
      try {
        const prog = await progressService.get(courseId);
        setProgress(prog);
      } catch (err) {
        console.warn("[VIDEO] Failed to load progress, but continuing play:", err.message);
      }
    } catch (err) {
      console.error("[VIDEO] Failed to load videos:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedVideo = videos.find((video) => video._id === videoId) || videos[0];

  // 1. Log selected route param
  console.log("[DEBUG] Route Video ID:", videoId);
  // 2. Log full playlist data
  console.log("[DEBUG] Fetched Videos:", videos);
  // 3. Log selected video object
  console.log("[DEBUG] Selected Video:", selectedVideo);
  // 4. Log youtubeVideoId
  console.log("[DEBUG] YouTube Video ID:", selectedVideo?.youtubeVideoId);
  // 5. Log iframe URL
  if (selectedVideo?.youtubeVideoId) {
    console.log(
      "[DEBUG] Embed URL:",
      `https://www.youtube.com/embed/${selectedVideo.youtubeVideoId}?autoplay=1`
    );
  }

  // 9. Add validation before iframe render
  const isValidVideo =
    selectedVideo &&
    selectedVideo.youtubeVideoId &&
    selectedVideo.youtubeVideoId.length > 5;

  useEffect(() => {
    setCurrentVideo(selectedVideo);
  }, [selectedVideo]);

  // Handle Progress tracking
  useEffect(() => {
    progressTimerRef.current = setInterval(() => {
      // With a raw iframe, we can't track precise progress without YT API.
      // So we'll just track time spent on the page as a fallback.
    }, 10000);
    return () => clearInterval(progressTimerRef.current);
  }, [currentVideo]);

  // changeSpeed is not natively supported on raw iframe without API
  const changeSpeed = (rate) => {
    setPlaybackRate(rate);
  };

  const saveProgress = useCallback(async (watchedVideoId, position = 0) => {
    if (!watchedVideoId) return;
    try {
      await progressService.save({
        courseId,
        lastVideoId: watchedVideoId,
        watchedVideoId,
        watchPosition: position,
      });
    } catch (err) {
      // Fail silently, don't crash the player
      console.warn("[VIDEO] Progress save failed:", err.message);
    }
  }, [courseId]);

  const handleComplete = async () => {
    if (!currentVideo) return;
    try {
      await videoService.markComplete(currentVideo._id);
      await saveProgress(currentVideo._id, 0);
      setVideos(vids => vids.map(v => v._id === currentVideo._id ? { ...v, completed: true } : v));
    } catch (err) {
      console.error("[VIDEO] Failed to mark complete:", err);
    }
  };

  const navigateTo = (vid) => {
    if (!vid) return;
    saveProgress(vid._id, 0);
    navigate(`/course/${courseId}/video/${vid._id}`);
  };

  const currentIndex = videos.findIndex(v => v._id === videoId);
  const prevVideo = currentIndex > 0 ? videos[currentIndex - 1] : null;
  const nextVideo = currentIndex < videos.length - 1 ? videos[currentIndex + 1] : null;
  const completedCount = videos.filter(v => v.completed).length;
  const courseProgress = videos.length > 0 ? Math.round((completedCount / videos.length) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col" style={{fontFamily:"'Inter', sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-slate-900/80 backdrop-blur border-b border-white/5 sticky top-0 z-10">
        <Link to="/dashboard" className="p-2 rounded-xl hover:bg-white/10 transition text-slate-400 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base truncate">{currentVideo?.title || 'Video Player'}</h1>
          {currentVideo?.course && (
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <BookOpen size={12} /> {currentVideo.course}
            </p>
          )}
        </div>
        {/* Course progress */}
        <div className="hidden sm:flex items-center gap-3 mr-4">
          <div className="text-xs text-slate-400 whitespace-nowrap">{completedCount}/{videos.length} done</div>
          <div className="w-32 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500" style={{width: `${courseProgress}%`}} />
          </div>
          <div className="text-xs font-bold text-orange-400">{courseProgress}%</div>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-xl hover:bg-white/10 transition text-slate-400 hover:text-white">
          <List size={20} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Player Error Boundary Wrapper */}
          <div className="w-full bg-black aspect-video relative flex items-center justify-center">
            {isValidVideo ? (
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${selectedVideo.youtubeVideoId}?autoplay=1`}
                title={selectedVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => console.log("[DEBUG] Iframe Loaded successfully")}
                onError={(e) => console.log("[DEBUG] Iframe Failed to load", e)}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-400 p-10 text-center bg-black">
                <PlayCircle size={64} className="opacity-20" />
                <div>
                  <p className="text-lg font-bold text-white mb-1">Unable to Load Video</p>
                  <p className="text-sm">The video may be private, deleted, or from an unsupported platform.</p>
                </div>
                
                {/* 8. Add fallback debugging UI */}
                <div className="mt-4 p-4 border border-red-500/30 bg-red-500/10 rounded-xl text-left font-mono text-xs text-red-200">
                  <p className="font-bold text-red-400 mb-1">DEBUG INFO:</p>
                  <p>Video ID: {selectedVideo?.youtubeVideoId || "undefined"}</p>
                  <p>Mongo ID: {selectedVideo?._id || "undefined"}</p>
                  <p>Title: {selectedVideo?.title || "undefined"}</p>
                  <p>Link: {selectedVideo?.link || "undefined"}</p>
                </div>

                {currentVideo?.link && (
                  <a href={currentVideo.link} target="_blank" rel="noreferrer" className="mt-2 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition text-sm font-bold flex items-center gap-2">
                    Open Externally <ArrowLeft size={16} className="rotate-180" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Controls bar */}
          <div className="p-5 bg-slate-900/50 border-b border-white/5">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigateTo(prevVideo)}
                disabled={!prevVideo}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm font-medium"
              >
                <ChevronLeft size={18} /> Previous
              </button>

              <button
                onClick={handleComplete}
                disabled={currentVideo?.completed}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition ${
                  currentVideo?.completed
                    ? 'bg-green-500/20 text-green-400 cursor-default'
                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'
                }`}
              >
                <CheckCircle2 size={18} />
                {currentVideo?.completed ? 'Completed ✓' : 'Mark as Done'}
              </button>
              
              <div className="flex items-center bg-white/10 rounded-xl p-1 ml-2">
                {[0.5, 1, 1.5, 2].map(rate => (
                  <button
                    key={rate}
                    onClick={() => changeSpeed(rate)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${playbackRate === rate ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              <button
                onClick={() => navigateTo(nextVideo)}
                disabled={!nextVideo}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm font-medium"
              >
                Next <ChevronRight size={18} />
              </button>

              <div className="ml-auto text-xs text-slate-400 hidden sm:block">
                Video {currentIndex + 1} of {videos.length}
                {currentVideo?.duration ? ` • ${formatDuration(currentVideo.duration)}` : ''}
              </div>
            </div>
          </div>

          {/* Video Info */}
          <div className="p-6">
            <h2 className="text-xl font-bold mb-2">{currentVideo?.title}</h2>
            {currentVideo?.description && (
              <p className="text-slate-400 text-sm leading-relaxed">{currentVideo.description}</p>
            )}
          </div>
        </div>

        {/* Sidebar Playlist */}
        {sidebarOpen && (
          <div className="w-80 flex-shrink-0 bg-slate-900/80 border-l border-white/5 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <h3 className="font-bold text-sm">Course Playlist</h3>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition text-slate-400">
                <X size={16} />
              </button>
            </div>
            {/* Progress bar */}
            <div className="px-4 py-2 border-b border-white/5">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{completedCount} / {videos.length} videos</span>
                <span className="text-orange-400 font-bold">{courseProgress}%</span>
              </div>
              <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500" style={{width: `${courseProgress}%`}} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {videos.map((vid, idx) => (
                <button
                  key={vid._id}
                  onClick={() => navigateTo(vid)}
                  className={`w-full text-left p-3 flex items-start gap-3 hover:bg-white/5 transition border-b border-white/5 group ${vid._id === videoId ? 'bg-orange-500/10 border-l-2 border-l-orange-500' : ''}`}
                >
                  {/* Thumbnail or number */}
                  <div className="relative flex-shrink-0 w-16 h-10 rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                    {vid.thumbnail ? (
                      <img src={vid.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                    {vid._id === videoId && (
                      <div className="absolute inset-0 bg-orange-500/40 flex items-center justify-center">
                        <PlayCircle size={18} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold line-clamp-2 leading-tight ${vid._id === videoId ? 'text-orange-300' : 'text-slate-300 group-hover:text-white'}`}>
                      {vid.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {vid.completed && <CheckCircle2 size={12} className="text-green-400 flex-shrink-0" />}
                      {vid.duration ? <span className="text-[10px] text-slate-500">{formatDuration(vid.duration)}</span> : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Play, Pause,
  Settings, Maximize, Volume2, SkipForward,
  CheckCircle2, Clock, List, ArrowLeft
} from 'lucide-react';
import { driveService } from '../api/api';
import Navbar from '../components/Navbar';

// Custom Controls State
const [currentTime, setCurrentTime] = useState(0);
const [duration, setDuration] = useState(0);
const [volume, setVolume] = useState(1);
const [isMuted, setIsMuted] = useState(false);
const [isFullscreen, setIsFullscreen] = useState(false);

const togglePlay = () => {
  if (videoRef.current.paused) videoRef.current.play();
  else videoRef.current.pause();
};

const skip = (seconds) => {
  videoRef.current.currentTime += seconds;
};

const handleSeek = (e) => {
  const time = parseFloat(e.target.value);
  videoRef.current.currentTime = time;
  setCurrentTime(time);
};

const toggleMute = () => {
  const nextMuted = !isMuted;
  setIsMuted(nextMuted);
  videoRef.current.muted = nextMuted;
};

const handleVolumeChange = (e) => {
  const val = parseFloat(e.target.value);
  setVolume(val);
  videoRef.current.volume = val;
  setIsMuted(val === 0);
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    videoRef.current.parentElement.requestFullscreen();
    setIsFullscreen(true);
  } else {
    document.exitFullscreen();
    setIsFullscreen(false);
  }
};

const loadData = async () => {
  setLoading(true);
  try {
    const meta = await driveService.getVideoMeta(fileId);
    setVideo(meta.video);
    setProgress(meta.progress);
    const courseVideos = await driveService.getVideos(meta.video.driveFolderId);
    setPlaylist(courseVideos);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

const handleTimeUpdate = () => {
  const time = videoRef.current.currentTime;
  setCurrentTime(time);
  if (Math.floor(time) % 10 === 0) {
    driveService.saveProgress({
      fileId,
      driveFolderId: video.driveFolderId,
      watchPosition: time,
      completed: time > (videoRef.current.duration * 0.9)
    });
  }
};

const handleEnded = async () => {
  await driveService.saveProgress({
    fileId,
    driveFolderId: video.driveFolderId,
    watchPosition: videoRef.current.duration,
    completed: true
  });
  if (nextVideo) {
    navigate(`/drive/video/${nextVideo.fileId}`);
  }
};

const handleLoadedMetadata = () => {
  setDuration(videoRef.current.duration);
  if (progress?.watchPosition && !progress.completed) {
    videoRef.current.currentTime = progress.watchPosition;
  }
};

const changeSpeed = (speed) => {
  setPlaybackSpeed(speed);
  videoRef.current.playbackRate = speed;
  setShowSettings(false);
};

if (loading) return (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
    <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
    <p className="font-bold text-slate-400">Loading your secure stream...</p>
  </div>
);

const streamUrl = `${import.meta.env.VITE_API_URL || ''}/api/drive/stream/${fileId}`;
const currentIdx = playlist.findIndex(v => v.fileId === fileId);
const prevVideo = currentIdx > 0 ? playlist[currentIdx - 1] : null;
const nextVideo = currentIdx < playlist.length - 1 ? playlist[currentIdx + 1] : null;

return (
  <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
    <div className="flex-1 flex flex-col lg:flex-row h-screen overflow-hidden">

      {/* Main Player Area */}
      <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="p-4 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-white transition group">
              <div className="p-2 rounded-lg bg-white/5 border border-white/5 group-hover:bg-white/10 group-hover:border-white/10 transition">
                <ArrowLeft size={18} />
              </div>
              <span className="font-bold text-sm">Dashboard</span>
            </button>
            <div className="flex items-center gap-3">
              <span className="badge bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/10">
                Custom Player · HD
              </span>
            </div>
          </div>

          <div className="relative aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 shadow-blue-500/5 group flex items-center justify-center">
            <video
              ref={videoRef}
              src={streamUrl}
              className="w-full h-full cursor-pointer"
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlay}
              onError={() => alert("Failed to stream video from Google Drive. Please verify the folder sharing permissions or try again later.")}
            />

            {/* Custom Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            {/* Controls Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0 pointer-events-auto">
              {/* Seek Bar */}
              <div className="relative group/seek mb-4">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
                />
                <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover/seek:opacity-100">
                  {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} / {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button onClick={() => skip(-10)} className="text-white/70 hover:text-white transition"><SkipForward size={22} className="rotate-180" /></button>
                  <button onClick={togglePlay} className="p-3 bg-white text-black rounded-full hover:scale-110 transition shadow-xl">
                    {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-0.5" />}
                  </button>
                  <button onClick={() => skip(10)} className="text-white/70 hover:text-white transition"><SkipForward size={22} /></button>

                  <div className="flex items-center gap-2 group/vol">
                    <button onClick={toggleMute} className="text-white/70 hover:text-white transition">
                      {isMuted || volume === 0 ? <Volume2 size={22} className="opacity-40" /> : <Volume2 size={22} />}
                    </button>
                    <input
                      type="range" min="0" max="1" step="0.1" value={volume}
                      onChange={handleVolumeChange}
                      className="w-0 group-hover/vol:w-20 transition-all duration-300 bg-white/20 h-1 rounded-full overflow-hidden accent-blue-500"
                    />
                  </div>

                  <span className="text-xs font-black tracking-widest text-white/50">
                    {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  <div className="relative">
                    <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-xl hover:bg-white/10 transition text-white/70 hover:text-white">
                      <Settings size={20} />
                    </button>
                    {showSettings && (
                      <div className="absolute bottom-full right-0 mb-4 w-40 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-2 z-50">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 p-2 border-b border-white/5 mb-1">Speed</p>
                        {[0.5, 1, 1.25, 1.5, 2].map(s => (
                          <button key={s} onClick={() => changeSpeed(s)} className={`w-full text-left p-2 rounded-lg text-xs font-bold hover:bg-white/5 transition flex items-center justify-between ${playbackSpeed === s ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400'}`}>
                            {s}x {playbackSpeed === s && <CheckCircle2 size={12} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={toggleFullscreen} className="p-2 rounded-xl hover:bg-white/10 transition text-white/70 hover:text-white">
                    <Maximize size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h1 className="text-3xl font-black tracking-tight">{video.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-slate-400 text-sm font-medium">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg">
                <Clock size={16} className="text-blue-500" /> {video.duration ? `${Math.floor(video.duration / 60)}m` : '--:--'}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg">
                <BookOpen size={16} className="text-orange-500" /> {video.courseName}
              </div>
              {progress?.completed && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20">
                  <CheckCircle2 size={16} /> Completed
                </div>
              )}
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              disabled={!prevVideo}
              onClick={() => navigate(`/drive/video/${prevVideo.fileId}`)}
              className="flex items-center gap-4 p-5 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-3xl transition disabled:opacity-20 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center transition group-hover:scale-110">
                <ChevronLeft size={24} />
              </div>
              <div className="text-left min-w-0">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Previous Class</p>
                <p className="font-bold text-sm truncate">{prevVideo?.title || 'No previous lesson'}</p>
              </div>
            </button>
            <button
              disabled={!nextVideo}
              onClick={() => navigate(`/drive/video/${nextVideo.fileId}`)}
              className="flex items-center justify-between p-5 bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 border border-white/5 rounded-3xl transition disabled:opacity-20 group"
            >
              <div className="text-left min-w-0 flex-1">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Up Next</p>
                <p className="font-bold text-sm truncate">{nextVideo?.title || 'Course Completed!'}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white transition group-hover:scale-110 shadow-lg shadow-blue-500/20">
                <ChevronRight size={24} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Playlist Sidebar */}
      <div className="hidden lg:flex w-96 bg-slate-900/50 backdrop-blur-3xl border-l border-white/5 flex-col h-full">
        <div className="p-8 border-b border-white/5 bg-slate-950/20">
          <h3 className="font-black text-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <List size={20} />
            </div>
            Course Content
          </h3>
          <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest">{playlist.length} Lessons Available</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {playlist.map((v, i) => {
            const isCurrent = v.fileId === fileId;
            return (
              <button
                key={v.fileId}
                onClick={() => navigate(`/drive/video/${v.fileId}`)}
                className={`w-full flex items-center gap-4 p-4 rounded-[1.25rem] transition text-left group border border-transparent ${isCurrent ? 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-600/20 border-white/10' : 'hover:bg-white/5 hover:border-white/5'
                  }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 transition-transform group-hover:scale-105 shadow-sm ${isCurrent ? 'bg-white/10 text-white' : 'bg-slate-800 text-slate-500'
                  }`}>
                  {isCurrent ? <Play size={16} fill="white" className="ml-0.5" /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-bold truncate leading-tight ${isCurrent ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{v.title}</p>
                  <div className="flex items-center justify-between mt-1.5 w-full">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${isCurrent ? 'text-white/60' : 'text-slate-500'}`}>
                        {v.duration ? `${Math.floor(v.duration / 60)}m` : '--:--'}
                      </span>
                      {v.progress?.completed && (
                        <div className="bg-green-500/20 p-0.5 rounded-full">
                          <CheckCircle2 size={8} className="text-green-500" />
                        </div>
                      )}
                    </div>
                    {isCurrent && <div className="text-[8px] font-black text-white/50 animate-pulse uppercase">Now Playing</div>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  </div>
);


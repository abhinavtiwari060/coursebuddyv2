import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, Play, Pause, 
  Settings, Maximize, Volume2, SkipForward,
  CheckCircle2, Clock, List, ArrowLeft
} from 'lucide-react';
import { driveService } from '../api/api';
import Navbar from '../components/Navbar';

export default function DrivePlayer() {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [video, setVideo] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadData();
  }, [fileId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const meta = await driveService.getVideoMeta(fileId);
      setVideo(meta.video);
      setProgress(meta.progress);
      
      // Load full course playlist for navigation
      const courseVideos = await driveService.getVideos(meta.video.driveFolderId);
      setPlaylist(courseVideos);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentIdx = playlist.findIndex(v => v.fileId === fileId);
  const prevVideo = currentIdx > 0 ? playlist[currentIdx - 1] : null;
  const nextVideo = currentIdx < playlist.length - 1 ? playlist[currentIdx + 1] : null;

  const handleTimeUpdate = () => {
    const time = videoRef.current.currentTime;
    // Save progress every 10 seconds or on finish
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
    if (progress?.watchPosition && !progress.completed) {
      videoRef.current.currentTime = progress.watchPosition;
    }
  };

  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    videoRef.current.playbackRate = speed;
    setShowSettings(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 dark:text-white">Loading...</div>;

  const streamUrl = `${import.meta.env.VITE_API_URL || 'https://coursebuddyv2.onrender.com'}/api/drive/stream/${fileId}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* Main Player Area */}
        <div className="flex-1 flex flex-col p-4 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
             <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-white transition">
                <ArrowLeft size={20} />
                <span className="font-bold text-sm">Back to Dashboard</span>
             </button>
             <div className="flex items-center gap-3">
                <span className="badge bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                   Drive Course
                </span>
             </div>
          </div>

          <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 shadow-blue-500/10 group">
            <video 
              ref={videoRef}
              src={streamUrl}
              className="w-full h-full"
              controls
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>

          <div className="mt-8">
             <h1 className="text-2xl font-black">{video.title}</h1>
             <div className="flex flex-wrap items-center gap-4 mt-2 text-slate-400 text-sm">
                <span className="flex items-center gap-1"><Clock size={16}/> {video.duration ? `${Math.floor(video.duration / 60)}m` : 'Unknown'}</span>
                <span className="flex items-center gap-1"><List size={16}/> {video.pathParts.join(' / ')}</span>
                {progress?.completed && <span className="flex items-center gap-1 text-green-500 font-bold"><CheckCircle2 size={16}/> Completed</span>}
             </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
             <button 
               disabled={!prevVideo}
               onClick={() => navigate(`/drive/video/${prevVideo.fileId}`)}
               className="flex items-center justify-center gap-3 p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl transition disabled:opacity-20"
             >
                <ChevronLeft size={24}/>
                <div className="text-left">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Previous</p>
                   <p className="font-bold text-sm truncate max-w-[150px]">{prevVideo?.title || 'None'}</p>
                </div>
             </button>
             <button 
               disabled={!nextVideo}
               onClick={() => navigate(`/drive/video/${nextVideo.fileId}`)}
               className="flex items-center justify-center gap-3 p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl transition disabled:opacity-20"
             >
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Next</p>
                   <p className="font-bold text-sm truncate max-w-[150px]">{nextVideo?.title || 'End of Course'}</p>
                </div>
                <ChevronRight size={24}/>
             </button>
          </div>
        </div>

        {/* Playlist Sidebar */}
        <div className="w-full lg:w-96 bg-slate-900/50 backdrop-blur-xl border-l border-slate-800 flex flex-col p-6">
           <h3 className="font-black text-lg mb-6 flex items-center gap-2">
              <List size={20} className="text-blue-500" />
              Course Content
           </h3>
           <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {playlist.map((v, i) => {
                 const isCurrent = v.fileId === fileId;
                 return (
                    <button 
                      key={v.fileId}
                      onClick={() => navigate(`/drive/video/${v.fileId}`)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition text-left group ${
                        isCurrent ? 'bg-blue-600 shadow-lg shadow-blue-600/20' : 'hover:bg-slate-800'
                      }`}
                    >
                       <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                          isCurrent ? 'bg-white/20' : 'bg-slate-800'
                       }`}>
                          {isCurrent ? <Play size={14} fill="currentColor"/> : i + 1}
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${isCurrent ? 'text-white' : 'text-slate-300'}`}>{v.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                             <span className={`text-[10px] font-bold ${isCurrent ? 'text-blue-100' : 'text-slate-500'}`}>
                                {v.duration ? `${Math.floor(v.duration / 60)}m` : ''}
                             </span>
                             {v.progress?.completed && <CheckCircle2 size={10} className="text-green-500"/>}
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
}

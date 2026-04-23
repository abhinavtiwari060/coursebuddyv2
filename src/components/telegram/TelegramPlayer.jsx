import React, { useEffect, useRef } from 'react';
import { X, ExternalLink, MessageCircle } from 'lucide-react';
import { telegramService } from '../../api/api';

export default function TelegramPlayer({ video, onClose }) {
  const videoRef = useRef(null);

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (video) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [video]);

  if (!video) return null;

  const streamUrl = telegramService.getStreamUrl(video.video_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-5xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row z-10 animate-fade-in-up">
        
        {/* Close Button top-right absolute */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center backdrop-blur transition-colors"
        >
          <X size={20} />
        </button>

        {/* Video Section */}
        <div className="flex-1 bg-black flex items-center justify-center aspect-video md:aspect-auto">
          <video 
            ref={videoRef}
            src={streamUrl} 
            controls 
            autoPlay 
            className="w-full h-full object-contain"
            controlsList="nodownload"
          />
        </div>

        {/* Info Panel Sidebar */}
        <div className="w-full md:w-80 lg:w-96 bg-slate-800 p-6 flex flex-col border-l border-slate-700 max-h-[80vh] overflow-y-auto">
          <div className="mb-6 pb-6 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white leading-snug mb-3">
              {video.caption || "Telegram Video"}
            </h2>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                {(video.channel_name || "C").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">{video.channel_name}</p>
                <p className="text-xs text-slate-400">{new Date(video.upload_time).toLocaleString()}</p>
              </div>
            </div>
            
            <a 
              href={video.telegram_link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#2AABEE]/10 hover:bg-[#2AABEE]/20 text-[#2AABEE] rounded-xl font-medium transition-colors border border-[#2AABEE]/20"
            >
              <MessageCircle size={18} /> Open in Telegram <ExternalLink size={14} />
            </a>
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Video Details</h3>
            <div className="space-y-3 text-sm">
               <div className="flex justify-between">
                 <span className="text-slate-500">Duration</span>
                 <span className="text-slate-300">{Math.floor(video.duration/60)}m {video.duration%60}s</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-slate-500">Synced On</span>
                 <span className="text-slate-300">{new Date(video.sync_date).toLocaleDateString()}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-slate-500">Video ID</span>
                 <span className="text-slate-600 truncate max-w-[120px]">{video.telegram_message_id}</span>
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

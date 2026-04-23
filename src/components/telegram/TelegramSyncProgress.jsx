import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { telegramService } from '../../api/api';

export default function TelegramSyncProgress({ onComplete, onBatchComplete }) {
  const [status, setStatus] = useState(null);
  const previousBatchRef = React.useRef(0);

  useEffect(() => {
    let interval;
    
    const checkStatus = async () => {
      try {
        const res = await telegramService.getSyncStatus();
        setStatus(res);
        
        // Notify of batch update
        if (res.current_batch && res.current_batch > previousBatchRef.current) {
          previousBatchRef.current = res.current_batch;
          if (onBatchComplete) onBatchComplete();
        }
        
        if (!res.syncing && res.total > 0 && res.completed === res.total) {
          // Completed perfectly
          if (onComplete) onComplete();
          clearInterval(interval);
        } else if (!res.syncing) {
          // Stopped or failed before completion
          if (onComplete) onComplete();
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    };

    // Initial check
    checkStatus();
    
    // Poll every 2 seconds
    interval = setInterval(checkStatus, 2000);
    
    return () => clearInterval(interval);
  }, [onComplete]);

  if (!status || !status.syncing) return null;

  return (
    <div className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-xl mb-6 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-4">
        <Loader2 className="animate-spin text-indigo-500" size={24} />
        <h3 className="text-lg font-bold text-white">Syncing Telegram Videos...</h3>
      </div>
      
      {/* Progress Bar Container */}
      <div className="w-full bg-slate-800 rounded-full h-3 mb-4 border border-slate-700 overflow-hidden relative">
        <div 
          className="bg-indigo-500 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2 striped-bg"
          style={{ width: `${status.percent || 0}%` }}
        >
          {status.percent > 10 && <span className="text-[10px] font-black text-white/50">{status.percent}%</span>}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm mt-4">
        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
          <p className="text-slate-400 font-medium mb-1">Batch Progress</p>
          <p className="text-white font-bold text-lg mb-1 hidden sm:block">
            Batch {status.current_batch || 0} / {status.total_batches || 0}
          </p>
          <p className="text-white font-bold">
            Fetched: <span className="text-indigo-400">{status.completed}</span> / {status.total} videos
          </p>
          <p className="text-white font-bold">
            Remaining: <span className="text-orange-400">{status.remaining}</span> videos
          </p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
          <p className="text-slate-400 font-medium mb-1">Current Sync Target</p>
          <p className="text-white font-semibold truncate leading-snug">
            "{status.current_video || 'Searching...'}"
          </p>
        </div>
      </div>
    </div>
  );
}

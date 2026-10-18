import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Youtube, Send, CheckCircle2, Clock, Check, FileText, Trash2, Hash, BookOpen, Play } from 'lucide-react';
import { formatDuration } from '../utils/helpers';

export default function VideoCard({ video, onToggleComplete, onUpdateNotes, onDelete, sequenceNumber }) {
  const navigate = useNavigate();
  const isYouTube = video.platform === 'YouTube';
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(video.notes || '');
  const [isToggling, setIsToggling] = useState(false);

  const videoId = video._id || video.id;
  const courseParam = video.courseId || video.course;

  const saveNotes = () => {
    if (onUpdateNotes) onUpdateNotes(videoId, notes);
    setShowNotes(false);
  };

  const handleToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      await onToggleComplete(videoId);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div
      className={`clay-card p-4 sm:p-5 flex flex-col gap-3 relative transition ${
        video.completed
          ? 'bg-[#FFF7ED]/60 border-green-300'
          : 'bg-white hover:border-[#FB923C]'
      }`}
    >
      {/* Top accent line */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${
          video.completed ? 'bg-green-600' : 'bg-[#EA580C]'
        }`}
      />

      {/* Main card content */}
      <div className="flex gap-3.5">
        {video.thumbnail ? (
          <div
            onClick={() => navigate(`/course/${courseParam}/video/${videoId}`)}
            className="flex-shrink-0 group relative rounded-xl overflow-hidden w-24 h-16 bg-[#FFF7ED] border border-[#FED7AA] cursor-pointer"
          >
            <img
              src={video.thumbnail}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/15 group-hover:bg-black/0 transition-colors" />
            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-bold px-1 rounded">
              {formatDuration(video.duration) || '▶'}
            </div>
          </div>
        ) : (
          <div
            onClick={() => navigate(`/course/${courseParam}/video/${videoId}`)}
            className="flex-shrink-0 w-24 h-16 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center text-[#EA580C] cursor-pointer hover:bg-[#FED7AA]/40"
          >
            <Play size={20} />
          </div>
        )}

        <div className="flex-1 min-w-0 flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3
              onClick={() => navigate(`/course/${courseParam}/video/${videoId}`)}
              className={`font-bold text-sm sm:text-base leading-snug line-clamp-2 cursor-pointer hover:text-[#EA580C] transition ${
                video.completed ? 'line-through text-[#78716C]' : 'text-[#431407]'
              }`}
            >
              {video.title}
            </h3>

            <div className="flex flex-wrap gap-2 items-center text-xs mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] text-[11px] font-bold">
                <BookOpen size={11} /> {video.course}
              </span>
              {video.tag && (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-[#78716C]">
                  <Hash size={10} /> {video.tag}
                </span>
              )}
              {video.duration > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-[#78716C] ml-auto">
                  <Clock size={11} /> {formatDuration(video.duration)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#FED7AA]/60 mt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className={`text-xs px-3 py-1.5 font-bold rounded-xl flex items-center gap-1.5 transition ${
              video.completed
                ? 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200'
                : 'clay-btn-secondary'
            }`}
          >
            <CheckCircle2 size={14} className={video.completed ? 'text-green-700' : 'text-[#78716C]'} />
            {video.completed ? 'Completed ✓' : 'Mark Done'}
          </button>

          <button
            onClick={() => setShowNotes(!showNotes)}
            className="clay-btn-subtle text-xs px-2.5 py-1.5 flex items-center gap-1"
          >
            <FileText size={13} /> Notes {video.notes ? '•' : ''}
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/course/${courseParam}/video/${videoId}`)}
            className="clay-btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
          >
            <Play size={12} fill="currentColor" /> Play
          </button>

          {onDelete && (
            <button
              onClick={() => onDelete(videoId)}
              className="p-1.5 rounded-lg text-[#78716C] hover:text-red-600 hover:bg-red-50 transition"
              title="Delete Video"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Notes Drawer */}
      {showNotes && (
        <div className="pt-3 border-t border-[#FED7AA] space-y-2">
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add personal notes for this video..."
            className="clay-input text-xs"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowNotes(false)}
              className="clay-btn-subtle text-xs py-1"
            >
              Cancel
            </button>
            <button
              onClick={saveNotes}
              className="clay-btn-secondary text-xs px-3 py-1"
            >
              Save Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

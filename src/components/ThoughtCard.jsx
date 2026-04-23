import { useState } from 'react';
import { Heart, Edit2, Trash2, Clock, Check } from 'lucide-react';
import { thoughtService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import ThoughtEditor from './ThoughtEditor';

function getInitials(name = '') {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function timeSince(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + 'y ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + 'mo ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + 'd ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + 'h ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + 'm ago';
  return Math.floor(seconds) + 's ago';
}

export default function ThoughtCard({ thought, onUpdate, onDelete }) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const isOwner = user?.id === thought.user_id;
  const hasLiked = thought.liked_by?.includes(user?.id);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      const updated = await thoughtService.likeThought(thought._id);
      onUpdate(updated);
    } catch (err) {
      console.error('Failed to like', err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this thought forever?')) return;
    try {
      await thoughtService.deleteThought(thought._id);
      onDelete(thought._id);
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  if (isEditing) {
    return (
      <ThoughtEditor
        initialThought={thought}
        onSuccess={(updated) => {
          setIsEditing(false);
          onUpdate(updated);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="glass-card p-5 rounded-2xl flex flex-col gap-3 group relative hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {thought.avatar ? (
            <img src={thought.avatar} className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-orange-100 dark:ring-orange-900/30" alt="" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 shadow-sm flex items-center justify-center text-white font-black text-sm ring-2 ring-indigo-100 dark:ring-indigo-900/30">
              {getInitials(thought.username)}
            </div>
          )}
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 leading-tight">
              {thought.username} {isOwner && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase font-black tracking-wider">You</span>}
            </h4>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
              <Clock size={10} />
              {timeSince(thought.createdAt)}
              {thought.createdAt !== thought.updatedAt && ' (edited)'}
            </div>
          </div>
        </div>
        
        {/* Actions for owner */}
        {isOwner && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
              title="Edit"
            >
              <Edit2 size={15} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="py-2 px-1">
        <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-medium">
          {thought.content}
        </p>
      </div>

      {/* Footer / Likes */}
      <div className="mt-1 flex items-center gap-4">
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all duration-200 ${
            hasLiked 
              ? 'bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40' 
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'
          }`}
        >
          <Heart size={15} className={`transition-transform ${hasLiked ? 'fill-current scale-110' : ''}`} />
          <span>{thought.likes_count}</span>
        </button>
      </div>
    </div>
  );
}

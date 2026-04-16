import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { communityService } from '../api/api';
import { MessageSquare, ThumbsUp, Send, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Community() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchDiscussions();
  }, []);

  const fetchDiscussions = async () => {
    try {
      const data = await communityService.getDiscussions();
      setDiscussions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const data = await communityService.postDiscussion(newPost);
      setDiscussions([data, ...discussions]);
      setNewPost('');
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (id) => {
    try {
      await communityService.likeDiscussion(id);
      setDiscussions(prev => prev.map(d => 
        d._id === id ? { ...d, likes: (d.likes || 0) + 1 } : d
      ));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-slate-500 font-medium">Loading Community...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-500 text-white theme-lavender:from-violet-500 theme-lavender:via-purple-500 theme-lavender:to-fuchsia-500">
        <div className="relative max-w-4xl mx-auto px-6 py-10">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition mb-6"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <MessageSquare size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black drop-shadow">Community Board</h1>
              <p className="text-white/80 mt-1">Share your thoughts, ask doubts, and learn together.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Post Input */}
        <div className="glass-card p-4 rounded-2xl mb-8 flex gap-3">
          <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold flex-shrink-0 theme-lavender:bg-violet-100 theme-lavender:text-violet-600">
            {getInitials(user?.name)}
          </div>
          <div className="flex-1 flex flex-col items-end gap-2">
            <textarea
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
              placeholder="What's on your mind? Share a doubt or a win..."
              rows={3}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 theme-lavender:focus:ring-violet-400 transition resize-none"
            />
            <button
              onClick={handlePost}
              disabled={posting || !newPost.trim()}
              className="btn-primary bg-blue-600 hover:bg-blue-700 theme-lavender:bg-violet-600 px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {posting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Post
            </button>
          </div>
        </div>

        {/* Discussions List */}
        <div className="space-y-4">
          {discussions.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p>No discussions yet. Be the first to post!</p>
            </div>
          ) : (
            discussions.map(d => (
              <div key={d._id} className="glass-card p-5 rounded-2xl flex gap-4">
                {d.authorAvatar ? (
                  <img src={d.authorAvatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 theme-lavender:from-violet-400 theme-lavender:to-fuchsia-500">
                    {getInitials(d.authorName)}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-slate-800 dark:text-white text-sm">{d.authorName}</p>
                    <span className="text-xs text-slate-400">{new Date(d.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{d.content}</p>
                  
                  <div className="mt-4 flex gap-4">
                    <button 
                      onClick={() => handleLike(d._id)}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 theme-lavender:hover:text-violet-600 transition"
                    >
                      <ThumbsUp size={14} />
                      <span className="font-bold">{d.likes || 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

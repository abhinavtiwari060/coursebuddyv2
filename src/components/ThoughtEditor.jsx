import { useState } from 'react';
import { thoughtService } from '../api/api';
import { Send, Edit3, Loader } from 'lucide-react';

export default function ThoughtEditor({ initialThought, onSuccess, onCancel }) {
  const [content, setContent] = useState(initialThought?.content || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (initialThought) {
        const updated = await thoughtService.updateThought(initialThought._id, content);
        onSuccess(updated);
      } else {
        const created = await thoughtService.createThought(content);
        onSuccess(created);
      }
      setContent('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save thought.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 mb-6 animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-400 to-amber-500"></div>
      <h3 className="font-black text-lg dark:text-white mb-3 flex items-center gap-2">
        <Edit3 size={18} className="text-orange-500" />
        {initialThought ? 'Edit your thought' : 'Share your thought of the day'}
      </h3>
      {error && <div className="text-red-500 text-sm mb-3 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind today?"
          rows={3}
          maxLength={280}
          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none font-medium placeholder:text-slate-400 text-sm transition-shadow"
          autoFocus
        />
        <div className="flex justify-between items-center">
          <span className={`text-xs font-bold ${content.length > 250 ? 'text-orange-500' : 'text-slate-400'}`}>
            {content.length}/280
          </span>
          <div className="flex gap-2">
            {initialThought && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="btn-primary py-2 px-6 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <>
                  <Send size={16} /> {initialThought ? 'Update' : 'Post'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

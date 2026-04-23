import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { thoughtService } from '../api/api';
import ThoughtCard from './ThoughtCard';
import ThoughtEditor from './ThoughtEditor';
import { MessageSquare, Loader2 } from 'lucide-react';

export default function ThoughtFeed() {
  const { user } = useAuth();
  const [thoughts, setThoughts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThoughts();
  }, []);

  const fetchThoughts = async () => {
    try {
      const data = await thoughtService.getThoughts();
      setThoughts(data);
    } catch (err) {
      console.error('Failed to load thoughts');
    } finally {
      setLoading(false);
    }
  };

  const hasPosted = thoughts.some((t) => t.user_id === user?.id);

  const handleCreateSuccess = (newThought) => {
    setThoughts([{ ...newThought, username: user.name, avatar: user.avatar }, ...thoughts]);
  };

  const handleUpdate = (updatedThought) => {
    setThoughts((prev) => prev.map((t) => (t._id === updatedThought._id ? { ...t, ...updatedThought } : t)));
  };

  const handleDelete = (id) => {
    setThoughts((prev) => prev.filter((t) => t._id !== id));
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
         <div>
           <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
             <MessageSquare className="text-orange-500" /> Thought of the Day
           </h2>
           <p className="text-slate-500 text-sm mt-1">Share one inspiring thought per day. What's on your mind?</p>
         </div>
      </div>

      {!hasPosted && (
        <ThoughtEditor initialThought={null} onSuccess={handleCreateSuccess} />
      )}

      <div className="space-y-4">
        {thoughts.map((thought) => (
          <ThoughtCard 
            key={thought._id} 
            thought={thought} 
            onUpdate={handleUpdate} 
            onDelete={handleDelete} 
          />
        ))}
        {thoughts.length === 0 && !hasPosted && (
          <div className="text-center p-12 text-slate-400 italic">
            Be the first to share a thought today!
          </div>
        )}
      </div>
    </div>
  );
}

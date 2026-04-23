import { useState, useEffect } from 'react';
import { PlayCircle, EyeOff, Loader2 } from 'lucide-react';
import api from '../api/api';

export default function SuggestedPlaylists() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      // It's the same endpoint that admin uses, but for users we can hit it directly or use a new service
      const res = await api.get('/api/admin/playlists');
      setPlaylists(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleHide = async (id) => {
    try {
      await api.post(`/api/admin/playlists/${id}/hide`);
      setPlaylists(playlists.filter(p => p._id !== id));
    } catch (err) {
      console.error('Failed to hide playlist', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (playlists.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <PlayCircle size={20} className="text-orange-500" />
        <h3 className="font-black text-lg text-slate-800 dark:text-white">Suggested Playlists</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {playlists.map(playlist => (
          <div key={playlist._id} className="glass-card rounded-2xl overflow-hidden group border border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-500/50 transition duration-300 transform hover:-translate-y-1 hover:shadow-xl">
             <div className="relative aspect-video">
               <img src={playlist.thumbnail} alt={playlist.title} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                 <a href={playlist.playlist_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center hover:scale-110 transition shadow-lg">
                   <PlayCircle size={20} />
                 </a>
                 <button onClick={() => handleHide(playlist._id)} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur text-white flex items-center justify-center hover:bg-red-500 hover:scale-110 transition shadow-lg" title="Hide Suggestion">
                   <EyeOff size={18} />
                 </button>
               </div>
             </div>
             <div className="p-4">
               <span className="text-[10px] uppercase font-black tracking-wider text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded inline-block mb-2">
                 {playlist.category || 'Suggested'}
               </span>
               <h4 className="font-bold text-slate-800 dark:text-white line-clamp-2 text-sm leading-tight">
                 {playlist.title}
               </h4>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

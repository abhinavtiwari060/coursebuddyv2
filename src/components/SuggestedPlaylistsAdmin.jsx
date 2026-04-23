import { useState, useEffect } from 'react';
import { PlaySquare, Plus, Trash2, EyeOff, Loader2 } from 'lucide-react';
import { adminService } from '../api/api';

export default function SuggestedPlaylistsAdmin() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('General');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      // In admin view we might want to see all, but the API endpoint just gets non-hidden for current user
      // For simplicity, we just use the existing one, or if we need ALL we can, but since admin is a user too, it's fine.
      const data = await adminService.getPlaylists();
      setPlaylists(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const newPlaylist = await adminService.createPlaylist({ title, thumbnail, playlist_url: url, category });
      setPlaylists([newPlaylist, ...playlists]);
      setTitle(''); setThumbnail(''); setUrl(''); setCategory('General');
    } catch (err) {
      console.error(err);
      alert('Failed to add playlist');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl dark:bg-blue-900/30 dark:text-blue-400">
          <PlaySquare size={20} />
        </div>
        <h2 className="text-xl font-black dark:text-white">Suggested Playlists</h2>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Add public playlists that will appear as suggestions on users' dashboards.
      </p>

      <form onSubmit={handleAdd} className="space-y-4 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
        <div>
          <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Playlist Title" className="w-full px-3 py-2 rounded-lg text-sm border dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input required value={url} onChange={e => setUrl(e.target.value)} placeholder="Playlist URL" className="w-full px-3 py-2 rounded-lg text-sm border dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
          <input required value={thumbnail} onChange={e => setThumbnail(e.target.value)} placeholder="Thumbnail Image URL" className="w-full px-3 py-2 rounded-lg text-sm border dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
        </div>
        <div>
          <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category (e.g. Development)" className="w-full px-3 py-2 rounded-lg text-sm border dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
        </div>
        <button disabled={saving} type="submit" className="w-full btn-primary py-2 rounded-lg font-bold flex justify-center items-center gap-2 text-sm">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Add Suggestion</>}
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {playlists.map(p => (
            <div key={p._id} className="flex gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
              <img src={p.thumbnail} alt="" className="w-16 h-12 object-cover rounded-lg bg-slate-200" />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm dark:text-white truncate">{p.title}</h4>
                <p className="text-xs text-slate-500 truncate">{p.category}</p>
              </div>
            </div>
          ))}
          {playlists.length === 0 && <p className="text-xs text-slate-400 text-center italic">No suggested playlists.</p>}
        </div>
      )}
    </div>
  );
}

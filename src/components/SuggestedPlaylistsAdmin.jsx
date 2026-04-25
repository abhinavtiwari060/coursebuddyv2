import { useState, useEffect } from 'react';
import { PlaySquare, Plus, Trash2, Search, Loader2, Youtube, Film } from 'lucide-react';
import { adminService } from '../api/api';

export default function SuggestedPlaylistsAdmin() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState({});
  const [tab, setTab] = useState('saved'); // 'saved' | 'search'

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const data = await adminService.getPlaylists();
      setPlaylists(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const data = await adminService.searchYoutubePlaylists(searchQuery.trim());
      setSearchResults(data.playlists || []);
    } catch (err) {
      alert(err.response?.data?.error || 'YouTube search failed. Check YOUTUBE_API_KEY.');
    } finally {
      setSearching(false);
    }
  };

  const handleSaveSuggestion = async (playlist) => {
    setSaving(s => ({ ...s, [playlist.id]: true }));
    try {
      const newP = await adminService.createPlaylist({
        title: playlist.title,
        thumbnail: playlist.thumbnail,
        playlist_url: playlist.url,
        category: playlist.channelTitle || 'General',
      });
      setPlaylists(p => [newP, ...p]);
      setTab('saved');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save playlist');
    } finally {
      setSaving(s => ({ ...s, [playlist.id]: false }));
    }
  };

  const savedIds = new Set(playlists.map(p => {
    try { return new URL(p.playlist_url).searchParams.get('list'); } catch { return ''; }
  }).filter(Boolean));

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl dark:bg-blue-900/30 dark:text-blue-400">
          <PlaySquare size={20} />
        </div>
        <h2 className="text-xl font-black dark:text-white">Suggested Playlists</h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Search YouTube for playlists and save them as suggestions on user dashboards.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-slate-200 dark:border-slate-700">
        {[['search', 'Search YouTube', <Search size={14} />], ['saved', 'Saved Suggestions', <Film size={14} />]].map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 -mb-px transition ${tab === key ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Search Tab */}
      {tab === 'search' && (
        <div>
          <form onSubmit={handleSearch} className="flex gap-3 mb-5">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search YouTube playlists…"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
            <button
              type="submit"
              disabled={searching}
              className="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap"
            >
              {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Search
            </button>
          </form>

          {searching && (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-orange-500" size={28} /></div>
          )}

          <div className="space-y-4">
            {searchResults.map(pl => {
              const alreadySaved = savedIds.has(pl.id);
              return (
                <div key={pl.id} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <img src={pl.thumbnail} alt="" className="w-28 h-20 object-cover rounded-lg flex-shrink-0 bg-slate-300" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm dark:text-white line-clamp-2">{pl.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{pl.channelTitle} · {pl.videoCount} videos</p>
                    {pl.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{pl.description}</p>}
                  </div>
                  <div className="flex-shrink-0">
                    {alreadySaved ? (
                      <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">✓ Saved</span>
                    ) : (
                      <button
                        onClick={() => handleSaveSuggestion(pl)}
                        disabled={saving[pl.id]}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition disabled:opacity-60"
                      >
                        {saving[pl.id] ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                        Save
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {searchResults.length === 0 && !searching && searchQuery && (
              <p className="text-center text-sm text-slate-400 py-6">No results. Try a different keyword.</p>
            )}
            {searchResults.length === 0 && !searching && !searchQuery && (
              <div className="text-center py-8 text-slate-400">
                <Youtube size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Enter a keyword to search YouTube for playlists</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Saved Tab */}
      {tab === 'saved' && (
        loading ? (
          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {playlists.map(p => (
              <div key={p._id} className="flex gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <img src={p.thumbnail} alt="" className="w-16 h-12 object-cover rounded-lg bg-slate-200" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm dark:text-white truncate">{p.title}</h4>
                  <p className="text-xs text-slate-500 truncate">{p.category}</p>
                  <a href={p.playlist_url} target="_blank" rel="noreferrer" className="text-xs text-orange-500 hover:underline">View on YouTube →</a>
                </div>
              </div>
            ))}
            {playlists.length === 0 && (
              <p className="text-xs text-slate-400 text-center italic py-4">No suggested playlists. Search YouTube to add some!</p>
            )}
          </div>
        )
      )}
    </div>
  );
}

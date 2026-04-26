import { useState, useEffect } from 'react';
import {
  Youtube, Search, Loader2, CheckCircle2, Users, Trash2,
  RefreshCw, AlertCircle, Plus, Eye, ChevronDown, ChevronUp,
  Clock, Play, BookOpen, X
} from 'lucide-react';
import { playlistService, adminService } from '../api/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDur = (s) => {
  if (!s) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminPlaylistManager() {
  const [tab, setTab] = useState('import'); // 'import' | 'manage'

  // Import form
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [courseName, setCourseName]   = useState('');
  const [importing, setImporting]     = useState(false);
  const [importErr, setImportErr]     = useState('');
  const [importOk, setImportOk]       = useState('');

  // Manage tab
  const [playlists, setPlaylists]     = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [expanded, setExpanded]       = useState(null);
  const [refreshing, setRefreshing]   = useState({});
  const [deleting, setDeleting]       = useState({});

  // Assign modal
  const [assignModal, setAssignModal] = useState(null); // playlist object
  const [allUsers, setAllUsers]       = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearch, setUserSearch]   = useState('');
  const [assigning, setAssigning]     = useState(false);
  const [assignErr, setAssignErr]     = useState('');

  useEffect(() => {
    if (tab === 'manage') loadPlaylists();
  }, [tab]);

  const loadPlaylists = async () => {
    setLoadingList(true);
    try { setPlaylists(await playlistService.adminGetAll()); }
    catch { setPlaylists([]); }
    finally { setLoadingList(false); }
  };

  // ── Import ────────────────────────────────────────────────────────
  const handleImport = async (e) => {
    e.preventDefault();
    if (!playlistUrl.trim() || !courseName.trim()) return;
    setImporting(true); setImportErr(''); setImportOk('');
    try {
      const res = await playlistService.importPlaylist({
        playlistUrl: playlistUrl.trim(),
        courseName: courseName.trim(),
      });
      setImportOk(`✅ "${res.playlist.title}" imported — ${res.playlist.videoCount} videos!`);
      setPlaylistUrl(''); setCourseName('');
    } catch (err) {
      setImportErr(err.response?.data?.error || err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  // ── Refresh ───────────────────────────────────────────────────────
  const handleRefresh = async (pl) => {
    setRefreshing(r => ({ ...r, [pl.playlistId]: true }));
    try {
      await playlistService.refreshPlaylist(pl.playlistId);
      await loadPlaylists();
    } catch (err) {
      alert('Refresh failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setRefreshing(r => ({ ...r, [pl.playlistId]: false }));
    }
  };

  // ── Delete ────────────────────────────────────────────────────────
  const handleDelete = async (pl) => {
    if (!window.confirm(`Delete "${pl.title}" and all watch history?`)) return;
    setDeleting(d => ({ ...d, [pl.playlistId]: true }));
    try {
      await playlistService.deletePlaylist(pl.playlistId);
      setPlaylists(p => p.filter(x => x.playlistId !== pl.playlistId));
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeleting(d => ({ ...d, [pl.playlistId]: false }));
    }
  };

  // ── Assign modal ──────────────────────────────────────────────────
  const openAssign = async (pl) => {
    setAssignModal(pl);
    setSelectedUsers(pl.assignedTo?.map(String) || []);
    setAssignErr('');
    if (!allUsers.length) {
      try {
        const users = await adminService.getUsers();
        setAllUsers(users.filter(u => u.role !== 'admin'));
      } catch {}
    }
  };

  const handleAssign = async () => {
    if (!assignModal) return;
    setAssigning(true); setAssignErr('');
    try {
      await playlistService.assignUsers(assignModal.playlistId, selectedUsers);
      await loadPlaylists();
      setAssignModal(null);
    } catch (err) {
      setAssignErr(err.response?.data?.error || err.message);
    } finally {
      setAssigning(false);
    }
  };

  const filteredUsers = allUsers.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const toggleUser = (uid) =>
    setSelectedUsers(p => p.includes(uid) ? p.filter(i => i !== uid) : [...p, uid]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Tab selector */}
      <div className="flex gap-2">
        {['import', 'manage'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition ${tab === t ? 'bg-red-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
          >
            {t === 'import' ? '+ Import Playlist' : '📋 Manage Playlists'}
          </button>
        ))}
      </div>

      {/* ── IMPORT TAB ── */}
      {tab === 'import' && (
        <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-xl"><Youtube size={22} /></div>
            <div>
              <h2 className="text-xl font-black dark:text-white">Import YouTube Playlist</h2>
              <p className="text-xs text-slate-500 mt-0.5">Paste a YouTube playlist URL to import videos. Videos are cached in MongoDB.</p>
            </div>
          </div>

          {importErr && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-4 border border-red-200 dark:border-red-800">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {importErr}
            </div>
          )}
          {importOk && (
            <div className="flex items-start gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-3 rounded-xl text-sm mb-4 border border-green-200 dark:border-green-800">
              <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" /> {importOk}
            </div>
          )}

          <form onSubmit={handleImport} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">YouTube Playlist URL or ID</label>
              <input
                required
                value={playlistUrl}
                onChange={e => setPlaylistUrl(e.target.value)}
                placeholder="https://www.youtube.com/playlist?list=PLxxxxxx or PLxxxxxx"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Course Name</label>
              <input
                required
                value={courseName}
                onChange={e => setCourseName(e.target.value)}
                placeholder="e.g. React Masterclass, DSA with Python"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 dark:text-white text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={importing}
              className="btn-primary w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              {importing ? <><Loader2 size={16} className="animate-spin" /> Importing videos…</> : <><Plus size={16} /> Import Playlist</>}
            </button>
          </form>
        </div>
      )}

      {/* ── MANAGE TAB ── */}
      {tab === 'manage' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black dark:text-white text-lg">All Imported Playlists</h3>
            <button onClick={loadPlaylists} className="p-2 rounded-xl hover:bg-white/10 transition text-slate-400" title="Refresh list">
              <RefreshCw size={16} className={loadingList ? 'animate-spin' : ''} />
            </button>
          </div>

          {loadingList ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
          ) : playlists.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-700">
              <Youtube size={40} className="mx-auto text-slate-400 mb-3 opacity-30" />
              <p className="text-slate-400 text-sm">No playlists imported yet. Use the Import tab to add one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {playlists.map(pl => (
                <div key={pl.playlistId} className="glass-card rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {/* Playlist row */}
                  <div className="p-4 flex items-center gap-4">
                    {pl.thumbnail && (
                      <img src={pl.thumbnail} alt="" className="w-16 h-12 object-cover rounded-lg flex-shrink-0 bg-slate-200" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm dark:text-white truncate">{pl.title}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1"><BookOpen size={11} /> {pl.courseName}</span>
                        <span className="flex items-center gap-1"><Play size={11} /> {pl.videoCount} videos</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {fmtDur(pl.totalDuration)}</span>
                        <span className="flex items-center gap-1"><Users size={11} /> {pl.assignedTo?.length || 0} users</span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => openAssign(pl)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 text-xs font-bold transition"
                      >
                        <Users size={13} className="inline mr-1" /> Assign
                      </button>
                      <button
                        onClick={() => handleRefresh(pl)}
                        disabled={refreshing[pl.playlistId]}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition text-slate-400 disabled:opacity-40"
                        title="Refresh from YouTube"
                      >
                        <RefreshCw size={14} className={refreshing[pl.playlistId] ? 'animate-spin' : ''} />
                      </button>
                      <button
                        onClick={() => handleDelete(pl)}
                        disabled={deleting[pl.playlistId]}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 transition text-red-400"
                        title="Delete playlist"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => setExpanded(expanded === pl.playlistId ? null : pl.playlistId)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition text-slate-400"
                      >
                        {expanded === pl.playlistId ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded info */}
                  {expanded === pl.playlistId && (
                    <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        {[
                          { label: 'Playlist ID', val: pl.playlistId },
                          { label: 'Last Fetched', val: fmtDate(pl.lastFetchedAt) },
                          { label: 'Watch Events', val: pl.stats?.watchCount || 0 },
                          { label: 'Completions', val: pl.stats?.completedCount || 0 },
                        ].map(({ label, val }) => (
                          <div key={label} className="bg-white/5 rounded-lg p-3">
                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">{label}</p>
                            <p className="text-sm font-bold dark:text-white truncate">{val}</p>
                          </div>
                        ))}
                      </div>
                      <a
                        href={pl.playlistUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-400 hover:underline break-all"
                      >
                        {pl.playlistUrl}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Assign Modal ── */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black dark:text-white text-lg">Assign "{assignModal.title}"</h3>
              <button onClick={() => setAssignModal(null)} className="p-1.5 rounded-lg hover:bg-white/10"><X size={16} /></button>
            </div>

            {assignErr && (
              <div className="text-red-500 text-sm mb-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">{assignErr}</div>
            )}

            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search users…"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold mb-2 text-slate-500">
              <span>{selectedUsers.length}/{filteredUsers.length} selected</span>
              <button onClick={() => setSelectedUsers(filteredUsers.map(u => u._id))} className="text-indigo-400 hover:underline">Select All</button>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto mb-4">
              {filteredUsers.map(u => {
                const checked = selectedUsers.includes(u._id);
                return (
                  <div
                    key={u._id}
                    onClick={() => toggleUser(u._id)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition ${checked ? 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}>
                      {checked && <CheckCircle2 size={10} className="text-white" />}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">{u.name?.[0]?.toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold dark:text-white truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleAssign}
              disabled={assigning || !selectedUsers.length}
              className="btn-primary w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {assigning ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><CheckCircle2 size={16} /> Save Assignment ({selectedUsers.length} users)</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

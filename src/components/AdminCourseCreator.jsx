import { useState, useEffect } from 'react';
import {
  Youtube, Search, Loader2, CheckCircle2, Users, BookOpen,
  ChevronDown, ChevronUp, Clock, X, AlertCircle, Send, Eye, Trash2
} from 'lucide-react';
import { adminService } from '../api/api';


// ── Helpers ──────────────────────────────────────────
function formatSecs(s) {
  if (!s) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// ── Component ─────────────────────────────────────────
export default function AdminCourseCreator() {
  // Step machine: 'input' | 'preview' | 'assign' | 'done'
  const [step, setStep] = useState('input');

  const [playlistUrl, setPlaylistUrl]     = useState('');
  const [courseName, setCourseName]       = useState('');
  const [tag, setTag]                     = useState('');
  const [fetching, setFetching]           = useState(false);
  const [fetchError, setFetchError]       = useState('');

  const [playlist, setPlaylist]           = useState(null);  // { playlistName, playlistId, videos[] }
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [expandedIdx, setExpandedIdx]     = useState(null);

  const [users, setUsers]                 = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearch, setUserSearch]       = useState('');
  const [assigning, setAssigning]         = useState(false);
  const [assignResult, setAssignResult]   = useState(null);

  const [assignedCourses, setAssignedCourses] = useState([]);
  const [loadingHistory, setLoadingHistory]   = useState(false);
  const [deletingCourse, setDeletingCourse]   = useState({});

  // Load existing assigned courses history
  useEffect(() => {
    loadHistory();
    loadUsers();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await adminService.getAssignedCourses();
      setAssignedCourses(data);
    } catch { /* silent */ }
    finally { setLoadingHistory(false); }
  };


  const loadUsers = async () => {
    try {
      const data = await adminService.getUsers();
      setUsers(data.filter(u => u.role !== 'admin'));
    } catch { /* silent */ }
  };

  // ── Step 1: Fetch playlist ──────────────────────────
  const handleFetch = async (e) => {
    e.preventDefault();
    if (!playlistUrl.trim()) return;
    setFetching(true);
    setFetchError('');
    setPlaylist(null);
    try {
      const data = await adminService.fetchYouTubePlaylist(playlistUrl.trim());
      setPlaylist(data);
      setSelectedVideos(data.videos.map(v => v.videoId)); // select all by default
      if (!courseName) setCourseName(data.playlistName);
      setStep('preview');
    } catch (err) {
      setFetchError(err.response?.data?.error || err.message || 'Failed to fetch playlist');
    } finally {
      setFetching(false);
    }
  };

  const toggleVideo = (videoId) => {
    setSelectedVideos(prev =>
      prev.includes(videoId) ? prev.filter(id => id !== videoId) : [...prev, videoId]
    );
  };

  const toggleAll = () => {
    setSelectedVideos(prev =>
      prev.length === playlist.videos.length ? [] : playlist.videos.map(v => v.videoId)
    );
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const toggleUser = (uid) => {
    setSelectedUsers(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const toggleAllUsers = () => {
    setSelectedUsers(prev =>
      prev.length === filteredUsers.length ? [] : filteredUsers.map(u => u._id)
    );
  };

  // ── Step 3: Assign ──────────────────────────────────
  const handleAssign = async () => {
    if (!selectedUsers.length || !selectedVideos.length || !courseName.trim()) return;
    setAssigning(true);
    try {
      const videosToAssign = playlist.videos
        .filter(v => selectedVideos.includes(v.videoId))
        .map(v => ({
          title: v.title,
          link: `https://www.youtube.com/watch?v=${v.videoId}`,
          thumbnail: v.thumbnail,
          duration: v.duration,
          platform: 'YouTube',
          tag: tag || playlist.playlistName,
        }));

      const result = await adminService.assignCourse({
        userIds: selectedUsers,
        courseName: courseName.trim(),
        videos: videosToAssign,
      });
      setAssignResult(result);
      setStep('done');
      loadHistory(); // refresh history
    } catch (err) {
      setFetchError(err.response?.data?.error || err.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const reset = () => {
    setStep('input');
    setPlaylistUrl('');
    setCourseName('');
    setTag('');
    setPlaylist(null);
    setSelectedVideos([]);
    setSelectedUsers([]);
    setAssignResult(null);
    setFetchError('');
    setExpandedIdx(null);
  };

  // ── Render ───────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Step 0: Input ── */}
      {step === 'input' && (
        <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
              <Youtube size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black dark:text-white">Create Course from YouTube Playlist</h2>
              <p className="text-xs text-slate-500 mt-0.5">Paste any YouTube playlist URL to import all videos into a course for users.</p>
            </div>
          </div>

          {fetchError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-4 border border-red-200 dark:border-red-800">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {fetchError}
            </div>
          )}

          <form onSubmit={handleFetch} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">YouTube Playlist URL or ID</label>
              <div className="flex gap-2">
                <input
                  required
                  value={playlistUrl}
                  onChange={e => setPlaylistUrl(e.target.value)}
                  placeholder="https://www.youtube.com/playlist?list=PLxxxxxx"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 dark:text-white text-sm"
                />
                <button
                  type="submit"
                  disabled={fetching}
                  className="btn-primary px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap"
                >
                  {fetching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  {fetching ? 'Fetching…' : 'Fetch'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Course Name (editable)</label>
                <input
                  value={courseName}
                  onChange={e => setCourseName(e.target.value)}
                  placeholder="Auto-filled from playlist"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Tag (optional)</label>
                <input
                  value={tag}
                  onChange={e => setTag(e.target.value)}
                  placeholder="e.g. Python, React, DSA"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 dark:text-white text-sm"
                />
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Step 1: Preview Videos ── */}
      {step === 'preview' && playlist && (
        <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-black dark:text-white flex items-center gap-2">
                <Youtube size={20} className="text-red-500" />
                {playlist.playlistName}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {playlist.videos.length} videos fetched · {selectedVideos.length} selected
              </p>
            </div>
            <button onClick={reset} className="text-slate-400 hover:text-slate-600 p-1">
              <X size={20} />
            </button>
          </div>

          {/* Course name override */}
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Course Name</label>
            <input
              value={courseName}
              onChange={e => setCourseName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 dark:text-white text-sm"
            />
          </div>

          {/* Select all */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Playlist Videos</span>
            <button onClick={toggleAll} className="text-xs font-bold text-red-500 hover:underline">
              {selectedVideos.length === playlist.videos.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Video list */}
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {playlist.videos.map((v, idx) => {
              const checked = selectedVideos.includes(v.videoId);
              const expanded = expandedIdx === idx;
              return (
                <div
                  key={v.videoId}
                  className={`rounded-xl border transition-all ${
                    checked
                      ? 'border-red-300 dark:border-red-700 bg-red-50/60 dark:bg-red-900/10'
                      : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => toggleVideo(v.videoId)}>
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                      checked ? 'bg-red-500 border-red-500' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {checked && <CheckCircle2 size={12} className="text-white" />}
                    </div>

                    {/* Thumbnail */}
                    <img
                      src={v.thumbnail}
                      alt=""
                      className="w-20 h-12 object-cover rounded-lg flex-shrink-0 bg-slate-200"
                    />

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold dark:text-white line-clamp-1">{v.title}</p>
                      <p className="text-xs text-slate-500 flex gap-3 mt-0.5">
                        <span className="flex items-center gap-1"><Clock size={11} /> {formatSecs(v.duration)}</span>
                        {v.channelTitle && <span className="truncate">{v.channelTitle}</span>}
                      </p>
                    </div>

                    {/* Expand toggle */}
                    <button
                      onClick={e => { e.stopPropagation(); setExpandedIdx(expanded ? null : idx); }}
                      className="text-slate-400 hover:text-slate-600 p-1 flex-shrink-0"
                    >
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {expanded && (
                    <div className="px-4 pb-3 border-t border-slate-100 dark:border-slate-700 mt-0">
                      <a
                        href={`https://www.youtube.com/watch?v=${v.videoId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline break-all block mt-2"
                      >
                        https://www.youtube.com/watch?v={v.videoId}
                      </a>
                      {v.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-3">{v.description}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Next */}
          <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button onClick={reset} className="text-sm text-slate-400 hover:text-slate-600 font-medium">← Back</button>
            <button
              disabled={!selectedVideos.length || !courseName.trim()}
              onClick={() => setStep('assign')}
              className="btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
            >
              <Users size={16} /> Assign to Users →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Select Users ── */}
      {step === 'assign' && (
        <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black dark:text-white">Assign "{courseName}"</h2>
              <p className="text-xs text-slate-500 mt-0.5">{selectedVideos.length} videos · Select users to receive this course</p>
            </div>
          </div>

          {fetchError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-4 border border-red-200 dark:border-red-800">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {fetchError}
            </div>
          )}

          {/* Search */}
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search users…"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
            />
          </div>

          {/* Select all */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {selectedUsers.length}/{filteredUsers.length} selected
            </span>
            <button onClick={toggleAllUsers} className="text-xs font-bold text-indigo-500 hover:underline">
              {selectedUsers.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* User list */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {filteredUsers.map(u => {
              const checked = selectedUsers.includes(u._id);
              return (
                <div
                  key={u._id}
                  onClick={() => toggleUser(u._id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    checked
                      ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                    checked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {checked && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                    {u.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold dark:text-white truncate">{u.name}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    u.status === 'blocked'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {u.status || 'active'}
                  </span>
                </div>
              );
            })}
            {filteredUsers.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-6">No users found</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button onClick={() => setStep('preview')} className="text-sm text-slate-400 hover:text-slate-600 font-medium">← Back</button>
            <button
              disabled={assigning || !selectedUsers.length}
              onClick={handleAssign}
              className="btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {assigning
                ? <><Loader2 size={16} className="animate-spin" /> Assigning…</>
                : <><Send size={16} /> Assign Course</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 'done' && assignResult && (
        <div className="glass-card rounded-2xl p-8 border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black dark:text-white mb-1">Course Assigned! 🎉</h2>
          <p className="text-slate-500 text-sm mb-6">"{courseName}" was successfully sent to {assignResult.results?.length} user(s)</p>

          <div className="space-y-2 mb-6 max-w-sm mx-auto text-left">
            {assignResult.results?.map(r => (
              <div key={r.uid} className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm ${
                r.status === 'ok' ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700' : 'bg-red-50 dark:bg-red-900/20 border border-red-200'
              }`}>
                <span className="font-semibold dark:text-white">{r.name || r.uid}</span>
                <span className={`font-bold text-xs ${r.status === 'ok' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {r.status === 'ok' ? `+${r.videosAdded} videos` : r.status}
                </span>
              </div>
            ))}
          </div>

          <button onClick={reset} className="btn-primary px-8 py-3 rounded-xl font-bold">
            Create Another Course
          </button>
        </div>
      )}

      {/* ── Assigned Courses History ── */}
      {(step === 'input' || step === 'done') && (
        <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl">
              <BookOpen size={20} />
            </div>
            <h3 className="text-lg font-black dark:text-white">Assigned Courses History</h3>
          </div>

          {loadingHistory ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : assignedCourses.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6 italic">No courses assigned yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {assignedCourses.map(c => (
                <div key={c._id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm dark:text-white">{c._id}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(c.latestAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2.5 py-1 rounded-full">
                    {c.userCount} user{c.userCount !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

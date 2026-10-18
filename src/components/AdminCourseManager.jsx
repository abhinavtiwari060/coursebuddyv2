import { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  PlayCircle,
  Clock,
  Layers,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Youtube,
  Eye,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  ListOrdered
} from 'lucide-react';
import Modal from './Modal';
import { adminService, playlistService } from '../api/api';
import { formatDuration } from '../utils/helpers';

const CATEGORY_OPTIONS = [
  { value: 'skills', label: 'Skills & Career' },
  { value: 'government-exams', label: 'Government Exams' },
  { value: 'iit-neet', label: 'IIT / NEET' },
  { value: 'other', label: 'General / Other' },
];

export default function AdminCourseManager({ initialTab = 'courses', selectedCourseId = null }) {
  // Navigation: 'courses' | 'playlists'
  const [activeTab, setActiveTab] = useState(initialTab);

  // Courses state
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseSearch, setCourseSearch] = useState('');
  const [courseCategoryFilter, setCourseCategoryFilter] = useState('all');

  // Playlists state
  const [playlists, setPlaylists] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [selectedCourseForPlaylist, setSelectedCourseForPlaylist] = useState(selectedCourseId || '');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState({ type: '', message: '' });
  const [expandedPlaylist, setExpandedPlaylist] = useState(null);
  const [refreshingPlaylist, setRefreshingPlaylist] = useState({});

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [viewingDetailsCourse, setViewingDetailsCourse] = useState(null);
  const [courseDetailsPlaylists, setCourseDetailsPlaylists] = useState([]);
  const [loadingDetailsPlaylists, setLoadingDetailsPlaylists] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'skills',
    subcategory: '',
    thumbnail: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submittingCourse, setSubmittingCourse] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // Initial load
  useEffect(() => {
    loadCourses();
    loadPlaylists();
  }, []);

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const data = await adminService.getCourses();
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load courses', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const data = await playlistService.adminGetAll();
      setPlaylists(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load playlists', err);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  // ── Course Form Validation & Submit ──
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Course title is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Title must be at least 2 characters';
    }
    if (!formData.category) {
      errors.category = 'Please select a category';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      description: '',
      category: 'skills',
      subcategory: '',
      thumbnail: '',
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name || '',
      description: course.description || '',
      category: course.category || 'skills',
      subcategory: course.subcategory || '',
      thumbnail: course.thumbnail || '',
    });
    setFormErrors({});
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmittingCourse(true);
    try {
      if (editingCourse) {
        const updated = await adminService.updateCourse(editingCourse._id, formData);
        setCourses(prev => prev.map(c => c._id === editingCourse._id ? { ...c, ...updated } : c));
        setActionSuccess(`Course "${formData.name}" updated successfully!`);
        setEditingCourse(null);
      } else {
        const created = await adminService.createCourse(formData);
        setCourses(prev => [created, ...prev]);
        setActionSuccess(`Course "${formData.name}" created successfully!`);
        setShowCreateModal(false);
      }
      setTimeout(() => setActionSuccess(''), 4000);
      loadCourses();
    } catch (err) {
      setFormErrors({ submit: err.response?.data?.error || err.message || 'Operation failed' });
    } finally {
      setSubmittingCourse(false);
    }
  };

  const handleDeleteCourse = async (course) => {
    const warning = `Delete course "${course.name}"?\n\nWARNING: This will permanently delete this course and all associated playlists and video lessons.`;
    if (!window.confirm(warning)) return;

    try {
      await adminService.deleteCourseById(course._id);
      setCourses(prev => prev.filter(c => c._id !== course._id));
      setActionSuccess(`Course "${course.name}" and all linked content deleted.`);
      setTimeout(() => setActionSuccess(''), 4000);
      loadPlaylists();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete course');
    }
  };

  const handleViewCourseDetails = async (course) => {
    setViewingDetailsCourse(course);
    setLoadingDetailsPlaylists(true);
    try {
      const data = await adminService.getCoursePlaylists(course._id);
      setCourseDetailsPlaylists(Array.isArray(data) ? data : []);
    } catch {
      setCourseDetailsPlaylists([]);
    } finally {
      setLoadingDetailsPlaylists(false);
    }
  };

  // ── Playlist Management ──
  const handleImportPlaylist = async (e) => {
    e.preventDefault();
    if (!playlistUrl.trim()) {
      setImportStatus({ type: 'error', message: 'Please paste a valid YouTube playlist URL.' });
      return;
    }
    if (!selectedCourseForPlaylist) {
      setImportStatus({ type: 'error', message: 'Please select a Course to attach this playlist to.' });
      return;
    }

    setImporting(true);
    setImportStatus({ type: '', message: '' });

    try {
      const targetCourse = courses.find(c => c._id === selectedCourseForPlaylist);
      const res = await playlistService.importPlaylist({
        playlistUrl: playlistUrl.trim(),
        courseId: selectedCourseForPlaylist,
        courseName: targetCourse?.name,
        category: targetCourse?.category,
        subcategory: targetCourse?.subcategory,
      });

      setImportStatus({
        type: 'success',
        message: `Successfully imported "${res.playlist.title}" with ${res.playlist.videoCount} videos in exact YouTube order!`,
      });
      setPlaylistUrl('');
      loadPlaylists();
      loadCourses();
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to import playlist';
      let friendlyMsg = errMsg;
      if (errMsg.includes('YOUTUBE_API_KEY')) {
        friendlyMsg = 'YouTube API Key is missing or invalid. Please check YOUTUBE_API_KEY in your environment config.';
      } else if (errMsg.includes('not found')) {
        friendlyMsg = 'Playlist not found on YouTube. Ensure the playlist is Public or Unlisted, and the link is correct.';
      }
      setImportStatus({ type: 'error', message: friendlyMsg });
    } finally {
      setImporting(false);
    }
  };

  const handleRefreshPlaylist = async (playlist) => {
    setRefreshingPlaylist(prev => ({ ...prev, [playlist.playlistId]: true }));
    try {
      await playlistService.refreshPlaylist(playlist.playlistId);
      await loadPlaylists();
      setActionSuccess(`Playlist "${playlist.title}" refreshed with updated YouTube sequence!`);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      alert('Failed to refresh playlist: ' + (err.response?.data?.error || err.message));
    } finally {
      setRefreshingPlaylist(prev => ({ ...prev, [playlist.playlistId]: false }));
    }
  };

  const handleDeletePlaylist = async (playlist) => {
    if (!window.confirm(`Delete playlist "${playlist.title}" and remove all videos from this course?`)) return;

    try {
      await playlistService.deletePlaylist(playlist.playlistId);
      setPlaylists(prev => prev.filter(p => p.playlistId !== playlist.playlistId));
      setActionSuccess(`Playlist "${playlist.title}" removed.`);
      setTimeout(() => setActionSuccess(''), 4000);
      loadCourses();
    } catch (err) {
      alert('Failed to delete playlist: ' + (err.response?.data?.error || err.message));
    }
  };

  // Filtered courses
  const filteredCourses = courses.filter(course => {
    const matchesSearch = (course.name || '').toLowerCase().includes(courseSearch.toLowerCase()) ||
                          (course.description || '').toLowerCase().includes(courseSearch.toLowerCase());
    const matchesCategory = courseCategoryFilter === 'all' || course.category === courseCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Filtered playlists
  const filteredPlaylists = selectedCourseForPlaylist
    ? playlists.filter(p => p.courseId === selectedCourseForPlaylist || (p.courseName && courses.find(c => c._id === selectedCourseForPlaylist)?.name === p.courseName))
    : playlists;

  return (
    <div className="space-y-6">
      {/* Success Notification Alert */}
      {actionSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-green-500 text-green-800 rounded-2xl shadow-sm text-xs font-bold animate-fadeIn">
          <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Sub Tabs: Course Management vs YouTube Playlist Management */}
      <div className="clay-card p-2 bg-white border border-[#FED7AA] rounded-2xl flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('courses')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition ${
            activeTab === 'courses'
              ? 'bg-[#EA580C] text-white shadow-sm'
              : 'text-[#78716C] hover:text-[#431407] hover:bg-[#FFF7ED]'
          }`}
        >
          <BookOpen size={16} /> Course Management ({courses.length})
        </button>
        <button
          onClick={() => setActiveTab('playlists')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition ${
            activeTab === 'playlists'
              ? 'bg-[#EA580C] text-white shadow-sm'
              : 'text-[#78716C] hover:text-[#431407] hover:bg-[#FFF7ED]'
          }`}
        >
          <PlayCircle size={16} /> YouTube Playlist Management ({playlists.length})
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: COURSE MANAGEMENT
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'courses' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]" />
                <input
                  type="text"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="Search courses by title or keywords..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-[#431407] focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Filter size={14} className="text-[#78716C]" />
                <select
                  value={courseCategoryFilter}
                  onChange={(e) => setCourseCategoryFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-[#431407] focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {CATEGORY_OPTIONS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="clay-btn-primary flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black shadow-sm"
            >
              <Plus size={16} /> Create Course
            </button>
          </div>

          {/* Courses List / Grid */}
          {loadingCourses ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-4 animate-pulse space-y-3">
                  <div className="h-32 bg-[#FFF7ED] rounded-xl" />
                  <div className="h-4 bg-[#FED7AA]/60 rounded w-3/4" />
                  <div className="h-3 bg-[#FED7AA]/40 rounded w-1/2" />
                  <div className="h-8 bg-[#FFF7ED] rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-12 text-center">
              <BookOpen size={44} className="mx-auto text-[#FED7AA] mb-3" />
              <h3 className="text-base font-black text-[#431407]">No courses found</h3>
              <p className="text-xs text-[#78716C] mt-1 max-w-sm mx-auto">
                {courseSearch || courseCategoryFilter !== 'all'
                  ? 'No courses matched your search or category filter. Try clearing filters.'
                  : 'Get started by creating your first course and attaching YouTube playlists.'}
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="clay-btn-primary inline-flex items-center gap-1.5 text-xs px-5 py-2.5 mt-4"
              >
                <Plus size={15} /> Create Course Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map(course => (
                <div
                  key={course._id}
                  className="clay-card bg-white border border-[#FED7AA] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-[#EA580C] transition shadow-sm"
                >
                  <div>
                    {/* Course Header / Thumbnail */}
                    <div className="relative h-36 bg-[#431407] overflow-hidden flex items-center justify-center">
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[#FED7AA] p-4 text-center">
                          <BookOpen size={36} className="mb-1 text-[#EA580C]" />
                          <span className="text-xs font-black tracking-tight uppercase">StudyMate Course</span>
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/95 text-[#C2410C] border border-[#FED7AA] shadow-sm">
                          {course.category ? course.category.replace('-', ' ') : 'General'}
                        </span>
                      </div>
                      {course.subcategory && (
                        <div className="absolute top-2.5 right-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#431407]/80 text-[#FED7AA] border border-white/20">
                            {course.subcategory}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Course Content */}
                    <div className="p-4 space-y-2">
                      <h3 className="text-sm font-black text-[#431407] line-clamp-1" title={course.name}>
                        {course.name}
                      </h3>
                      {course.description && (
                        <p className="text-xs text-[#78716C] line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>
                      )}

                      {/* Counts / Stats */}
                      <div className="pt-2 flex items-center gap-3 text-xs font-bold text-[#78716C] border-t border-[#FED7AA]/50">
                        <span className="flex items-center gap-1 text-[#C2410C]">
                          <PlayCircle size={13} className="text-[#EA580C]" />
                          {course.playlistCount || 0} {course.playlistCount === 1 ? 'Playlist' : 'Playlists'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[#431407]">
                          <Layers size={13} className="text-[#EA580C]" />
                          {course.videoCount || 0} Videos
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-4 pt-0 flex items-center justify-between gap-1.5 border-t border-[#FED7AA]/40 mt-3 pt-3 bg-[#FFF7ED]/30">
                    <button
                      onClick={() => {
                        setSelectedCourseForPlaylist(course._id);
                        setActiveTab('playlists');
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-black bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl transition"
                      title="Manage YouTube Playlists for this course"
                    >
                      <Plus size={13} /> Playlist
                    </button>
                    <button
                      onClick={() => handleViewCourseDetails(course)}
                      className="p-1.5 text-[#78716C] hover:text-[#431407] hover:bg-white rounded-xl border border-[#FED7AA] transition"
                      title="View Course Details"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(course)}
                      className="p-1.5 text-[#C2410C] hover:text-[#EA580C] hover:bg-white rounded-xl border border-[#FED7AA] transition"
                      title="Edit Course"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition"
                      title="Delete Course and content"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: YOUTUBE PLAYLIST MANAGEMENT
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'playlists' && (
        <div className="space-y-6">
          {/* Import YouTube Playlist Box */}
          <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#EA580C] text-white flex items-center justify-center font-bold">
                <Youtube size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-[#431407]">Import YouTube Playlist into Course</h3>
                <p className="text-xs text-[#78716C]">
                  Imports all videos directly from YouTube Data API v3, preserving the exact sequential playlist order.
                </p>
              </div>
            </div>

            {/* Import Status Alert */}
            {importStatus.message && (
              <div
                className={`mb-4 p-3 rounded-xl border text-xs font-bold flex items-start gap-2 ${
                  importStatus.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-green-50 border-green-200 text-green-700'
                }`}
              >
                {importStatus.type === 'error' ? (
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                )}
                <span>{importStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleImportPlaylist} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Course Selection */}
                <div>
                  <label className="block text-xs font-bold text-[#431407] uppercase tracking-wider mb-1.5">
                    Target Course <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCourseForPlaylist}
                    onChange={(e) => setSelectedCourseForPlaylist(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-xs font-bold bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-[#431407] focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  >
                    <option value="">-- Select an Existing Course --</option>
                    {courses.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.category || 'skills'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[#78716C] mt-1">
                    Playlists will be attached directly to this course curriculum.
                  </p>
                </div>

                {/* Playlist URL */}
                <div>
                  <label className="block text-xs font-bold text-[#431407] uppercase tracking-wider mb-1.5">
                    YouTube Playlist URL or ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                    placeholder="https://www.youtube.com/playlist?list=PL..."
                    required
                    className="w-full px-3 py-2.5 text-xs bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-[#431407] focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  />
                  <p className="text-[10px] text-[#78716C] mt-1">
                    Accepts full URL or playlist ID. Must be Public or Unlisted.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 text-[11px] text-[#78716C] font-semibold">
                  <ListOrdered size={14} className="text-[#EA580C]" />
                  <span>Exact original playlist sequence is stored and preserved for students</span>
                </div>

                <button
                  type="submit"
                  disabled={importing}
                  className="clay-btn-primary flex items-center gap-2 px-6 py-2.5 text-xs font-black shadow-sm disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Importing Playlist Videos...
                    </>
                  ) : (
                    <>
                      <Youtube size={15} />
                      Import Playlist
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Attached Playlists Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#431407] flex items-center gap-2">
                <PlayCircle size={18} className="text-[#EA580C]" />
                {selectedCourseForPlaylist
                  ? `Playlists for "${courses.find(c => c._id === selectedCourseForPlaylist)?.name || 'Selected Course'}"`
                  : 'All Imported YouTube Playlists'}
              </h3>
              {selectedCourseForPlaylist && (
                <button
                  onClick={() => setSelectedCourseForPlaylist('')}
                  className="text-xs font-bold text-[#EA580C] hover:underline"
                >
                  Show all playlists ({playlists.length})
                </button>
              )}
            </div>

            {loadingPlaylists ? (
              <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-10 text-center text-[#78716C] flex items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin text-[#EA580C]" /> Loading playlists...
              </div>
            ) : filteredPlaylists.length === 0 ? (
              <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-10 text-center">
                <Youtube size={40} className="mx-auto text-[#FED7AA] mb-2" />
                <p className="text-sm font-bold text-[#431407]">No playlists attached yet</p>
                <p className="text-xs text-[#78716C] mt-1">
                  Use the import form above to attach YouTube playlists to this course.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPlaylists.map(playlist => {
                  const isExpanded = expandedPlaylist === playlist.playlistId;
                  const isRefreshing = refreshingPlaylist[playlist.playlistId];

                  return (
                    <div
                      key={playlist.playlistId}
                      className="clay-card bg-white border border-[#FED7AA] rounded-2xl overflow-hidden shadow-sm"
                    >
                      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          {playlist.thumbnail ? (
                            <img
                              src={playlist.thumbnail}
                              alt={playlist.title}
                              className="w-24 h-16 object-cover rounded-xl border border-[#FED7AA] flex-shrink-0"
                            />
                          ) : (
                            <div className="w-24 h-16 bg-[#FFF7ED] rounded-xl flex items-center justify-center text-[#EA580C] flex-shrink-0 border border-[#FED7AA]">
                              <Youtube size={24} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                                Course: {playlist.courseName || 'Unassigned'}
                              </span>
                              {playlist.channelTitle && (
                                <span className="text-[11px] text-[#78716C] font-semibold">
                                  by {playlist.channelTitle}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-black text-[#431407] truncate" title={playlist.title}>
                              {playlist.title}
                            </h4>
                            <div className="flex items-center gap-3 text-xs text-[#78716C] mt-1">
                              <span className="font-bold text-[#431407]">{playlist.videoCount || 0} Videos</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} /> {formatDuration(playlist.totalDuration || 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                          <button
                            onClick={() => handleRefreshPlaylist(playlist)}
                            disabled={isRefreshing}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#431407] bg-[#FFF7ED] hover:bg-[#FED7AA]/50 border border-[#FED7AA] rounded-xl transition disabled:opacity-50"
                            title="Resync videos from YouTube"
                          >
                            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-[#EA580C]' : ''} />
                            {isRefreshing ? 'Syncing...' : 'Refresh'}
                          </button>
                          <a
                            href={playlist.playlistUrl || `https://www.youtube.com/playlist?list=${playlist.playlistId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-[#78716C] hover:text-[#EA580C] bg-[#FFF7ED] rounded-xl border border-[#FED7AA] transition"
                            title="View on YouTube"
                          >
                            <ExternalLink size={14} />
                          </a>
                          <button
                            onClick={() => setExpandedPlaylist(isExpanded ? null : playlist.playlistId)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-[#EA580C] bg-white border border-[#FED7AA] rounded-xl hover:bg-[#FFF7ED] transition"
                          >
                            {isExpanded ? 'Hide Videos' : 'View Videos'}
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <button
                            onClick={() => handleDeletePlaylist(playlist)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition"
                            title="Delete Playlist"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Videos Drawer - Exact Sequence Preserved */}
                      {isExpanded && (
                        <div className="border-t border-[#FED7AA] bg-[#FFF7ED]/50 p-4 space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-[#431407] flex items-center gap-1.5">
                              <ListOrdered size={14} className="text-[#EA580C]" />
                              Original YouTube Video Order ({playlist.videos?.length || 0} lessons)
                            </span>
                            <span className="text-[10px] uppercase font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                              Stable Numeric Sequence Preserved
                            </span>
                          </div>

                          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                            {(!playlist.videos || playlist.videos.length === 0) ? (
                              <p className="text-xs text-[#78716C] italic">No videos recorded in this playlist.</p>
                            ) : (
                              playlist.videos.map((vid, idx) => (
                                <div
                                  key={vid.videoId || idx}
                                  className="flex items-center justify-between gap-3 p-2 bg-white border border-[#FED7AA] rounded-xl text-xs hover:border-[#EA580C] transition"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="w-6 h-6 rounded-lg bg-[#FFF7ED] text-[#C2410C] font-black text-[11px] flex items-center justify-center border border-[#FED7AA] flex-shrink-0">
                                      {vid.position !== undefined ? Number(vid.position) + 1 : idx + 1}
                                    </span>
                                    {vid.thumbnail && (
                                      <img
                                        src={vid.thumbnail}
                                        alt={vid.title}
                                        className="w-12 h-8 object-cover rounded-md flex-shrink-0 border border-[#FED7AA]"
                                      />
                                    )}
                                    <span className="font-bold text-[#431407] truncate" title={vid.title}>
                                      {vid.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 flex-shrink-0 text-[11px] text-[#78716C]">
                                    {vid.duration > 0 && <span>{formatDuration(vid.duration)}</span>}
                                    <a
                                      href={`https://www.youtube.com/watch?v=${vid.videoId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#EA580C] hover:underline flex items-center gap-1"
                                    >
                                      YouTube <ExternalLink size={11} />
                                    </a>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CREATE / EDIT COURSE
         ───────────────────────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────
          MODAL: CREATE / EDIT COURSE
         ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(showCreateModal || editingCourse)}
        onClose={() => {
          setShowCreateModal(false);
          setEditingCourse(null);
          setFormErrors({});
        }}
        title={editingCourse ? 'Edit Course Details' : 'Create New Course'}
        subtitle={
          editingCourse
            ? 'Update course metadata and learning category'
            : 'Add a new learning track to the StudyMate curriculum'
        }
        icon={<BookOpen size={20} className="text-[#EA580C]" />}
        isDirty={Boolean(formData.name.trim() || formData.description.trim())}
        maxWidth="max-w-lg"
      >
        {formErrors.submit && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{formErrors.submit}</span>
          </div>
        )}

        <form onSubmit={handleSaveCourse} className="space-y-4">
          {/* Course Title */}
          <div>
            <label className="block text-xs font-bold text-[#431407] uppercase tracking-wider mb-1">
              Course Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Complete Full-Stack Web Development 2026"
              className={`w-full px-3.5 py-2.5 text-xs bg-[#FFF7ED] border rounded-xl text-[#431407] focus:outline-none focus:ring-2 ${
                formErrors.name ? 'border-red-400 focus:ring-red-400' : 'border-[#FED7AA] focus:ring-[#EA580C]'
              }`}
            />
            {formErrors.name && (
              <p className="text-[11px] text-red-600 font-bold mt-1">{formErrors.name}</p>
            )}
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#431407] uppercase tracking-wider mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-[#431407] focus:outline-none"
              >
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#431407] uppercase tracking-wider mb-1">
                Subcategory (Optional)
              </label>
              <input
                type="text"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                placeholder="e.g., React, Python, UPSC"
                className="w-full px-3.5 py-2.5 text-xs bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-[#431407] focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[#431407] uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Outline what students will master in this curriculum..."
              className="w-full px-3.5 py-2.5 text-xs bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-[#431407] focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
            />
          </div>

          {/* Thumbnail URL */}
          <div>
            <label className="block text-xs font-bold text-[#431407] uppercase tracking-wider mb-1">
              Thumbnail Image URL (Optional)
            </label>
            <input
              type="url"
              value={formData.thumbnail}
              onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
              placeholder="https://... (or leave blank to auto-use YouTube playlist thumbnail)"
              className="w-full px-3.5 py-2.5 text-xs bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-[#431407] focus:outline-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#FED7AA]">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setEditingCourse(null);
              }}
              className="px-4 py-2 text-xs font-bold text-[#78716C] hover:bg-[#FFF7ED] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingCourse}
              className="clay-btn-primary px-5 py-2 text-xs font-black shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {submittingCourse ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving...
                </>
              ) : editingCourse ? (
                'Update Course'
              ) : (
                'Create Course'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: VIEW COURSE DETAILS
         ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(viewingDetailsCourse)}
        onClose={() => setViewingDetailsCourse(null)}
        title={viewingDetailsCourse?.name || 'Course Details'}
        subtitle={
          viewingDetailsCourse?.category
            ? `${viewingDetailsCourse.category.replace('-', ' ')} Track`
            : 'Curriculum Overview'
        }
        icon={<BookOpen size={20} className="text-[#EA580C]" />}
        maxWidth="max-w-2xl"
      >
        {viewingDetailsCourse && (
          <div className="space-y-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                {viewingDetailsCourse.category || 'Curriculum'}
              </span>
              <h3 className="text-xl font-black text-[#431407] mt-1.5">{viewingDetailsCourse.name}</h3>
              {viewingDetailsCourse.description && (
                <p className="text-xs text-[#78716C] mt-1 leading-relaxed">
                  {viewingDetailsCourse.description}
                </p>
              )}
            </div>

            {/* Course Statistics Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-[#FFF7ED] rounded-xl border border-[#FED7AA] text-center">
                <p className="text-lg font-black text-[#EA580C]">{viewingDetailsCourse.playlistCount || courseDetailsPlaylists.length}</p>
                <p className="text-[10px] uppercase font-bold text-[#78716C]">Playlists Attached</p>
              </div>
              <div className="p-3 bg-[#FFF7ED] rounded-xl border border-[#FED7AA] text-center">
                <p className="text-lg font-black text-[#431407]">{viewingDetailsCourse.videoCount || 0}</p>
                <p className="text-[10px] uppercase font-bold text-[#78716C]">Total Videos</p>
              </div>
              <div className="p-3 bg-[#FFF7ED] rounded-xl border border-[#FED7AA] text-center">
                <p className="text-lg font-black text-[#C2410C]">{formatDuration(viewingDetailsCourse.totalDuration || 0)}</p>
                <p className="text-[10px] uppercase font-bold text-[#78716C]">Duration</p>
              </div>
            </div>

            {/* Attached Playlists List */}
            <div className="pt-2">
              <h4 className="text-xs font-black uppercase text-[#431407] tracking-wider mb-2">
                Attached Playlists
              </h4>
              {loadingDetailsPlaylists ? (
                <div className="py-6 text-center text-xs text-[#78716C] flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-[#EA580C]" /> Loading attached playlists...
                </div>
              ) : courseDetailsPlaylists.length === 0 ? (
                <p className="text-xs text-[#78716C] italic p-3 bg-[#FFF7ED] rounded-xl border border-[#FED7AA]">
                  No playlists attached to this course yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {courseDetailsPlaylists.map(pl => (
                    <div key={pl.playlistId} className="p-3 bg-[#FFF7ED] rounded-xl border border-[#FED7AA] flex items-center justify-between text-xs">
                      <div>
                        <p className="font-black text-[#431407]">{pl.title}</p>
                        <p className="text-[11px] text-[#78716C]">{pl.videoCount} videos • {formatDuration(pl.totalDuration)}</p>
                      </div>
                      <a
                        href={pl.playlistUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#EA580C] hover:underline flex items-center gap-1 font-bold text-xs"
                      >
                        YouTube <ExternalLink size={12} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#FED7AA] flex justify-end gap-2">
              <button
                onClick={() => {
                  const cId = viewingDetailsCourse._id;
                  setViewingDetailsCourse(null);
                  setSelectedCourseForPlaylist(cId);
                  setActiveTab('playlists');
                }}
                className="clay-btn-primary text-xs px-4 py-2"
              >
                Manage Playlists For This Course →
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

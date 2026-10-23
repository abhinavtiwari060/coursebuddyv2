import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import AddVideoForm from '../components/AddVideoForm';
import PlaylistImport from '../components/PlaylistImport';
import { courseService, videoService } from '../api/api';
import { formatDuration } from '../utils/helpers';
import {
  ArrowLeft,
  BookOpen,
  PlayCircle,
  CheckCircle2,
  Clock,
  Plus,
  ListVideo,
  Video,
  Trash2,
  Loader2,
  AlertTriangle,
  Play,
  Layers,
  Sparkles,
  Check,
  Film
} from 'lucide-react';

export default function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [videos, setVideos] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  // Modals
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [showPlaylistImport, setShowPlaylistImport] = useState(false);
  const [showDeleteCourseModal, setShowDeleteCourseModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load course details and contents from database
  const loadCourseData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await courseService.getById(courseId);
      if (!data) {
        throw new Error('Course not found');
      }
      setCourse(data);
      setVideos(data.videos || []);
      setPlaylists(data.playlists || []);
    } catch (err) {
      console.error('Failed to load course details:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  // Display transient feedback message
  const showFeedback = (text, type = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => {
      setActionMessage(null);
    }, 4000);
  };

  // Add individual video
  const handleAddVideo = async (videoData) => {
    try {
      const payload = {
        ...videoData,
        course: course?.name || courseId,
        courseId: course?._id || courseId
      };
      const newVideo = await videoService.create(payload);
      setVideos((prev) => [...prev, newVideo]);
      setShowAddVideo(false);
      showFeedback('Video lesson added successfully!');
      // Reload stats
      loadCourseData();
      return newVideo;
    } catch (err) {
      if (err.response?.status !== 409) {
        alert(err.response?.data?.error || 'Failed to add video lesson');
      }
      throw err;
    }
  };

  // Delete individual video item with database persistence
  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return;
    setIsDeleting(true);
    try {
      await videoService.delete(videoToDelete._id);
      setVideos((prev) => prev.filter((v) => v._id !== videoToDelete._id));
      setVideoToDelete(null);
      showFeedback('Video deleted permanently from database.');
      // Refresh stats
      loadCourseData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete video. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete course with database persistence
  const confirmDeleteCourse = async () => {
    setIsDeleting(true);
    try {
      await courseService.delete(courseId);
      setShowDeleteCourseModal(false);
      navigate('/my-learning', { replace: true });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete course');
      setIsDeleting(false);
    }
  };

  // Toggle video completion state
  const handleToggleComplete = async (v) => {
    try {
      if (v.completed) {
        await videoService.markPending(v._id);
      } else {
        await videoService.markComplete(v._id);
      }
      setVideos((prev) =>
        prev.map((item) =>
          item._id === v._id
            ? { ...item, completed: !item.completed, completedAt: !item.completed ? new Date().toISOString() : null }
            : item
        )
      );
    } catch (err) {
      console.error('Failed to toggle completion status:', err);
    }
  };

  // Statistics calculation
  const totalVideos = videos.length;
  const completedVideos = videos.filter((v) => v.completed).length;
  const totalDuration = videos.reduce((acc, v) => acc + (Number(v.duration) || 0), 0);
  const percent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
  const nextVideo = videos.find((v) => !v.completed) || videos[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF7ED]">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/my-learning"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#EA580C] hover:text-[#C2410C] transition group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to My Learning
          </Link>
          {course && (
            <button
              onClick={() => setShowDeleteCourseModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition"
            >
              <Trash2 size={13} /> Delete Course
            </button>
          )}
        </div>

        {/* Feedback Alert Toast */}
        {actionMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold animate-fadeIn ${
              actionMessage.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="clay-card bg-white p-16 text-center text-[#78716C] flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-[#EA580C]" />
            <p className="text-sm font-bold text-[#431407]">Loading course details from database...</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="clay-card bg-white p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-black text-[#431407] mb-2">Unable to Load Course</h2>
            <p className="text-xs sm:text-sm text-[#78716C] mb-6">{error}</p>
            <Link to="/my-learning" className="clay-btn-primary inline-flex items-center gap-2 text-xs px-5 py-2.5">
              <ArrowLeft size={14} /> Return to My Learning
            </Link>
          </div>
        ) : course ? (
          <>
            {/* Course Header Banner */}
            <div className="clay-card bg-white p-6 sm:p-8 rounded-3xl mb-8 border border-[#FED7AA] shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                      {course.category ? course.category.replace('-', ' ') : 'General Curriculum'}
                    </span>
                    {percent === 100 && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle2 size={13} /> Completed
                      </span>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#431407] tracking-tight">
                    {course.name}
                  </h1>

                  {course.description && (
                    <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
                      {course.description}
                    </p>
                  )}

                  {/* Summary Badges */}
                  <div className="flex items-center gap-4 text-xs font-semibold text-[#78716C] pt-2 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Film size={14} className="text-[#EA580C]" /> {totalVideos} {totalVideos === 1 ? 'Lesson' : 'Lessons'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-[#EA580C]" /> {formatDuration(totalDuration)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-green-600" /> {completedVideos} Completed
                    </span>
                  </div>
                </div>

                {/* Course Actions */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 self-stretch sm:self-auto min-w-[200px]">
                  {nextVideo ? (
                    <Link
                      to={`/course/${course._id}/video/${nextVideo._id}`}
                      className="clay-btn-primary w-full text-xs sm:text-sm py-3 px-5 flex items-center justify-center gap-2 font-bold shadow-md text-center"
                    >
                      <PlayCircle size={18} />
                      {percent > 0 && percent < 100 ? 'Resume Learning' : 'Start Learning'}
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="w-full text-xs py-3 px-5 rounded-2xl bg-gray-100 text-gray-400 font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <PlayCircle size={18} /> No Lessons Yet
                    </button>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddVideo(true)}
                      className="clay-btn-secondary flex-1 text-xs py-2 px-3 flex items-center justify-center gap-1.5"
                      title="Add video to course"
                    >
                      <Plus size={14} /> Add Video
                    </button>
                    <button
                      onClick={() => setShowPlaylistImport(true)}
                      className="clay-btn-secondary flex-1 text-xs py-2 px-3 flex items-center justify-center gap-1.5"
                      title="Import playlist to course"
                    >
                      <ListVideo size={14} /> Import
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Bar Section */}
              <div className="mt-6 pt-6 border-t border-[#FED7AA]/50">
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span className="text-[#78716C]">Overall Course Completion</span>
                  <span className="text-[#EA580C] text-sm">{percent}%</span>
                </div>
                <div className="w-full bg-[#FFF7ED] h-3 rounded-full overflow-hidden border border-[#FED7AA]">
                  <div
                    className="bg-[#EA580C] h-full rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Video Lessons Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-[#431407] flex items-center gap-2">
                  <BookOpen size={18} className="text-[#EA580C]" />
                  Curriculum Lessons ({videos.length})
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddVideo(true)}
                    className="text-xs font-bold text-[#EA580C] hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Lesson
                  </button>
                </div>
              </div>

              {videos.length === 0 ? (
                <div className="clay-card bg-white p-12 text-center rounded-3xl border border-[#FED7AA]">
                  <Film size={40} className="mx-auto text-[#FED7AA] mb-3" />
                  <h3 className="text-base font-bold text-[#431407]">No Lessons in this Course</h3>
                  <p className="text-xs text-[#78716C] mt-1 max-w-sm mx-auto">
                    Start by adding a YouTube video lesson or importing a playlist into this curriculum.
                  </p>
                  <div className="flex justify-center gap-3 mt-4">
                    <button
                      onClick={() => setShowAddVideo(true)}
                      className="clay-btn-primary inline-flex items-center gap-1.5 text-xs px-4 py-2"
                    >
                      <Plus size={14} /> Add First Video
                    </button>
                    <button
                      onClick={() => setShowPlaylistImport(true)}
                      className="clay-btn-secondary inline-flex items-center gap-1.5 text-xs px-4 py-2"
                    >
                      <ListVideo size={14} /> Import Playlist
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {videos.map((v, index) => (
                    <div
                      key={v._id}
                      className={`clay-card p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition hover:border-[#FB923C] ${
                        v.completed ? 'bg-[#FFF7ED]/40 border-green-200' : 'bg-white border-[#FED7AA]'
                      }`}
                    >
                      {/* Left side: Index, Thumbnail, Video Info */}
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                        <span className="w-7 h-7 rounded-xl bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] flex items-center justify-center text-xs font-black flex-shrink-0">
                          {index + 1}
                        </span>

                        {v.thumbnail ? (
                          <div
                            onClick={() => navigate(`/course/${course._id}/video/${v._id}`)}
                            className="relative w-24 h-16 rounded-xl overflow-hidden bg-[#FFF7ED] border border-[#FED7AA] flex-shrink-0 cursor-pointer group"
                          >
                            <img src={v.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                              <Play size={16} className="text-white drop-shadow" />
                            </div>
                            {v.duration > 0 && (
                              <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-bold px-1 rounded">
                                {formatDuration(v.duration)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            onClick={() => navigate(`/course/${course._id}/video/${v._id}`)}
                            className="w-24 h-16 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center text-[#EA580C] flex-shrink-0 cursor-pointer hover:bg-[#FED7AA]/40"
                          >
                            <Play size={20} />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h4
                            onClick={() => navigate(`/course/${course._id}/video/${v._id}`)}
                            className={`text-sm font-bold line-clamp-2 cursor-pointer hover:text-[#EA580C] transition ${
                              v.completed ? 'text-[#78716C] line-through' : 'text-[#431407]'
                            }`}
                            title={v.title}
                          >
                            {v.title}
                          </h4>

                          <div className="flex items-center gap-2 text-xs text-[#78716C] mt-1.5 flex-wrap">
                            {v.duration > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock size={11} /> {formatDuration(v.duration)}
                              </span>
                            )}
                            {v.platform && <span>• {v.platform}</span>}
                            {v.completed && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                <Check size={11} /> Completed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side: Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleToggleComplete(v)}
                          className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                            v.completed
                              ? 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200'
                              : 'clay-btn-secondary'
                          }`}
                          title={v.completed ? 'Mark incomplete' : 'Mark complete'}
                        >
                          <CheckCircle2 size={13} className={v.completed ? 'text-green-700' : 'text-[#78716C]'} />
                          <span className="hidden md:inline">{v.completed ? 'Done' : 'Mark Done'}</span>
                        </button>

                        <Link
                          to={`/course/${course._id}/video/${v._id}`}
                          className="clay-btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1"
                        >
                          <Play size={12} fill="currentColor" /> Play
                        </Link>

                        <button
                          onClick={() => setVideoToDelete(v)}
                          className="p-2 rounded-xl text-[#78716C] hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition"
                          title="Delete Lesson"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>

      <Footer />

      {/* ─────────────────────────────────────────────────────────────
          CONFIRM DELETE VIDEO MODAL
         ───────────────────────────────────────────────────────────── */}
      {videoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="clay-card bg-white p-6 sm:p-7 rounded-3xl max-w-md w-full border border-red-200 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-black text-[#431407] mb-2">Delete Video Lesson?</h3>
            <p className="text-xs sm:text-sm text-[#78716C] mb-4 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-[#431407]">"{videoToDelete.title}"</span>? This will permanently remove the record from your course database.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#FED7AA]/50">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setVideoToDelete(null)}
                className="clay-btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteVideo}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CONFIRM DELETE COURSE MODAL
         ───────────────────────────────────────────────────────────── */}
      {showDeleteCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="clay-card bg-white p-6 sm:p-7 rounded-3xl max-w-md w-full border border-red-200 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-black text-[#431407] mb-2">Delete Entire Course?</h3>
            <p className="text-xs sm:text-sm text-[#78716C] mb-4 leading-relaxed">
              Are you sure you want to permanently delete <span className="font-bold text-[#431407]">"{course?.name}"</span> and its associated lessons from the database? This action cannot be reversed.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#FED7AA]/50">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteCourseModal(false)}
                className="clay-btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteCourse}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete Course Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Video */}
      <Modal
        isOpen={showAddVideo}
        onClose={() => setShowAddVideo(false)}
        title="Add Lesson to Course"
        subtitle={`Add a video lesson directly to "${course?.name}"`}
        icon={<Video size={20} className="text-[#EA580C]" />}
      >
        <AddVideoForm
          initialCourse={course?.name}
          courses={course ? [course] : []}
          onAdd={handleAddVideo}
          onClose={() => setShowAddVideo(false)}
        />
      </Modal>

      {/* Modal: Import YouTube Playlist */}
      <Modal
        isOpen={showPlaylistImport}
        onClose={() => {
          setShowPlaylistImport(false);
          loadCourseData();
        }}
        title="Import YouTube Playlist"
        subtitle={`Import an entire playlist into "${course?.name}"`}
        icon={<ListVideo size={20} className="text-[#EA580C]" />}
      >
        <PlaylistImport
          courses={course ? [course] : []}
          onAddVideo={handleAddVideo}
          onSuccess={() => {
            loadCourseData();
            showFeedback('Playlist lessons imported successfully!');
          }}
          onClose={() => {
            setShowPlaylistImport(false);
            loadCourseData();
          }}
        />
      </Modal>
    </div>
  );
}

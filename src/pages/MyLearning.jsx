import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import AddVideoForm from '../components/AddVideoForm';
import AddCourseForm from '../components/AddCourseForm';
import PlaylistImport from '../components/PlaylistImport';
import { courseService, videoService } from '../api/api';
import {
  BookOpen,
  PlayCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowRight,
  Plus,
  Video,
  ListVideo,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { formatDuration } from '../utils/helpers';

export default function MyLearning() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, in-progress, completed

  // Modal states
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showPlaylistImport, setShowPlaylistImport] = useState(false);
  const [isVideoDirty, setIsVideoDirty] = useState(false);
  const [isCourseDirty, setIsCourseDirty] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddVideo = async (v) => {
    try {
      const data = await videoService.create(v);
      setVideos((prev) => [data, ...prev]);
      setShowAddVideo(false);
      setIsVideoDirty(false);
      return data;
    } catch (err) {
      if (err.response?.status !== 409) {
        alert(err.response?.data?.error || 'Failed to add video lesson');
      }
      throw err;
    }
  };

  const handleAddCourse = async (c) => {
    const courseTitle = c?.name ? c.name.trim() : '';
    if (!courseTitle) return;

    // Check local list before submitting
    const alreadyExists = courses.some(
      (existing) => existing.name.toLowerCase().trim() === courseTitle.toLowerCase()
    );
    if (alreadyExists) {
      alert(`A course named "${courseTitle}" already exists in your account.`);
      return;
    }

    try {
      const data = await courseService.create(courseTitle);
      setCourses((prev) => [data, ...prev]);
      setShowAddCourse(false);
      setIsCourseDirty(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add course');
    }
  };

  // Delete course with database persistence
  const confirmDeleteCourse = async () => {
    if (!courseToDelete) return;
    setIsDeleting(true);
    try {
      await courseService.delete(courseToDelete._id);
      setCourses((prev) => prev.filter((c) => c._id !== courseToDelete._id));
      setVideos((prev) =>
        prev.filter((v) => v.courseId !== courseToDelete._id && v.course !== courseToDelete.name)
      );
      setCourseToDelete(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete course from database');
    } finally {
      setIsDeleting(false);
    }
  };

  const loadLearningData = async () => {
    setLoading(true);
    try {
      const [cList, vList] = await Promise.all([
        courseService.getAll(),
        videoService.getAll(),
      ]);
      setCourses(cList || []);
      setVideos(vList || []);
    } catch (err) {
      console.error('Failed to load learning data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLearningData();
  }, []);

  // Compute course statistics
  const coursesWithStats = courses.map((course) => {
    const courseVideos = videos.filter(
      (v) =>
        v.courseId === course._id ||
        String(v.courseId) === String(course._id) ||
        v.course === course.name ||
        v.course === String(course._id)
    );
    const completedVideos = courseVideos.filter((v) => v.completed);
    const totalDuration = courseVideos.reduce((acc, v) => acc + (Number(v.duration) || 0), 0);
    const percent = courseVideos.length > 0
      ? Math.round((completedVideos.length / courseVideos.length) * 100)
      : 0;

    const firstUnwatched = courseVideos.find((v) => !v.completed) || courseVideos[0];

    return {
      ...course,
      totalVideos: courseVideos.length,
      completedVideosCount: completedVideos.length,
      totalDuration,
      percent,
      nextVideo: firstUnwatched,
    };
  });

  const filteredCourses = coursesWithStats.filter((c) => {
    if (filter === 'completed') return c.percent === 100 && c.totalVideos > 0;
    if (filter === 'in-progress') return c.percent < 100 && c.totalVideos > 0;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF7ED]">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-[#431407] tracking-tight">
              My Learning
            </h1>
            <p className="text-sm text-[#78716C] mt-1">
              Your enrolled curricula, imported video playlists, and completion progress.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddVideo(true)}
              className="clay-btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-sm"
              title="Add a video lesson"
            >
              <Plus size={14} /> Add Video
            </button>
            <button
              type="button"
              onClick={() => setShowAddCourse(true)}
              className="clay-btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
              title="Create a new course"
            >
              <Plus size={14} /> New Course
            </button>
            <button
              type="button"
              onClick={() => setShowPlaylistImport(true)}
              className="clay-btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
              title="Import YouTube playlist"
            >
              <ListVideo size={14} /> Import Playlist
            </button>

            <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
              {['all', 'in-progress', 'completed'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                    filter === f
                      ? 'bg-[#EA580C] text-white shadow-sm'
                      : 'bg-white text-[#C2410C] border border-[#FED7AA] hover:bg-[#FFF7ED]'
                  }`}
                >
                  {f.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="clay-card bg-white p-12 text-center text-[#78716C] flex items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-[#EA580C]" /> Loading courses...
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="clay-card bg-white p-12 text-center">
            <BookOpen size={40} className="mx-auto text-[#FED7AA] mb-3" />
            <h3 className="text-lg font-bold text-[#431407]">No courses in this view</h3>
            <p className="text-xs sm:text-sm text-[#78716C] mt-1 max-w-sm mx-auto">
              {filter === 'completed'
                ? "You haven't completed a course yet. Keep up your daily study streak!"
                : 'Browse Categories or import a YouTube playlist to start learning.'}
            </p>
            <Link
              to="/categories"
              className="clay-btn-primary inline-flex items-center gap-1.5 text-xs px-4 py-2.5 mt-4"
            >
              Browse Categories
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((c) => (
              <div
                key={c._id}
                className="clay-card bg-white p-5 flex flex-col justify-between hover:border-[#EA580C] transition group shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                      {c.category ? c.category.replace('-', ' ') : 'Curriculum'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {c.percent === 100 && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
                          <CheckCircle2 size={14} /> Done
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCourseToDelete(c);
                        }}
                        className="p-1 rounded-lg text-[#78716C] hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete Course"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <Link to={`/course/${c._id}`} className="block group-hover:text-[#EA580C] transition">
                    <h3 className="text-lg font-bold text-[#431407] group-hover:text-[#EA580C] line-clamp-1 transition">
                      {c.name}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-3 text-xs text-[#78716C] mt-2 mb-4">
                    <span>{c.totalVideos} {c.totalVideos === 1 ? 'Video' : 'Videos'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {formatDuration(c.totalDuration)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <Link to={`/course/${c._id}`} className="block mb-4">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-[#78716C]">Progress</span>
                      <span className="text-[#EA580C]">{c.percent}%</span>
                    </div>
                    <div className="clay-progress-track">
                      <div
                        className="clay-progress-fill"
                        style={{ width: `${c.percent}%` }}
                      />
                    </div>
                  </Link>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#FED7AA]/40 mt-2">
                  <Link
                    to={`/course/${c._id}`}
                    className="clay-btn-secondary flex-1 text-xs py-2 flex items-center justify-center gap-1 text-center font-bold"
                  >
                    View Details
                  </Link>

                  {c.nextVideo ? (
                    <Link
                      to={`/course/${c._id}/video/${c.nextVideo._id}`}
                      className="clay-btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1.5 text-center font-bold"
                    >
                      <PlayCircle size={14} />
                      {c.percent > 0 && c.percent < 100 ? 'Resume' : 'Start'}
                    </Link>
                  ) : (
                    <Link
                      to={`/course/${c._id}`}
                      className="clay-btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1.5 text-center font-bold"
                    >
                      <Plus size={14} />
                      Add Lesson
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          CONFIRM DELETE COURSE MODAL
         ───────────────────────────────────────────────────────────── */}
      {courseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="clay-card bg-white p-6 sm:p-7 rounded-3xl max-w-md w-full border border-red-200 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-black text-[#431407] mb-2">Delete Course?</h3>
            <p className="text-xs sm:text-sm text-[#78716C] mb-4 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-[#431407]">"{courseToDelete.name}"</span>?
              All associated videos in this course will also be removed permanently from your database.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#FED7AA]/50">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCourseToDelete(null)}
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
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODALS WITH BULLETPROOF CLOSE FUNCTIONALITY
         ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={showAddVideo}
        onClose={() => {
          setShowAddVideo(false);
          setIsVideoDirty(false);
        }}
        title="Add Educational Video"
        subtitle="Add a YouTube or custom video lesson to your curriculum"
        icon={<Video size={20} className="text-[#EA580C]" />}
        isDirty={isVideoDirty}
      >
        <AddVideoForm
          courses={courses}
          onAdd={handleAddVideo}
          onClose={() => {
            setShowAddVideo(false);
            setIsVideoDirty(false);
          }}
          onDirtyChange={setIsVideoDirty}
        />
      </Modal>

      <Modal
        isOpen={showAddCourse}
        onClose={() => {
          setShowAddCourse(false);
          setIsCourseDirty(false);
        }}
        title="Create Learning Course"
        subtitle="Organize your study journey with dedicated course subjects"
        icon={<BookOpen size={20} className="text-[#EA580C]" />}
        isDirty={isCourseDirty}
      >
        <AddCourseForm
          onAdd={handleAddCourse}
          onClose={() => {
            setShowAddCourse(false);
            setIsCourseDirty(false);
          }}
          onDirtyChange={setIsCourseDirty}
        />
      </Modal>

      <Modal
        isOpen={showPlaylistImport}
        onClose={() => {
          setShowPlaylistImport(false);
          loadLearningData();
        }}
        title="Import YouTube Playlist"
        subtitle="Extract video curriculum and durations directly from YouTube"
        icon={<ListVideo size={20} className="text-[#EA580C]" />}
      >
        <PlaylistImport
          courses={courses}
          onAddVideo={handleAddVideo}
          onSuccess={() => loadLearningData()}
          onClose={() => {
            setShowPlaylistImport(false);
            loadLearningData();
          }}
        />
      </Modal>

      <Footer />
    </div>
  );
}

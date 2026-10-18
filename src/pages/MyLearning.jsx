import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { courseService, videoService } from '../api/api';
import { BookOpen, PlayCircle, CheckCircle2, Clock, Loader2, ArrowRight } from 'lucide-react';
import { formatDuration } from '../utils/helpers';

export default function MyLearning() {
  const [courses, setCourses] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, in-progress, completed

  useEffect(() => {
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
    loadLearningData();
  }, []);

  // Compute course statistics
  const coursesWithStats = courses.map((course) => {
    const courseVideos = videos.filter(
      (v) => v.courseId === course._id || v.course === course.name
    );
    const completedVideos = courseVideos.filter((v) => v.completed);
    const totalDuration = courseVideos.reduce((acc, v) => acc + (v.duration || 0), 0);
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
    if (filter === 'completed') return c.percent === 100;
    if (filter === 'in-progress') return c.percent < 100 && c.totalVideos > 0;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF7ED]">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-[#431407] tracking-tight">
              My Learning
            </h1>
            <p className="text-sm text-[#78716C] mt-1">
              Your enrolled curricula, imported video playlists, and completion progress.
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
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
              <div key={c._id} className="clay-card bg-white p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                      {c.category ? c.category.replace('-', ' ') : 'Curriculum'}
                    </span>
                    {c.percent === 100 && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
                        <CheckCircle2 size={14} /> Completed
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-[#431407] line-clamp-1">
                    {c.name}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-[#78716C] mt-2 mb-4">
                    <span>{c.totalVideos} Videos</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {formatDuration(c.totalDuration)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
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
                  </div>
                </div>

                {c.nextVideo ? (
                  <Link
                    to={`/course/${c._id}/video/${c.nextVideo._id}`}
                    className="clay-btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-1.5"
                  >
                    <PlayCircle size={15} />
                    {c.percent > 0 && c.percent < 100 ? 'Continue Watching' : 'Start Course'}
                  </Link>
                ) : (
                  <div className="text-center text-xs text-[#78716C] py-2">
                    No videos assigned yet
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

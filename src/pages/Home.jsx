import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CategoryOnboarding from '../components/CategoryOnboarding';
import Modal from '../components/Modal';
import AddVideoForm from '../components/AddVideoForm';
import AddCourseForm from '../components/AddCourseForm';
import PlaylistImport from '../components/PlaylistImport';
import {
  courseService,
  videoService,
  streakService,
  watchService,
  leaderboardService,
} from '../api/api';
import { useAuth } from '../context/AuthContext';
import { formatDuration } from '../utils/helpers';
import {
  Clock,
  CheckCircle2,
  Flame,
  Trophy,
  PlayCircle,
  ArrowRight,
  BookOpen,
  MessageSquare,
  CheckSquare,
  Grid,
  Sparkles,
  Layers,
  ChevronRight,
  Compass,
  Video,
  ListVideo,
  Plus
} from 'lucide-react';

const CATEGORY_MAP = {
  'government-exams': 'Government Exams',
  'iit-neet': 'IIT / NEET',
  'skills': 'Skills & Career',
  'other': 'General Learning',
};

export default function Home() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [loading, setLoading] = useState(true);
  const [myCourses, setMyCourses] = useState([]);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [videos, setVideos] = useState([]);
  const [streak, setStreak] = useState({ count: 0, lastDate: null });
  const [watchStats, setWatchStats] = useState({
    todaySeconds: 0,
    allTimeSeconds: 0,
    completedVideosCount: 0,
    lastWatched: null,
  });
  const [myLeaderboardRank, setMyLeaderboardRank] = useState(null);

  // Modals state
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showPlaylistImport, setShowPlaylistImport] = useState(false);
  const [isVideoDirty, setIsVideoDirty] = useState(false);
  const [isCourseDirty, setIsCourseDirty] = useState(false);
  const [isPlaylistDirty, setIsPlaylistDirty] = useState(false);

  // Modal action handlers
  const handleAddVideo = async (v) => {
    try {
      const data = await videoService.create(v);
      setVideos((prev) => [data, ...prev]);
      setShowAddVideo(false);
      setIsVideoDirty(false);
      return data;
    } catch (err) {
      if (err.response?.status !== 409) {
        alert(err.response?.data?.error || 'Failed to add video');
      }
      throw err;
    }
  };

  const handleAddCourse = async (c) => {
    const courseTitle = c?.name ? c.name.trim() : '';
    if (!courseTitle) return;

    // Check existing courses for duplicates
    const alreadyExists = myCourses.some(
      (existing) => existing.name.toLowerCase().trim() === courseTitle.toLowerCase()
    );
    if (alreadyExists) {
      alert(`A course named "${courseTitle}" already exists in your account.`);
      return;
    }

    try {
      const data = await courseService.create(courseTitle);
      setMyCourses((prev) => [...prev, data]);
      setRecommendedCourses((prev) => [...prev, data]);
      setShowAddCourse(false);
      setIsCourseDirty(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add course');
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role === 'admin') {
      navigate('/admin');
      return;
    }

    let isMounted = true;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [myCrs, allCrs, vids, strk, wStats, lb] = await Promise.all([
          courseService.getMy().catch(() => []),
          courseService.getAll(user?.category ? { category: user.category } : {}).catch(() => []),
          videoService.getAll().catch(() => []),
          streakService.get().catch(() => null),
          watchService.getStats().catch(() => ({ todaySeconds: 0, allTimeSeconds: 0, completedVideosCount: 0, lastWatched: null })),
          leaderboardService.get('weekly').catch(() => null),
        ]);

        if (!isMounted) return;

        setMyCourses(Array.isArray(myCrs) ? myCrs : []);
        setRecommendedCourses(Array.isArray(allCrs) ? allCrs : []);
        setVideos(Array.isArray(vids) ? vids : []);
        if (strk) setStreak({ count: strk.currentStreak || 0, lastDate: strk.lastActiveDate });
        if (wStats) setWatchStats(wStats);
        if (lb && lb.currentUserRank) setMyLeaderboardRank(lb.currentUserRank);
      } catch (err) {
        console.error('[Dashboard] Failed to fetch dashboard data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, [user?._id, user?.category, navigate]);

  const getTimeGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Determine Continue Learning target video
  const continueVideo = watchStats.lastWatched
    ? videos.find(
        (v) =>
          v.youtubeVideoId === watchStats.lastWatched.videoId ||
          v._id === watchStats.lastWatched.videoId
      ) || videos.find((v) => !v.completed) || videos[0]
    : videos.find((v) => !v.completed) || videos[0];

  const continueCourse = continueVideo
    ? myCourses.find(
        (c) =>
          String(c._id) === String(continueVideo.courseId) ||
          c.name === continueVideo.course ||
          String(c._id) === String(continueVideo.course)
      )
    : null;

  const totalVideos = videos.length;
  const completedVideos = videos.filter((v) => v.completed).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF7ED] text-[#431407]">
      <Navbar />

      {/* Category Onboarding Modal if student category is not set */}
      {user && !user.category && showCategoryOnboarding && (
        <CategoryOnboarding
          onComplete={() => {
            setShowCategoryOnboarding(false);
            refreshUser();
          }}
          onClose={() => setShowCategoryOnboarding(false)}
        />
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* ─────────────────────────────────────────────────────────────
            1. COMPACT WELCOME SECTION
            Student's name and selected learning category
           ───────────────────────────────────────────────────────────── */}
        <section className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-bold text-[#78716C]">
                {getTimeGreeting()},
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-[#431407] tracking-tight">
                {user?.name || 'Student'}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#78716C] flex-wrap">
              <span>Primary Category:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA] text-[11px] font-bold">
                <Sparkles size={11} className="text-[#EA580C]" />
                {CATEGORY_MAP[user?.category] || 'General Curriculum'}
              </span>
              <span>•</span>
              <Link
                to="/categories"
                className="text-xs font-bold text-[#EA580C] hover:underline"
              >
                Change Track
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAddVideo(true)}
              className="clay-btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-sm"
              title="Add a video lesson"
            >
              <Plus size={14} /> Add Video
            </button>
            <button
              onClick={() => setShowAddCourse(true)}
              className="clay-btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
              title="Create a new course"
            >
              <Plus size={14} /> New Course
            </button>
            <button
              onClick={() => setShowPlaylistImport(true)}
              className="clay-btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
              title="Import YouTube playlist"
            >
              <ListVideo size={14} /> Import Playlist
            </button>
            <div className="flex items-center gap-2 text-xs text-[#78716C] bg-[#FFF7ED] px-3.5 py-2 rounded-xl border border-[#FED7AA]">
              <Clock size={14} className="text-[#EA580C]" />
              <span>
                All-Time Focus: <strong className="text-[#431407]">{formatDuration(watchStats.allTimeSeconds || 0)}</strong>
              </span>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            2. PRIMARY ACTIONS
            Continue Learning, Study Tasks, Category Chat, Explore Categories
           ───────────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {continueVideo ? (
            <Link
              to={`/course/${continueCourse?._id || continueVideo.courseId || continueVideo.course}/video/${continueVideo._id}`}
              className="clay-card bg-white border border-[#FED7AA] hover:border-[#EA580C] p-3.5 rounded-2xl flex items-center gap-3 transition shadow-sm group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#EA580C] text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <PlayCircle size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-[#431407] group-hover:text-[#EA580C] transition truncate">
                  Resume Study
                </p>
                <p className="text-[10px] text-[#78716C] truncate">
                  {continueVideo.title}
                </p>
              </div>
            </Link>
          ) : (
            <Link
              to="/my-learning"
              className="clay-card bg-white border border-[#FED7AA] hover:border-[#EA580C] p-3.5 rounded-2xl flex items-center gap-3 transition shadow-sm group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#EA580C] text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <BookOpen size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-[#431407] group-hover:text-[#EA580C] transition truncate">
                  My Learning
                </p>
                <p className="text-[10px] text-[#78716C] truncate">
                  Browse Curricula
                </p>
              </div>
            </Link>
          )}

          <Link
            to="/todos"
            className="clay-card bg-white border border-[#FED7AA] hover:border-[#EA580C] p-3.5 rounded-2xl flex items-center gap-3 transition shadow-sm group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <CheckSquare size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-[#431407] group-hover:text-[#EA580C] transition truncate">
                Study Tasks
              </p>
              <p className="text-[10px] text-[#78716C] truncate">
                Daily Checklists
              </p>
            </div>
          </Link>

          <Link
            to="/chat"
            className="clay-card bg-white border border-[#FED7AA] hover:border-[#EA580C] p-3.5 rounded-2xl flex items-center gap-3 transition shadow-sm group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <MessageSquare size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-[#431407] group-hover:text-[#EA580C] transition truncate">
                Category Chat
              </p>
              <p className="text-[10px] text-[#78716C] truncate">
                Peer Discussions
              </p>
            </div>
          </Link>

          <Link
            to="/categories"
            className="clay-card bg-white border border-[#FED7AA] hover:border-[#EA580C] p-3.5 rounded-2xl flex items-center gap-3 transition shadow-sm group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Grid size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-[#431407] group-hover:text-[#EA580C] transition truncate">
                Categories
              </p>
              <p className="text-[10px] text-[#78716C] truncate">
                Explore Tracks
              </p>
            </div>
          </Link>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            3. LEARNING STATISTICS
            Today's Study, Videos Completed, Day Streak, Leaderboard Rank
           ───────────────────────────────────────────────────────────── */}
        <section>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-4 animate-pulse space-y-2"
                >
                  <div className="h-3 bg-[#FED7AA]/50 rounded w-1/2" />
                  <div className="h-6 bg-[#FED7AA]/80 rounded w-3/4" />
                  <div className="h-2 bg-[#FED7AA]/40 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Stat 1: Today's Study */}
              <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-[#78716C] uppercase tracking-wider mb-2">
                  <Clock size={15} className="text-[#EA580C]" />
                  <span>Today's Study</span>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-[#431407]">
                    {formatDuration(watchStats.todaySeconds || 0)}
                  </p>
                  <p className="text-[10px] text-[#78716C] mt-0.5">
                    Verified session tracking
                  </p>
                </div>
              </div>

              {/* Stat 2: Videos Completed */}
              <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-[#78716C] uppercase tracking-wider mb-2">
                  <CheckCircle2 size={15} className="text-green-600" />
                  <span>Videos Done</span>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-[#431407]">
                    {completedVideos} <span className="text-xs text-[#78716C] font-semibold">/ {totalVideos}</span>
                  </p>
                  <p className="text-[10px] text-[#78716C] mt-0.5">
                    {totalVideos > 0
                      ? `${Math.round((completedVideos / totalVideos) * 100)}% overall completion`
                      : 'No lessons loaded yet'}
                  </p>
                </div>
              </div>

              {/* Stat 3: Day Streak */}
              <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-[#78716C] uppercase tracking-wider mb-2">
                  <Flame size={15} className="text-[#EA580C]" />
                  <span>Day Streak</span>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-[#EA580C]">
                    {streak.count} {streak.count === 1 ? 'Day' : 'Days'}
                  </p>
                  <p className="text-[10px] text-[#78716C] mt-0.5">
                    Daily study streak
                  </p>
                </div>
              </div>

              {/* Stat 4: Leaderboard Rank */}
              <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#78716C] uppercase tracking-wider">
                    <Trophy size={15} className="text-[#C2410C]" />
                    <span>Rank</span>
                  </div>
                  <Link to="/leaderboard" className="text-[10px] font-bold text-[#EA580C] hover:underline">
                    Board →
                  </Link>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-[#431407]">
                    {myLeaderboardRank ? `#${myLeaderboardRank}` : '—'}
                  </p>
                  <p className="text-[10px] text-[#78716C] mt-0.5">
                    Weekly student standing
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ─────────────────────────────────────────────────────────────
            4. CONTINUE LEARNING SECTION
            Showing the last watched video and progress (not oversized)
           ───────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#431407] uppercase tracking-wider flex items-center gap-2">
              <PlayCircle size={16} className="text-[#EA580C]" />
              Continue Learning
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAddVideo(true)}
                className="text-xs font-bold text-[#EA580C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} /> Add Video
              </button>
              {videos.length > 0 && (
                <Link to="/my-learning" className="text-xs font-bold text-[#EA580C] hover:underline flex items-center gap-1">
                  View All Lessons ({videos.length}) <ChevronRight size={13} />
                </Link>
              )}
            </div>
          </div>

          {continueVideo ? (
            <div className="clay-card bg-white border-2 border-[#FED7AA] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA] flex items-center justify-center flex-shrink-0">
                  <PlayCircle size={26} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#C2410C] bg-[#FFF7ED] px-2 py-0.5 rounded border border-[#FED7AA]">
                      {continueVideo.course || 'Learning Track'}
                    </span>
                    {continueVideo.completed && (
                      <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                        Completed
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-[#431407] truncate" title={continueVideo.title}>
                    {continueVideo.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-[#78716C] mt-1">
                    {continueVideo.duration > 0 && (
                      <span>Duration: {formatDuration(continueVideo.duration)}</span>
                    )}
                    {continueVideo.platform && (
                      <span>• {continueVideo.platform}</span>
                    )}
                  </div>
                </div>
              </div>

              <Link
                to={`/course/${continueCourse?._id || continueVideo.courseId || continueVideo.course}/video/${continueVideo._id}`}
                className="clay-btn-primary self-start md:self-center text-xs px-5 py-2.5 flex items-center gap-2 flex-shrink-0 shadow-sm"
              >
                Resume Video <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-8 text-center">
              <PlayCircle size={36} className="mx-auto text-[#FED7AA] mb-2" />
              <p className="text-sm font-bold text-[#431407]">No active study session yet</p>
              <p className="text-xs text-[#78716C] mt-1 max-w-sm mx-auto">
                Explore your category curricula below or check My Learning to begin watching lessons.
              </p>
              <Link
                to="/categories"
                className="clay-btn-primary inline-flex items-center gap-1.5 text-xs px-4 py-2 mt-3"
              >
                Explore Learning Tracks
              </Link>
            </div>
          )}
        </section>

        {/* ─────────────────────────────────────────────────────────────
            5. MY COURSES SECTION
            Enrolled courses and real video completion progress
           ───────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#431407] uppercase tracking-wider flex items-center gap-2">
              <BookOpen size={16} className="text-[#EA580C]" />
              My Enrolled Courses ({myCourses.length})
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAddCourse(true)}
                className="text-xs font-bold text-[#EA580C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} /> New Course
              </button>
              <Link to="/my-learning" className="text-xs font-bold text-[#EA580C] hover:underline flex items-center gap-1">
                Curriculum Hub <ChevronRight size={13} />
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-4 animate-pulse space-y-3">
                  <div className="h-4 bg-[#FED7AA]/60 rounded w-2/3" />
                  <div className="h-2 bg-[#FED7AA]/30 rounded w-full" />
                  <div className="h-8 bg-[#FFF7ED] rounded-xl" />
                </div>
              ))}
            </div>
          ) : myCourses.length === 0 ? (
            <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-8 text-center">
              <BookOpen size={36} className="mx-auto text-[#FED7AA] mb-2" />
              <p className="text-sm font-bold text-[#431407]">No enrolled courses yet</p>
              <p className="text-xs text-[#78716C] mt-1 max-w-md mx-auto">
                You haven't enrolled in any specific course yet. Select a course from the recommended section below to start tracking your progress.
              </p>
              <Link
                to="/categories"
                className="clay-btn-primary inline-flex items-center gap-1.5 text-xs px-4 py-2 mt-3"
              >
                Browse Available Courses
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCourses.map((c) => (
                <div
                  key={c._id}
                  className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-4 flex flex-col justify-between hover:border-[#EA580C] transition shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                        {c.category ? c.category.replace('-', ' ') : 'Track'}
                      </span>
                      <span className="text-xs font-black text-[#EA580C]">
                        {c.progress || 0}%
                      </span>
                    </div>

                    <Link to={`/course/${c._id}`} className="block hover:text-[#EA580C] transition">
                      <h3 className="text-sm font-black text-[#431407] hover:text-[#EA580C] line-clamp-1 transition" title={c.name}>
                        {c.name}
                      </h3>
                    </Link>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#FFF7ED] h-2 rounded-full overflow-hidden border border-[#FED7AA] mt-2 mb-1.5">
                      <div
                        className="bg-[#EA580C] h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(c.progress || 0, 100)}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-[#78716C] font-semibold">
                      {c.completedVideos || 0} of {c.totalVideos || 0} lessons completed
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#FED7AA]/50 mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-[#78716C]">
                      {c.totalVideos > 0 && c.completedVideos === c.totalVideos
                        ? 'Course completed'
                        : 'In progress'}
                    </span>
                    <Link
                      to={`/course/${c._id}`}
                      className="text-xs font-black text-[#EA580C] hover:underline flex items-center gap-1"
                    >
                      Continue <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─────────────────────────────────────────────────────────────
            6. RECENTLY ADDED OR RECOMMENDED LEARNING SECTION
            Curated from active courses in the database
           ───────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#431407] uppercase tracking-wider flex items-center gap-2">
              <Compass size={16} className="text-[#EA580C]" />
              Recommended for {CATEGORY_MAP[user?.category] || 'You'}
            </h2>
            <Link to="/categories" className="text-xs font-bold text-[#EA580C] hover:underline flex items-center gap-1">
              Browse All Categories <ChevronRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-4 animate-pulse space-y-3">
                  <div className="h-28 bg-[#FFF7ED] rounded-xl" />
                  <div className="h-4 bg-[#FED7AA]/60 rounded w-3/4" />
                  <div className="h-3 bg-[#FED7AA]/40 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : recommendedCourses.length === 0 ? (
            <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-8 text-center">
              <BookOpen size={36} className="mx-auto text-[#FED7AA] mb-2" />
              <p className="text-sm font-bold text-[#431407]">No extra courses to show right now</p>
              <p className="text-xs text-[#78716C] mt-1">
                More learning paths and YouTube curricula are added regularly by StudyMate educators.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedCourses.slice(0, 6).map((crs) => (
                <div
                  key={crs._id}
                  className="clay-card bg-white border border-[#FED7AA] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-[#EA580C] transition shadow-sm"
                >
                  <div>
                    {/* Thumbnail banner */}
                    <div className="h-28 bg-[#FFF7ED] relative flex items-center justify-center border-b border-[#FED7AA]/60 overflow-hidden">
                      {crs.thumbnail ? (
                        <img
                          src={crs.thumbnail}
                          alt={crs.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[#EA580C]">
                          <BookOpen size={28} />
                          <span className="text-[10px] font-black uppercase tracking-wider mt-1 text-[#78716C]">
                            {crs.category ? crs.category.replace('-', ' ') : 'Course'}
                          </span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/95 text-[#C2410C] border border-[#FED7AA] shadow-xs">
                          {crs.category ? crs.category.replace('-', ' ') : 'Track'}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-1.5">
                      <h3 className="text-sm font-black text-[#431407] line-clamp-1" title={crs.name}>
                        {crs.name}
                      </h3>
                      {crs.description && (
                        <p className="text-xs text-[#78716C] line-clamp-2 leading-relaxed">
                          {crs.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <Link
                      to="/my-learning"
                      className="clay-btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5 text-center"
                    >
                      Start Curriculum <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* ─────────────────────────────────────────────────────────────
          MODALS WITH COMPLETE CLOSE FUNCTIONALITY
         ───────────────────────────────────────────────────────────── */}
      {/* 1. Add Educational Video Modal */}
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
        maxWidth="max-w-lg"
      >
        <AddVideoForm
          courses={myCourses.length > 0 ? myCourses : recommendedCourses}
          onAddVideo={handleAddVideo}
          onClose={() => {
            setShowAddVideo(false);
            setIsVideoDirty(false);
          }}
          onDirtyChange={setIsVideoDirty}
        />
      </Modal>

      {/* 2. Create New Course Modal */}
      <Modal
        isOpen={showAddCourse}
        onClose={() => {
          setShowAddCourse(false);
          setIsCourseDirty(false);
        }}
        title="Create New Course"
        subtitle="Define a new learning track for your studies"
        icon={<BookOpen size={20} className="text-[#EA580C]" />}
        isDirty={isCourseDirty}
        maxWidth="max-w-md"
      >
        <AddCourseForm
          onAddCourse={handleAddCourse}
          onClose={() => {
            setShowAddCourse(false);
            setIsCourseDirty(false);
          }}
          onDirtyChange={setIsCourseDirty}
        />
      </Modal>

      {/* 3. Playlist Import Modal */}
      <Modal
        isOpen={showPlaylistImport}
        onClose={() => {
          setShowPlaylistImport(false);
          setIsPlaylistDirty(false);
        }}
        title="Import YouTube Playlist"
        subtitle="Auto-fetch videos and verified durations into your courses"
        icon={<ListVideo size={20} className="text-[#EA580C]" />}
        isDirty={isPlaylistDirty}
        maxWidth="max-w-xl"
      >
        <PlaylistImport
          courses={myCourses.length > 0 ? myCourses : recommendedCourses}
          onAddVideo={handleAddVideo}
          onSuccess={() => fetchDashboardData()}
          onClose={() => {
            setShowPlaylistImport(false);
            setIsPlaylistDirty(false);
          }}
          onDirtyChange={setIsPlaylistDirty}
        />
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          7. CLEAN REUSABLE FOOTER
         ───────────────────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}


import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CategoryOnboarding from '../components/CategoryOnboarding';
import TodoSummary from '../components/TodoSummary';
import Pomodoro from '../components/Pomodoro';
import AddCourseForm from '../components/AddCourseForm';
import AddVideoForm from '../components/AddVideoForm';
import VideoCard from '../components/VideoCard';
import FilterBar from '../components/FilterBar';
import Quotes from '../components/Quotes';
import Badges from '../components/Badges';
import PlaylistImport from '../components/PlaylistImport';
import CalendarView from '../components/CalendarView';
import CourseProgress from '../components/CourseProgress';

import { videoService, courseService, streakService, watchService, leaderboardService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { formatDuration } from '../utils/helpers';

import { 
  LayoutDashboard, 
  BookOpen, 
  Trophy, 
  MessageSquare, 
  PlayCircle, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Sparkles, 
  ArrowRight, 
  Plus, 
  Search, 
  Filter,
  BarChart2,
  Calendar,
  Layers,
  GraduationCap
} from 'lucide-react';

const CATEGORY_MAP = {
  'government-exams': 'Government Exam Preparation',
  'iit-neet': 'IIT / NEET Preparation',
  'skills': 'Skills & Career Development',
  'other': 'General Learning',
};

export default function Home() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [videos, setVideos] = useState([]);
  const [streak, setStreak] = useState({ count: 0, lastDate: null });
  const [watchStats, setWatchStats] = useState({ todaySeconds: 0, allTimeSeconds: 0, completedVideosCount: 0, lastWatched: null });
  const [myLeaderboardRank, setMyLeaderboardRank] = useState(null);

  // Tabs for student view
  const [activeTab, setActiveTab] = useState('study'); // 'study', 'courses', 'analytics', 'planner'
  const [filters, setFilters] = useState({ search: '', course: 'All', status: 'Pending', platform: 'All' });
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Modals
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [showPlaylistImport, setShowPlaylistImport] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role === 'admin') { navigate('/admin'); return; }

    let isCancelled = false;

    const loadData = async () => {
      try {
        const [vids, crs, strk, wStats, lb] = await Promise.all([
          videoService.getAll().catch(() => []),
          courseService.getAll().catch(() => []),
          streakService.get().catch(() => null),
          watchService.getStats().catch(() => ({ todaySeconds: 0, allTimeSeconds: 0, completedVideosCount: 0 })),
          leaderboardService.get('weekly').catch(() => null),
        ]);

        if (isCancelled) return;

        setVideos(vids || []);
        setCourses((crs || []).map((c) => ({ id: c._id, name: c.name, category: c.category })));
        if (strk) setStreak({ count: strk.currentStreak, lastDate: strk.lastActiveDate });
        if (wStats) setWatchStats(wStats);
        if (lb && lb.currentUserRank) setMyLeaderboardRank(lb.currentUserRank);
      } catch (err) {
        if (!isCancelled) console.error('[Dashboard] Load failed:', err);
      }
    };

    loadData();
    return () => { isCancelled = true; };
  }, [user?._id]);

  const getTimeGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleAddCourse = async (c) => {
    try {
      const data = await courseService.create(c.name);
      setCourses((prev) => [...prev, { id: data._id, name: data.name }]);
      setShowAddCourse(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add course');
    }
  };

  const handleAddVideo = async (v) => {
    try {
      const data = await videoService.create(v);
      setVideos((prev) => [data, ...prev]);
      setShowAddVideo(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add video');
    }
  };

  const handleToggleComplete = async (v) => {
    try {
      if (v.completed) {
        await videoService.markPending(v._id);
        setVideos((prev) => prev.map((item) => (item._id === v._id ? { ...item, completed: false } : item)));
      } else {
        await videoService.markComplete(v._id);
        setVideos((prev) => prev.map((item) => (item._id === v._id ? { ...item, completed: true } : item)));
      }
    } catch (err) {
      console.error('Toggle complete failed:', err);
    }
  };

  const handleDeleteVideo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    try {
      await videoService.delete(id);
      setVideos((prev) => prev.filter((v) => v._id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const items = Array.from(filteredVideos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const orders = items.map((item, index) => ({ id: item._id, order: index }));
    try {
      await videoService.reorder(orders);
      setVideos((prev) =>
        prev.map((v) => {
          const match = orders.find((o) => o.id === v._id);
          return match ? { ...v, order: match.order } : v;
        })
      );
    } catch (err) {
      console.error('Reorder error:', err);
    }
  };

  // Find Continue Learning video
  const continueVideo = watchStats.lastWatched
    ? videos.find((v) => v.youtubeVideoId === watchStats.lastWatched.videoId || v._id === watchStats.lastWatched.videoId)
    : videos.find((v) => !v.completed) || videos[0];

  // Filtered videos for study table
  const filteredVideos = videos.filter((v) => {
    const matchSearch = (v.title || '').toLowerCase().includes(filters.search.toLowerCase());
    const matchCourse = filters.course === 'All' || v.course === filters.course || v.courseId === filters.course;
    const matchStatus =
      filters.status === 'All' ||
      (filters.status === 'Completed' && v.completed) ||
      (filters.status === 'Pending' && !v.completed);
    const matchPlatform = filters.platform === 'All' || v.platform === filters.platform;
    return matchSearch && matchCourse && matchStatus && matchPlatform;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF7ED]">
      <Navbar />

      {/* Category Onboarding Modal if student category is not set */}
      {user && !user.category && (
        <CategoryOnboarding onComplete={() => refreshUser()} />
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Greeting & Category Header */}
        <div className="clay-card bg-white p-6 sm:p-8 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles size={13} className="text-[#EA580C]" /> Learning Track
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#431407] tracking-tight">
              {getTimeGreeting()}, {user?.name || 'Student'}!
            </h1>
            <p className="text-xs sm:text-sm text-[#78716C] mt-1 flex items-center gap-2">
              <span>Primary Path: <strong className="text-[#EA580C]">{CATEGORY_MAP[user?.category] || 'Custom Path'}</strong></span>
              <span>•</span>
              <Link to="/categories" className="text-xs font-semibold text-[#C2410C] hover:underline">
                Explore All Paths
              </Link>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              to="/chat"
              className="clay-btn-secondary text-xs px-4 py-2.5 flex items-center gap-2"
            >
              <MessageSquare size={15} /> Category Chat
            </Link>
            <Link
              to="/todos"
              className="clay-btn-secondary text-xs px-4 py-2.5 flex items-center gap-2"
            >
              <CheckCircle2 size={15} /> Study Tasks
            </Link>
            <button
              onClick={() => setShowAddVideo(true)}
              className="clay-btn-primary text-xs px-4 py-2.5 flex items-center gap-1.5"
            >
              <Plus size={15} /> Add Video
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="clay-card p-4 sm:p-5 bg-white">
            <div className="flex items-center gap-2 text-[#78716C] text-xs font-bold uppercase mb-1">
              <Clock size={15} className="text-[#EA580C]" /> Today's Study
            </div>
            <p className="text-xl sm:text-2xl font-black text-[#431407]">
              {formatDuration(watchStats.todaySeconds || 0)}
            </p>
            <span className="text-[10px] text-[#78716C]">Verified playback time</span>
          </div>

          <div className="clay-card p-4 sm:p-5 bg-white">
            <div className="flex items-center gap-2 text-[#78716C] text-xs font-bold uppercase mb-1">
              <CheckCircle2 size={15} className="text-green-600" /> Videos Done
            </div>
            <p className="text-xl sm:text-2xl font-black text-[#431407]">
              {videos.filter((v) => v.completed).length} / {videos.length}
            </p>
            <span className="text-[10px] text-[#78716C]">
              {videos.length > 0 ? Math.round((videos.filter((v) => v.completed).length / videos.length) * 100) : 0}% completion
            </span>
          </div>

          <div className="clay-card p-4 sm:p-5 bg-white">
            <div className="flex items-center gap-2 text-[#78716C] text-xs font-bold uppercase mb-1">
              <Flame size={15} className="text-[#EA580C]" /> Day Streak
            </div>
            <p className="text-xl sm:text-2xl font-black text-[#EA580C]">
              {streak.count} {streak.count === 1 ? 'Day' : 'Days'}
            </p>
            <span className="text-[10px] text-[#78716C]">Consistency score</span>
          </div>

          <div className="clay-card p-4 sm:p-5 bg-white">
            <div className="flex items-center gap-2 text-[#78716C] text-xs font-bold uppercase mb-1">
              <Trophy size={15} className="text-[#C2410C]" /> Leaderboard
            </div>
            <p className="text-xl sm:text-2xl font-black text-[#431407]">
              #{myLeaderboardRank || '-'}
            </p>
            <Link to="/leaderboard" className="text-[10px] text-[#EA580C] hover:underline font-bold">
              View Rankings →
            </Link>
          </div>
        </div>

        {/* Continue Learning Banner */}
        {continueVideo && (
          <div className="clay-card-pale p-5 sm:p-6 border-2 border-[#FED7AA] mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EA580C] text-white flex items-center justify-center font-bold flex-shrink-0 shadow-[2px_2px_6px_rgba(154,52,18,0.25)]">
                <PlayCircle size={26} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C2410C] bg-white px-2 py-0.5 rounded-md border border-[#FED7AA]">
                  Continue Learning
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#431407] mt-1.5 truncate">
                  {continueVideo.title}
                </h3>
                <p className="text-xs text-[#78716C] flex items-center gap-2 mt-0.5">
                  <span className="font-semibold text-[#431407]">{continueVideo.course}</span>
                  {continueVideo.duration > 0 && (
                    <>
                      <span>•</span>
                      <span>{formatDuration(continueVideo.duration)}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <Link
              to={`/course/${continueVideo.courseId || continueVideo.course}/video/${continueVideo._id}`}
              className="clay-btn-primary self-start md:self-auto text-xs px-5 py-2.5 flex items-center gap-2 shadow-sm"
            >
              Resume Video <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Grid: Main Study Area + Sidebar Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Area: 2 Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* View Selector Tabs */}
            <div className="flex items-center gap-2 border-b border-[#FED7AA] pb-3">
              {[
                { id: 'study', label: 'Study Table', icon: LayoutDashboard },
                { id: 'courses', label: 'My Courses', icon: BookOpen },
                { id: 'planner', label: 'Calendar Planner', icon: Calendar },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                      isActive
                        ? 'bg-[#EA580C] text-white shadow-sm'
                        : 'bg-white text-[#78716C] border border-[#FED7AA] hover:bg-[#FFF7ED]'
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* TAB 1: Study Table */}
            {activeTab === 'study' && (
              <div>
                <FilterBar
                  filters={filters}
                  setFilters={setFilters}
                  courses={courses}
                  onAddVideo={() => setShowAddVideo(true)}
                  onImportPlaylist={() => setShowPlaylistImport(true)}
                />

                {filteredVideos.length === 0 ? (
                  <div className="clay-card bg-white p-10 text-center">
                    <BookOpen size={36} className="mx-auto text-[#FED7AA] mb-2" />
                    <p className="text-sm font-bold text-[#431407]">No videos match this filter</p>
                    <p className="text-xs text-[#78716C] mt-1">
                      Try resetting filters or import educational playlists from YouTube.
                    </p>
                    <button
                      onClick={() => setShowAddVideo(true)}
                      className="clay-btn-primary text-xs px-4 py-2 mt-4"
                    >
                      + Add New Video
                    </button>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="videos-list">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-3 mt-4"
                        >
                          {filteredVideos.map((video, index) => (
                            <Draggable
                              key={video._id}
                              draggableId={video._id}
                              index={index}
                            >
                              {(prov, snapshot) => (
                                <div
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  {...prov.dragHandleProps}
                                  className={snapshot.isDragging ? 'opacity-80 scale-102' : ''}
                                >
                                  <VideoCard
                                    video={video}
                                    onToggleComplete={() => handleToggleComplete(video)}
                                    onDelete={() => handleDeleteVideo(video._id)}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </div>
            )}

            {/* TAB 2: Courses Manager */}
            {activeTab === 'courses' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-bold text-[#431407]">Enrolled Curricula</h3>
                  <button
                    onClick={() => setShowAddCourse(true)}
                    className="clay-btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Course
                  </button>
                </div>
                <CourseProgress
                  courses={courses}
                  videos={videos}
                  selectedCourse={selectedCourse}
                  setSelectedCourse={setSelectedCourse}
                />
              </div>
            )}

            {/* TAB 3: Calendar View */}
            {activeTab === 'planner' && (
              <div className="clay-card bg-white p-5">
                <CalendarView videos={videos} />
              </div>
            )}
          </div>

          {/* Right Sidebar Widgets */}
          <div className="space-y-6">
            {/* Study To-Do Widget */}
            <TodoSummary />

            {/* Pomodoro Focus Timer */}
            <Pomodoro />

            {/* Motivational Quote */}
            <Quotes />

            {/* Category Community Shortcut */}
            <div className="clay-card bg-white p-5 border-l-4 border-l-[#EA580C]">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={16} className="text-[#EA580C]" />
                <h4 className="text-sm font-bold text-[#431407]">Live Student Discussion</h4>
              </div>
              <p className="text-xs text-[#78716C] leading-relaxed mb-3">
                Connect in real-time with students preparing for {CATEGORY_MAP[user?.category] || 'the same subjects'}.
              </p>
              <Link
                to="/chat"
                className="clay-btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5"
              >
                Join Category Chat →
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Add Course Modal */}
      {showAddCourse && (
        <div className="clay-modal-backdrop">
          <div className="clay-modal-content">
            <h3 className="text-lg font-bold text-[#431407] mb-3">Create New Course</h3>
            <AddCourseForm
              onAdd={handleAddCourse}
              onClose={() => setShowAddCourse(false)}
            />
          </div>
        </div>
      )}

      {/* Add Video Modal */}
      {showAddVideo && (
        <div className="clay-modal-backdrop">
          <div className="clay-modal-content">
            <h3 className="text-lg font-bold text-[#431407] mb-3">Add Educational Video</h3>
            <AddVideoForm
              courses={courses}
              onAdd={handleAddVideo}
              onClose={() => setShowAddVideo(false)}
            />
          </div>
        </div>
      )}

      {/* Playlist Import Modal */}
      {showPlaylistImport && (
        <div className="clay-modal-backdrop">
          <div className="clay-modal-content max-w-xl">
            <h3 className="text-lg font-bold text-[#431407] mb-3">Import YouTube Playlist</h3>
            <PlaylistImport
              courses={courses}
              onComplete={() => {
                setShowPlaylistImport(false);
                videoService.getAll().then((v) => setVideos(v || []));
              }}
              onClose={() => setShowPlaylistImport(false)}
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Dashboard from '../components/Dashboard';
import StreakCard from '../components/StreakCard';
import AddCourseForm from '../components/AddCourseForm';
import AddVideoForm from '../components/AddVideoForm';
import VideoCard from '../components/VideoCard';
import FilterBar from '../components/FilterBar';
import CompletedFeed from '../components/CompletedFeed';
import Quotes from '../components/Quotes';
import Pomodoro from '../components/Pomodoro';
import Badges from '../components/Badges';
import PlaylistImport from '../components/PlaylistImport';
import CalendarView from '../components/CalendarView';
import CourseProgress from '../components/CourseProgress';
import GoalAnalytics from '../components/GoalAnalytics';
import DataTools from '../components/DataTools';
import Confetti from 'react-confetti';
import LiveQuizBanner from '../components/LiveQuizBanner';



import api, { videoService, courseService, streakService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

import { Lightbulb, GripVertical, LayoutDashboard, Video, BarChart2, BookOpen, Settings, Trophy, ShieldAlert, ArrowLeft, PlayCircle, User } from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Study Table', icon: <LayoutDashboard size={18} /> },
  { id: 'quizzes',   label: 'Live Quizzes', icon: <Trophy size={18} />, feature: 'canUseLeaderboard', restricted: true },
  { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={18} />, feature: 'canUseLeaderboard', restricted: true },
  { id: 'courses',   label: 'Course Manager',   icon: <BookOpen size={18} />, feature: 'canAccessCourses', restricted: true },
  { id: 'settings',  label: 'Settings',  icon: <Settings size={18} /> },
];

export default function Home() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [videos, setVideos] = useState([]);
  const [assignedQuizzes, setAssignedQuizzes] = useState([]);
  
  // View state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCourse, setSelectedCourse] = useState(null);
  
  const [streak, setStreak] = useState({ count: 0, lastDate: null });
  const [goalTarget, setGoalTarget] = useState(3);
  const [filters, setFilters] = useState({ search: '', course: 'All', status: 'Pending', platform: 'All' });
  const [randomSuggestion, setRandomSuggestion] = useState(null);

  // Load Initial Data — dep array only contains user._id so this
  // runs exactly once per login, not on every React Router render.
  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role === 'admin') { navigate('/admin'); return; }

    let cancelled = false;

    const loadData = async () => {
      try {
        const [vids, crs, strk, quizzes] = await Promise.all([
          videoService.getAll(),
          courseService.getAll(),
          streakService.get(),
          api.get('/api/quiz/assigned').then(r => r.data).catch(() => []),
          refreshUser(),
        ]);

        if (cancelled) return;

        setVideos(vids);
        setCourses(crs.map(c => ({ id: c._id, name: c.name })));
        setAssignedQuizzes(quizzes);

        if (strk) {
          setStreak({ count: strk.currentStreak, lastDate: strk.lastActiveDate });
        }
      } catch (err) {
        if (!cancelled) console.error('[Dashboard] Failed to load data:', err);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { cancelled = true; };
  }, [user?._id]); // ← navigate is stable; omitting it stops repeated fetches

  useEffect(() => {
    const pending = videos.filter(v => !v.completed);
    setRandomSuggestion(pending.length > 0 ? pending[Math.floor(Math.random() * pending.length)] : null);
  }, [videos]);

  const handleAddCourse = async (c) => {
    try {
      const data = await courseService.create(c.name);
      setCourses(prev => [...prev, { id: data._id, name: data.name }]);
    } catch (err) {
      console.error(err);
      if (err.response?.data?.error === 'Course already exists') {
        alert('Course already exists');
      }
    }
  };

  const handleAddVideo = async (v) => {
    try {
      const data = await videoService.create({
        title: v.title,
        link: v.link,
        platform: v.platform,
        duration: v.duration,
        course: v.course,
        tag: v.tag,
        thumbnail: v.thumbnail,
        order: v.order,
      });
      setVideos(prev => [...prev, data]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Poll for permission/feature updates every 60 seconds (reduced from 30s)
    const pollInterval = setInterval(() => {
      refreshUser().catch(() => {}); // silent fail — network may be flaky
    }, 60000);
    return () => clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleComplete = async (id) => {

    const target = videos.find(v => v._id === id || v.id === id);
    if (!target) return;
    
    const dbId = target._id || target.id;
    const completing = !target.completed;
    
    try {
      const updatedVideo = completing 
        ? await videoService.markComplete(dbId) 
        : await videoService.markPending(dbId);
      
      if (completing) {
        const strk = await streakService.update();
        setStreak({ count: strk.currentStreak, lastDate: strk.lastActiveDate });
      }
      
      setVideos(prev => prev.map(v => ((v._id === dbId || v.id === dbId) ? updatedVideo : v)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateNotes = async (id, notes) => {
    const target = videos.find(v => v._id === id || v.id === id);
    if (!target) return;
    const dbId = target._id || target.id;
    try {
      const data = await videoService.saveNotes(dbId, notes);
      setVideos(prev => prev.map(v => ((v._id === dbId || v.id === dbId) ? data : v)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVideo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    const target = videos.find(v => v._id === id || v.id === id);
    if (!target) return;
    const dbId = target._id || target.id;
    try {
      await videoService.delete(dbId);
      setVideos(prev => prev.filter(v => (v._id !== dbId && v.id !== dbId)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const displayed = getFiltered();
    if (result.source.index === result.destination.index) return;

    const reordered = Array.from(displayed);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    // Update order in state immediately (optimistic UI)
    const idToOrder = reordered.reduce((acc, v, idx) => {
      acc[v._id || v.id] = idx + 1;
      return acc;
    }, {});

    setVideos(prev => prev.map(v => {
      const vid = v._id || v.id;
      return idToOrder[vid] !== undefined ? { ...v, order: idToOrder[vid] } : v;
    }).sort((a, b) => (a.order || 0) - (b.order || 0)));

    // Persist to backend
    try {
      await videoService.reorder(
        reordered.map((v, idx) => ({ id: v._id || v.id, order: idx + 1 }))
      );
    } catch (err) {
      console.error('Failed to save order:', err);
    }
  };

  const getFiltered = () =>
    videos.filter(v => {
      const q = filters.search.toLowerCase();
      const matchSearch = v.title.toLowerCase().includes(q)
                       || (v.tag || '').toLowerCase().includes(q)
                       || (v.notes || '').toLowerCase().includes(q)
                       || v.course.toLowerCase().includes(q);
      const matchCourse = filters.course === 'All' || v.course === filters.course;
      const matchStatus = filters.status === 'All'
                       || (filters.status === 'Completed' && v.completed)
                       || (filters.status === 'Pending' && !v.completed);
      const matchPlatform = filters.platform === 'All' || v.platform === filters.platform;
      return matchSearch && matchCourse && matchStatus && matchPlatform;
    }).sort((a, b) => {
      // Sort by order field (sequence), then completed last
      if (filters.status === 'All') {
        if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
      }
      return (a.order || 0) - (b.order || 0);
    });

  const filteredVideos = getFiltered();
  const completedVideos = videos.filter(v => v.completed);

  // Build sequence map per course (for numbering)
  const courseSequenceMap = {};
  videos
    .filter(v => !v.completed)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach(v => {
      if (!courseSequenceMap[v.course]) courseSequenceMap[v.course] = 0;
      courseSequenceMap[v.course]++;
      v._seqNum = courseSequenceMap[v.course];
    });

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      <Navbar />

      <div className="flex flex-1 max-w-[1600px] mx-auto w-full">
        {/* Modern Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col gap-2 p-6 border-r border-slate-200 dark:border-slate-800/50 sticky top-[69px] h-[calc(100vh-69px)] overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-3">Main Menu</p>
            {TABS.filter(tab => {
              if (tab.restricted && user?.approvalStatus !== 'approved') return false;
              return !tab.feature || user?.features?.[tab.feature] !== false;
            }).map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-3">Quick Links</p>
            {user?.features?.canUseLeaderboard !== false && (
              <Link to="/leaderboard" className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all">
                <Trophy size={18} /> Leaderboard
              </Link>
            )}
            {user?.features?.canUseCommunity !== false && (
              <Link to="/thoughts" className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all">
                <Lightbulb size={18} /> Community
              </Link>
            )}
            <Link to="/profile" className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all">
              <User size={18} /> Profile
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-8 min-w-0">
        {user?.approvalStatus !== 'approved' && (
          <div className="mb-8 p-6 rounded-3xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 flex items-center gap-4 animate-pulse-subtle">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
               <ShieldAlert size={26} />
            </div>
            <div>
                <h3 className="font-black text-amber-800 dark:text-amber-400">Account Approval Pending</h3>
                <p className="text-sm text-amber-600 dark:text-amber-500/80">Some features (Videos, Courses, Quizzes) are hidden until your StudyMate account is approved by an administrator.</p>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {!selectedCourse ? (
              <>
                <LiveQuizBanner />
                <Dashboard videos={videos} />
                
                {/* Continue Learning Banner */}
                {videos.filter(v => !v.completed).length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-black dark:text-white mb-4 flex items-center gap-2">
                      <PlayCircle className="text-blue-500" size={20} /> Continue Learning
                    </h2>
                    {(() => {
                      const nextVideo = videos.filter(v => !v.completed).sort((a,b) => (a.order || 0) - (b.order || 0))[0];
                      return (
                        <div className="glass-card p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-xl hover:-translate-y-1 transition border-blue-100 dark:border-blue-900/30">
                          <div className="flex items-center gap-4">
                            <div className="relative flex-shrink-0 w-32 h-20 rounded-xl overflow-hidden bg-slate-900">
                              {nextVideo.thumbnail ? (
                                <img src={nextVideo.thumbnail} alt="" className="w-full h-full object-cover opacity-80" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-blue-500 bg-blue-900/30"><Video size={24} /></div>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <PlayCircle size={32} className="text-white drop-shadow-lg" />
                              </div>
                            </div>
                            <div>
                              <span className="badge bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-2">Up Next</span>
                              <h3 className="font-bold text-lg dark:text-white line-clamp-1">{nextVideo.title}</h3>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{nextVideo.course}</p>
                            </div>
                          </div>
                          <Link 
                            to={`/course/${nextVideo.course}/video/${nextVideo._id}`}
                            className="btn-primary px-6 py-3 rounded-2xl whitespace-nowrap w-full md:w-auto text-center"
                          >
                            Resume Video
                          </Link>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Course Grid */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black dark:text-white flex items-center gap-3">
                      <BookOpen className="text-blue-500" />
                      My Study Library
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {courses.map(course => {
                      const courseVideos = videos.filter(v => v.course === course.name);
                      const total = courseVideos.length;
                      const completed = courseVideos.filter(v => v.completed).length;
                      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
                      return (
                        <div 
                          key={course.id} 
                          onClick={() => setSelectedCourse({ type: 'youtube', data: course })}
                          className="glass-card p-6 rounded-[2rem] hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1"
                        >
                          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-500 mb-5 group-hover:scale-110 transition shadow-inner">
                            <BookOpen size={28} />
                          </div>
                          <h3 className="font-bold text-lg dark:text-white mb-2 line-clamp-1">{course.name}</h3>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mb-6">
                            <span className="flex items-center gap-1"><Video size={14} /> {total} Lessons</span>
                            <span className="badge bg-green-100 dark:bg-green-900/30 text-green-600 font-bold">{progress}% Done</span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-500" style={{width: `${progress}%`}} />
                          </div>
                        </div>
                      );
                    })}

                    {courses.length === 0 && (
                      <div className="col-span-full py-20 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <BookOpen size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600 opacity-50" />
                        <h3 className="text-xl font-bold dark:text-white">No courses assigned yet</h3>
                        <p className="text-slate-400 mt-2 text-sm max-w-sm mx-auto">You haven't started any courses. Ask your admin to assign you one.</p>
                        <button onClick={() => setActiveTab('courses')} className="mt-6 text-blue-600 dark:text-blue-400 font-black hover:underline flex items-center gap-2 justify-center mx-auto">Browse Courses <ArrowLeft size={16} className="rotate-180" /></button>
                      </div>
                    )}
                  </div>
                </div>

                <Quotes />
                <GoalAnalytics videos={videos} streak={streak.count} goalTarget={goalTarget} onUpdateGoal={setGoalTarget} />
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <CalendarView videos={videos} />
                  <Badges videos={videos} streak={streak.count} />
                </div>
              </>
            ) : (
              <div className="animate-fade-in">
                {/* Back Button */}
                <button 
                  onClick={() => setSelectedCourse(null)}
                  className="mb-8 flex items-center gap-2 text-slate-500 hover:text-orange-500 font-bold transition group"
                >
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition" />
                  Back to All Courses
                </button>

                {selectedCourse?.type === 'youtube' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h2 className="text-3xl font-black dark:text-white capitalize">{selectedCourse.data.name}</h2>
                          <p className="text-slate-500 text-sm mt-1">Course Curriculum &amp; Progress</p>
                        </div>
                        <div className="flex items-center gap-3">
                           <FilterBar filters={filters} setFilters={setFilters} courses={courses} hideCourseFilter />
                        </div>
                      </div>

                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="videos">
                          {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="grid grid-cols-1 gap-4">
                              {videos
                                .filter(v => v.course === selectedCourse.data.name && (!filters.search || v.title.toLowerCase().includes(filters.search.toLowerCase())))
                                .map((video, idx) => {
                                  const vidId = video._id || video.id;
                                  return (
                                    <Draggable key={vidId} draggableId={vidId} index={idx}>
                                      {(prov, snapshot) => (
                                        <div ref={prov.innerRef} {...prov.draggableProps} className={`relative ${snapshot.isDragging ? 'opacity-80 scale-[1.02] z-50 shadow-2xl' : ''} transition-all duration-200`}>
                                          <div {...prov.dragHandleProps} className="absolute top-1/2 -translate-y-1/2 left-3 cursor-grab text-slate-300 dark:text-slate-700 hover:text-blue-400 z-10 p-2" title="Drag to reorder">
                                            <GripVertical size={18} />
                                          </div>
                                          <div className="pl-10">
                                            <VideoCard
                                              video={video}
                                              onToggleComplete={handleToggleComplete}
                                              onUpdateNotes={handleUpdateNotes}
                                              onDelete={handleDeleteVideo}
                                              sequenceNumber={!video.completed ? video._seqNum : undefined}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </div>
                    <div className="space-y-6 pt-[84px]">
                       <StreakCard streak={streak.count} />
                       <AddVideoForm courses={courses} initialCourse={selectedCourse.data.name} onAddVideo={handleAddVideo} />
                       <PlaylistImport courses={courses} onAddVideo={handleAddVideo} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div className="space-y-6">
            <LiveQuizBanner />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignedQuizzes.length > 0 ? assignedQuizzes.map(quiz => {
                if (!quiz) return null;
                const active = quiz.status === 'active';
                return (
                  <div key={quiz._id} className="glass-card p-6 rounded-[2rem] hover:shadow-xl transition-all border-orange-100 dark:border-orange-900/30">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-500">
                        <Trophy size={24} />
                      </div>
                      <span className={`badge text-[10px] font-black uppercase tracking-widest ${active ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                        {active ? 'Live Now' : quiz.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg dark:text-white mb-2">{quiz.title}</h3>
                    <p className="text-xs text-slate-500 mb-6 line-clamp-2">{quiz.description}</p>
                    <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-4">
                      <div className="text-xs font-bold text-slate-400">
                        {quiz.questions?.length || 0} Questions
                      </div>
                      <Link 
                        to={`/quiz/${quiz._id}`}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition ${active ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        onClick={e => !active && e.preventDefault()}
                      >
                        {active ? 'Start Quiz' : 'Unavailable'}
                      </Link>
                    </div>
                  </div>
                );
              }) : (
                <div className="col-span-full glass-card p-12 rounded-[2.5rem] text-center border-dashed border-2 border-slate-200 dark:border-slate-800">
                   <Trophy size={48} className="mx-auto mb-4 text-slate-300 opacity-50" />
                   <h3 className="text-xl font-bold dark:text-white">Quiz Center</h3>
                   <p className="text-slate-500 mt-2">Active quizzes will appear here. Check back frequently for new challenges!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (

          <div className="space-y-6">
            <GoalAnalytics videos={videos} streak={streak.count} goalTarget={goalTarget} onUpdateGoal={setGoalTarget} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CalendarView videos={videos} />
              <Badges videos={videos} streak={streak.count} />
            </div>
            <CompletedFeed videos={completedVideos} />
          </div>
        )}

        {activeTab === 'courses' && (
           <div className="space-y-6">
             <CourseProgress courses={courses} videos={videos} />
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <AddCourseForm onAddCourse={handleAddCourse} />
               <AddVideoForm courses={courses} onAddVideo={handleAddVideo} />
             </div>
           </div>
        )}

        {activeTab === 'settings' && (
           <div className="max-w-2xl mx-auto space-y-6">
             <DataTools videos={videos} courses={courses} setVideos={setVideos} setCourses={setCourses} />
             <div className="glass-card p-6 rounded-2xl bg-orange-50/50 dark:bg-slate-900/50 border border-orange-200 dark:border-slate-800">
               <h3 className="text-lg font-bold mb-4 dark:text-white">Account Info</h3>
               <div className="space-y-3">
                 <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl">
                   <span className="text-sm text-slate-500">Logged in as</span>
                   <span className="font-bold text-orange-500">{user?.name}</span>
                 </div>
                 <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl">
                   <span className="text-sm text-slate-500">Email</span>
                   <span className="font-bold dark:text-white text-sm">{user?.email}</span>
                 </div>
                 <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl">
                   <span className="text-sm text-slate-500">Account Type</span>
                   <span className="badge bg-indigo-100 text-indigo-700 dark:bg-slate-800 dark:text-indigo-400 capitalize">{user?.role}</span>
                 </div>
               </div>
               <div className="mt-4 flex gap-3">
                 <Link to="/profile" className="flex-1 text-center py-2.5 btn-primary rounded-xl text-sm font-bold">
                   Edit Profile
                 </Link>
                 <Link to="/leaderboard" className="flex-1 text-center py-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold hover:bg-indigo-200 dark:hover:bg-indigo-800/30 transition">
                   Leaderboard
                 </Link>
               </div>
             </div>
           </div>
        )}
      </main>
      </div>
      <Footer />
    </div>
  );
}

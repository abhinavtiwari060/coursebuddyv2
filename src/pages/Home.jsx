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
import TelegramVideos from '../components/telegram/TelegramVideos';
import SuggestedPlaylists from '../components/SuggestedPlaylists';

import api, { videoService, courseService, streakService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

import { Lightbulb, GripVertical, LayoutDashboard, Video, BarChart2, BookOpen, Settings, Trophy, User } from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'videos',    label: 'Videos',    icon: <Video size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={18} /> },
  { id: 'courses',   label: 'Courses',   icon: <BookOpen size={18} /> },
  { id: 'settings',  label: 'Settings',  icon: <Settings size={18} /> },
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [videos, setVideos] = useState([]);
  const [videoTab, setVideoTab] = useState('youtube'); // 'youtube' or 'telegram'
  const [streak, setStreak] = useState({ count: 0, lastDate: null });
  const [goalTarget, setGoalTarget] = useState(3);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filters, setFilters] = useState({ search: '', course: 'All', status: 'Pending', platform: 'All' });
  const [randomSuggestion, setRandomSuggestion] = useState(null);

  // Load Initial Data
  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role === 'admin') { navigate('/admin'); return; }

    const loadData = async () => {
      try {
        const [vids, crs, strk] = await Promise.all([
          videoService.getAll(),
          courseService.getAll(),
          streakService.get()
        ]);
        // Videos already come sorted by order from backend
        setVideos(vids);
        setCourses(crs.map(c => ({ id: c._id, name: c.name })));
        
        if (strk) {
          setStreak({ count: strk.currentStreak, lastDate: strk.lastActiveDate });
        }
      } catch (err) {
        console.error("Failed fetching data", err);
      }
    };
    loadData();
  }, [user, navigate]);

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

      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-orange-200/60 dark:border-slate-800 sticky top-[65px] z-10">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
          {user?.features?.canUseLeaderboard !== false && (
            <Link to="/leaderboard" className="flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 border-transparent text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 whitespace-nowrap transition-all">
              <Trophy size={18} /> Leaderboard
            </Link>
          )}
          <Link to="/profile" className="flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 border-transparent text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 whitespace-nowrap transition-all">
            <User size={18} /> Profile
          </Link>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        {activeTab === 'dashboard' && (
          <>
            <SuggestedPlaylists />
            <Dashboard videos={videos} />
            <Quotes />
            <GoalAnalytics videos={videos} streak={streak.count} goalTarget={goalTarget} onUpdateGoal={setGoalTarget} />
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CalendarView videos={videos} />
              <Badges videos={videos} streak={streak.count} />
            </div>
          </>
        )}

        {activeTab === 'videos' && (
          <div className="w-full">
            {/* INNER VIDEO TABS */}
            <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 mb-8">
              <button 
                onClick={() => setVideoTab('youtube')}
                className={`py-3 px-4 font-bold border-b-2 transition-all ${videoTab === 'youtube' ? 'border-orange-500 text-orange-500' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                My Videos
              </button>
              <button 
                onClick={() => setVideoTab('telegram')}
                className={`py-3 px-4 font-bold border-b-2 transition-all ${videoTab === 'telegram' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2'}`}
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" alt="App" className="w-4 h-4 grayscale opacity-50" />
                Telegram Library
              </button>
            </div>

            {videoTab === 'youtube' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {randomSuggestion && (
                <div className="glass-card bg-orange-50/50 dark:bg-slate-800/50 p-5 rounded-2xl flex items-center gap-5 shadow-sm border border-orange-200/50 dark:border-slate-700">
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-500 flex items-center justify-center rounded-2xl flex-shrink-0 animate-bounce-subtle">
                    <Lightbulb size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-black text-orange-500 tracking-wider uppercase">Next to Watch</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">{randomSuggestion.title}</p>
                  </div>
                  <button onClick={() => window.open(randomSuggestion.link, '_blank')} className="btn-primary px-5 py-2.5 rounded-xl font-bold flex-shrink-0 text-sm shadow-sm shadow-orange-500/20">
                    Play
                  </button>
                </div>
              )}

              <FilterBar filters={filters} setFilters={setFilters} courses={courses} />

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="videos">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredVideos.map((video, idx) => {
                        const vidId = video._id || video.id;
                        return (
                          <Draggable key={vidId} draggableId={vidId} index={idx}>
                            {(prov, snapshot) => (
                              <div ref={prov.innerRef} {...prov.draggableProps} className={`relative ${snapshot.isDragging ? 'opacity-80 scale-[1.05] z-50 shadow-2xl' : ''} transition-all duration-200`}>
                                <div {...prov.dragHandleProps} className="absolute top-3 right-3 cursor-grab text-slate-300 dark:text-slate-600 hover:text-orange-400 z-10 p-2" title="Drag to reorder">
                                  <GripVertical size={18} />
                                </div>
                                <VideoCard
                                  video={video}
                                  onToggleComplete={handleToggleComplete}
                                  onUpdateNotes={handleUpdateNotes}
                                  onDelete={handleDeleteVideo}
                                  sequenceNumber={!video.completed ? video._seqNum : undefined}
                                />
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      {filteredVideos.length === 0 && (
                        <div className="col-span-full py-16 text-center font-bold text-slate-400 bg-white/40 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                          {videos.length === 0 ? "You haven't added any videos yet! Start building your curriculum." : "No videos match your filters."}
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            <div className="space-y-6">
              <StreakCard streak={streak.count} />
              {user?.features?.canUsePomodoro !== false && <Pomodoro />}
                <AddVideoForm courses={courses} onAddVideo={handleAddVideo} />
                <PlaylistImport courses={courses} onAddVideo={handleAddVideo} />
              </div>
            </div>
            ) : (
              <TelegramVideos />
            )}
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
      <Footer />
    </div>
  );
}

import { useState, useEffect } from 'react';
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

import api, { videoService, courseService, streakService } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import { Lightbulb, GripVertical, LayoutDashboard, Video, BarChart2, BookOpen, LogOut, Settings } from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'videos',    label: 'Videos',    icon: <Video size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={18} /> },
  { id: 'courses',   label: 'Courses',   icon: <BookOpen size={18} /> },
  { id: 'settings',  label: 'Settings',  icon: <Settings size={18} /> },
];

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // API State
  const [courses, setCourses] = useState([]);
  const [videos, setVideos] = useState([]);
  const [streak, setStreak] = useState({ count: 0, lastDate: null }); // Hardcoded streak for now or derived from DB
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

  // Handlers mappings to API
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
        thumbnail: v.thumbnail
      });
      setVideos(prev => [data, ...prev]);
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
    const dbId = target._id || target.id;
    try {
      await videoService.delete(dbId);
      setVideos(prev => prev.filter(v => (v._id !== dbId && v.id !== dbId)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragEnd = (result) => {
    // Local reorder only for instant UX feeling, saving array order to DB is complex for a single step
    if (!result.destination) return;
    const displayed = getFiltered();
    const moved = displayed[result.source.index];
    const target = displayed[result.destination.index];
    if (!moved || !target) return;
    setVideos(prev => {
      const idxA = prev.findIndex(v => v._id === moved._id);
      const idxB = prev.findIndex(v => v._id === target._id);
      const next = [...prev];
      [next[idxA], next[idxB]] = [next[idxB], next[idxA]];
      return next;
    });
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
    }).sort((a, b) => Number(b.completed) - Number(a.completed));

  const filteredVideos = getFiltered();
  const completedVideos = videos.filter(v => v.completed);

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      {/* Small top right Logout for User */}
      <button onClick={logout} className="absolute top-4 right-20 z-50 px-3 py-1.5 flex items-center gap-1 bg-red-50 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition shadow-sm border border-red-100">
        <LogOut size={12}/> EXIT
      </button>

      <Navbar />

      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-orange-200/60 dark:border-slate-800 sticky top-[65px] z-10">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        {activeTab === 'dashboard' && (
          <>
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
                                <VideoCard video={video} onToggleComplete={handleToggleComplete} onUpdateNotes={handleUpdateNotes} onDelete={handleDeleteVideo} />
                              </div>
                            )}
                          </Draggable>
                        )
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
              <Pomodoro />
              <AddCourseForm onAddCourse={handleAddCourse} />
              <AddVideoForm courses={courses} onAddVideo={handleAddVideo} />
              <PlaylistImport courses={courses} onAddVideo={handleAddVideo} />
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
           <div className="max-w-2xl mx-auto">
             <DataTools videos={videos} courses={courses} setVideos={setVideos} setCourses={setCourses} />
             <div className="glass-card p-6 rounded-2xl bg-orange-50/50 dark:bg-slate-900/50 border border-orange-200 dark:border-slate-800">
               <h3 className="text-lg font-bold mb-2 dark:text-white">Account Info</h3>
               <div className="space-y-2">
                 <p className="text-sm dark:text-slate-300">Logged in as: <span className="font-bold text-orange-500">{user?.name}</span></p>
                 <p className="text-sm dark:text-slate-300">Email: <span className="font-bold">{user?.email}</span></p>
                 <p className="text-sm dark:text-slate-300">Account Type: <span className="badge bg-indigo-100 text-indigo-700 dark:bg-slate-800 dark:text-indigo-400 capitalize">{user?.role}</span></p>
               </div>
             </div>
           </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

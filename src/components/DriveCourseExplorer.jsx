import { useState, useEffect } from 'react';
import { 
  Folder, Play, ChevronRight, ChevronDown, 
  CheckCircle2, Clock, HardDrive, Search,
  PlayCircle, FileVideo, FolderPlus, Layers, Loader2,
  ExternalLink
} from 'lucide-react';
import { driveService } from '../api/api';
import { useNavigate } from 'react-router-dom';

export default function DriveCourseExplorer({ initialCourse = null }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(!initialCourse);
  const [selectedCourse, setSelectedCourse] = useState(initialCourse);
  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [search, setSearch] = useState('');
  
  // Hierarchy state
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  useEffect(() => {
    if (initialCourse) {
      handleSelectCourse(initialCourse);
    }
    fetchCourses();
  }, [initialCourse]);

  const fetchCourses = async () => {
    try {
      const data = await driveService.getCourses();
      setCourses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [videoCache, setVideoCache] = useState({});

  const handleSelectCourse = async (course) => {
    setSelectedCourse(course);
    setExpandedFolders(new Set()); // Reset on new course
    
    if (videoCache[course.folderId]) {
      setVideos(videoCache[course.folderId]);
      return;
    }

    setLoadingVideos(true);
    try {
      const data = await driveService.getVideos(course.folderId);
      setVideos(data);
      setVideoCache(prev => ({ ...prev, [course.folderId]: data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVideos(false);
    }
  };

  const toggleFolder = (path) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // Reconstruct hierarchy from flat list
  const buildTree = (vids) => {
    const root = { name: 'root', subs: {}, videos: [] };
    
    vids.forEach(v => {
      // pathParts: [CourseName, SubjectName, ChapterName, ...]
      // We skip pathParts[0] as it's the root course name
      let current = root;
      const parts = v.pathParts.slice(1); 
      
      parts.forEach(part => {
        if (!current.subs[part]) {
          current.subs[part] = { name: part, subs: {}, videos: [] };
        }
        current = current.subs[part];
      });
      current.videos.push(v);
    });
    return root;
  };

  const renderTree = (node, path = '', level = 0) => {
    const subNames = Object.keys(node.subs).sort();
    const sortedVideos = node.videos.sort((a,b) => a.driveOrder - b.driveOrder);

    return (
      <div key={path || 'root'} className={level > 0 ? 'ml-4 mt-2' : ''}>
        {/* Render Folders First */}
        {subNames.map(name => {
          const currentPath = path ? `${path}/${name}` : name;
          const isExpanded = expandedFolders.has(currentPath);
          return (
            <div key={currentPath} className="mb-1">
              <button 
                onClick={() => toggleFolder(currentPath)}
                className="w-full flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-left transition"
              >
                {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                <Folder size={18} className="text-blue-500 fill-blue-500/10" />
                <span className="font-bold text-sm dark:text-slate-200">{name}</span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 ml-auto">
                  {Object.keys(node.subs[name].subs).length + node.subs[name].videos.length} items
                </span>
              </button>
              {isExpanded && renderTree(node.subs[name], currentPath, level + 1)}
            </div>
          );
        })}

        {/* Render Videos & Images */}
        {sortedVideos.map(v => {
          const isImage = v.mimeType.startsWith('image/');
          return (
            <div 
              key={v.fileId} 
              onClick={() => {
                if (isImage) {
                  // Show image in new tab or modal
                  window.open(`${import.meta.env.VITE_API_URL || ''}/api/drive/stream/${v.fileId}`, '_blank');
                } else {
                  navigate(`/drive/video/${v.fileId}`);
                }
              }}
              className="flex items-center gap-3 p-2.5 ml-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer group transition border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
            >
              <div className="relative">
                {v.thumbnail ? (
                  <img src={v.thumbnail} className="w-14 h-9 object-cover rounded-lg shadow-sm group-hover:scale-105 transition" alt="" />
                ) : (
                  <div className={`w-14 h-9 rounded-lg flex items-center justify-center ${isImage ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-500' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-500'}`}>
                    {isImage ? <Layers size={14} /> : <FileVideo size={14} />}
                  </div>
                )}
                {v.progress?.completed && (
                  <div className="absolute -top-1.5 -right-1.5 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                    <CheckCircle2 size={10} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold dark:text-slate-200 truncate group-hover:text-blue-500 transition ${isImage ? 'italic' : ''}`}>{v.title}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  {!isImage && (
                    <span className="flex items-center gap-0.5"><Clock size={10} /> {v.duration ? `${Math.floor(v.duration / 60)}m` : '--:--'}</span>
                  )}
                  {isImage && <span className="uppercase font-black text-[8px] text-purple-400 tracking-widest">Image Asset</span>}
                  {v.progress?.watchPosition > 0 && !v.progress.completed && (
                    <span className="text-blue-500 font-bold">Resuming at {Math.floor(v.progress.watchPosition / 60)}m</span>
                  )}
                </div>
              </div>
              {isImage ? (
                <ExternalLink size={16} className="text-slate-300 group-hover:text-purple-500 transition" />
              ) : (
                <PlayCircle size={18} className="text-slate-300 group-hover:text-blue-500 group-hover:scale-110 transition" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar: Course List (Hide if initialCourse provided) */}
      {!initialCourse && (
        <div className="lg:col-span-1 border-r border-slate-200 dark:border-slate-800 pr-4">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 px-2">
            <HardDrive size={14} /> Drive Courses
          </h3>
          <div className="space-y-1">
            {courses.map(c => (
              <button
                key={c.folderId}
                onClick={() => handleSelectCourse(c)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition text-left group ${
                  selectedCourse?.folderId === c.folderId 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className={`p-2 rounded-xl flex-shrink-0 ${
                  selectedCourse?.folderId === c.folderId ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'
                }`}>
                  <FolderPlus size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{c.folderName}</p>
                  <p className={`text-[10px] uppercase font-bold opacity-70 ${selectedCourse?.folderId === c.folderId ? 'text-blue-100' : 'text-slate-400'}`}>
                    {c.totalVideos} Videos
                  </p>
                </div>
              </button>
            ))}
            {courses.length === 0 && (
               <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                 <p className="text-xs text-slate-400 italic">No Drive courses available yet.</p>
               </div>
            )}
          </div>
        </div>
      )}

      {/* Main: Content Explorer */}
      <div className={initialCourse ? 'lg:col-span-4' : 'lg:col-span-3'}>
        {!selectedCourse ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-12">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 text-slate-400">
              <Layers size={40} />
            </div>
            <h3 className="text-xl font-bold dark:text-white">Select a Drive Course</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm">
              Choose a course from the sidebar to explore its structured content directly from Google Drive.
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Folder Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <HardDrive size={28} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black dark:text-white">{selectedCourse.folderName}</h2>
                    <p className="text-sm text-slate-500">{selectedCourse.description || 'Structured learning path'}</p>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search within course..."
                      className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-400 w-48 transition-all focus:w-64"
                    />
                 </div>
              </div>
            </div>

            {/* Hierarchy Tree */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-4 min-h-[400px]">
              {loadingVideos ? (
                 <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-blue-500" />
                 </div>
              ) : (
                renderTree(buildTree(videos.filter(v => 
                  v.title.toLowerCase().includes(search.toLowerCase()) || 
                  v.pathParts.some(p => p.toLowerCase().includes(search.toLowerCase()))
                )))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

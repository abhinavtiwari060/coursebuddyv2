import { Download, Upload } from 'lucide-react';
import { useRef } from 'react';

export default function DataTools({ videos, courses, setVideos, setCourses }) {
  const fileRef = useRef(null);

  const exportJSON = () => {
    const data = {
      videos,
      courses,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StudyMate_Backup_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.videos && data.courses) {
          if (confirm('This will replace your current data. Proceed?')) {
            setVideos(data.videos);
            setCourses(data.courses);
            alert('Data restored successfully!');
          }
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
      <h3 className="text-lg font-bold mb-4 dark:text-white">Data Management</h3>
      <div className="flex gap-4">
        <button 
          onClick={exportJSON}
          className="flex-1 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium rounded-xl border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex justify-center items-center gap-2 transition-colors"
        >
          <Download size={18} /> Export Backup
        </button>
        <button 
          onClick={() => fileRef.current.click()}
          className="flex-1 py-2 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 flex justify-center items-center gap-2 transition-colors"
        >
          <Upload size={18} /> Import Backup
        </button>
        <input type="file" accept=".json" className="hidden" ref={fileRef} onChange={importJSON} />
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { 
  HardDrive, Plus, RefreshCw, Trash2, ExternalLink, 
  CheckCircle2, AlertCircle, Loader2, Info
} from 'lucide-react';
import { driveService } from '../api/api';

export default function AdminDriveManager() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [syncingIds, setSyncingIds] = useState(new Set());

  useEffect(() => {
    fetchFolders();
    const interval = setInterval(fetchFolders, 10000); // Polling for sync status
    return () => clearInterval(interval);
  }, []);

  const fetchFolders = async () => {
    try {
      const data = await driveService.getFolders();
      setFolders(data);
    } catch (err) {
      console.error('Failed to fetch drive folders', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFolder = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setIsAdding(true);
    try {
      await driveService.addFolder({ url, name, description });
      setUrl('');
      setName('');
      setDescription('');
      fetchFolders();
      alert('Drive folder added! Scanning started in background.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add folder');
    } finally {
      setIsAdding(false);
    }
  };

  const handleSync = async (id) => {
    setSyncingIds(prev => new Set(prev).add(id));
    try {
      await driveService.syncFolder(id);
      fetchFolders();
    } catch (err) {
      alert(err.response?.data?.error || 'Sync failed');
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure? This will remove the course and all associated video metadata.')) return;
    try {
      await driveService.deleteFolder(id);
      setFolders(folders.filter(f => f._id !== id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <HardDrive size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black dark:text-white">Google Drive Integration</h2>
            <p className="text-xs text-slate-500 mt-0.5">Import structured courses directly from shared Google Drive folders.</p>
          </div>
        </div>

        <form onSubmit={handleAddFolder} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Drive Folder URL</label>
            <input
              required
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/YOUR_FOLDER_ID"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Course Name</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Masterclass in Web Dev"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Short Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief overview..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white text-sm"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isAdding}
              className="btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition disabled:opacity-50"
            >
              {isAdding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Import Drive Folder
            </button>
          </div>
        </form>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-black text-lg dark:text-white">Managed Drive Courses</h3>
          <button onClick={fetchFolders} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {folders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic">No Drive folders added yet. Import your first coarse above!</div>
          ) : (
            folders.map(f => (
              <div key={f._id} className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-[250px]">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold dark:text-white">{f.folderName}</h4>
                      {f.syncStatus === 'done' && <CheckCircle2 size={14} className="text-green-500" />}
                      {f.syncStatus === 'syncing' && <RefreshCw size={14} className="text-blue-500 animate-spin" />}
                      {f.syncStatus === 'error' && <AlertCircle size={14} className="text-red-500" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">{f.description || 'No description'}</p>
                    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>{f.totalVideos} Videos Detected</span>
                      <span>Last Synced: {f.lastSynced ? new Date(f.lastSynced).toLocaleString() : 'Never'}</span>
                    </div>
                    {f.syncError && (
                      <div className="mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-[10px] border border-red-100 dark:border-red-900/30">
                        Error: {f.syncError}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <a 
                      href={f.folderUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-500 rounded-lg transition"
                      title="Open in Drive"
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button
                      onClick={() => handleSync(f._id)}
                      disabled={syncingIds.has(f._id) || f.syncStatus === 'syncing'}
                      className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-green-500 rounded-lg transition disabled:opacity-50"
                      title="Re-sync"
                    >
                      <RefreshCw size={16} className={syncingIds.has(f._id) || f.syncStatus === 'syncing' ? 'animate-spin' : ''} />
                    </button>
                    <button
                      onClick={() => handleDelete(f._id)}
                      className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Info size={14} className="text-slate-400" />
          <p className="text-[10px] text-slate-500">Note: Folders must be public or shared with the service account for the sync to work properly.</p>
        </div>
      </div>
    </div>
  );
}

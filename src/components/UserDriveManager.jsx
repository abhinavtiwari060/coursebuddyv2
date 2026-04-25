import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { HardDrive, Link as LinkIcon, Loader2, CheckCircle2, Plus, AlertTriangle } from 'lucide-react';
import api from '../api/api';

export default function UserDriveManager() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [driveUrl, setDriveUrl] = useState('');
  const [driveName, setDriveName] = useState('');
  
  // Since we don't return the full user obj with tokens for security,
  // we can check if they have connected by trying to fetch the auth URL
  // Or we just add a "Connect Drive" button that redirects.
  
  const handleConnect = async () => {
    setLoading(true);
    try {
      const { url } = await api.get('/api/drive/auth/url').then(r => r.data);
      window.location.href = url;
    } catch (err) {
      alert('Failed to get auth URL');
      setLoading(false);
    }
  };

  const handleAddFolder = async (e) => {
    e.preventDefault();
    if (!driveUrl) return;
    setAdding(true);
    try {
      await api.post('/api/drive/user/add', { url: driveUrl, name: driveName });
      alert('Folder added successfully! It will appear in your Drive Courses shortly.');
      setDriveUrl('');
      setDriveName('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add folder');
    } finally {
      setAdding(false);
    }
  };

  // We check URL params to see if drive=success
  const urlParams = new URLSearchParams(window.location.search);
  const driveStatus = urlParams.get('drive');

  return (
    <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-xl">
          <HardDrive size={24} />
        </div>
        <div>
          <h3 className="font-bold text-lg dark:text-white">Google Drive Integration</h3>
          <p className="text-xs text-slate-500">Connect your drive to import personal courses</p>
        </div>
      </div>

      {driveStatus === 'success' && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm font-bold rounded-xl border border-green-200 dark:border-green-800 flex items-center gap-2">
          <CheckCircle2 size={16} /> Drive connected successfully!
        </div>
      )}
      
      {driveStatus === 'error' && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2">
          <AlertTriangle size={16} /> Failed to connect Drive.
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl font-bold text-sm transition dark:text-white"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <LinkIcon size={16} />}
          Connect Google Drive Account
        </button>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <h4 className="font-bold text-sm mb-3 dark:text-white">Import Drive Folder</h4>
          <form onSubmit={handleAddFolder} className="space-y-3">
            <input
              required
              value={driveName}
              onChange={e => setDriveName(e.target.value)}
              placeholder="Course / Folder Name"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition dark:text-white"
            />
            <input
              required
              type="url"
              value={driveUrl}
              onChange={e => setDriveUrl(e.target.value)}
              placeholder="Google Drive Folder URL"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition dark:text-white"
            />
            <p className="text-xs text-slate-500 italic">Make sure the folder is shared with "Anyone with the link can view".</p>
            <button
              type="submit"
              disabled={adding}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition disabled:opacity-50"
            >
              {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Import Course
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

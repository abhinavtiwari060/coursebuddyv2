import { useState, useEffect } from 'react';
import { Settings, Users, Save, Loader2 } from 'lucide-react';
import { adminService, settingsService } from '../api/api';

export default function AdminUserLimit() {
  const [maxUsers, setMaxUsers] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const config = await settingsService.getSettings();
      if (config.max_users) {
        setMaxUsers(config.max_users);
      }
    } catch (err) {
      console.error('Failed to load settings');
    }
  };

  const handleSave = async () => {
    if (!maxUsers) return;
    setSaving(true);
    try {
      await adminService.setMaxUsers(maxUsers);
      alert('Max users limit updated successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to update max users.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl dark:bg-emerald-900/30 dark:text-emerald-400">
          <Users size={20} />
        </div>
        <h2 className="text-xl font-black dark:text-white">User Limit Control</h2>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Set the maximum number of registered users allowed on the platform. After this limit, new signups will be blocked.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Max Accounts Allowed</label>
          <input
            type="number"
            value={maxUsers}
            onChange={(e) => setMaxUsers(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:text-white"
            placeholder="e.g. 500"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !maxUsers}
          className="w-full btn-primary py-3 rounded-xl font-bold flex justify-center items-center gap-2"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Save Limit</>}
        </button>
      </div>
    </div>
  );
}

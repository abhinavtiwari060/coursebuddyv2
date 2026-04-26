import { useState, useEffect } from 'react';
import { adminService } from '../api/api';
import { CheckCircle2, XCircle, Trash2, Clock, Loader2 } from 'lucide-react';

export default function AdminDeleteRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const data = await adminService.getDeleteRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Are you sure? This will permanently delete the item.")) return;
    setActionLoading(id);
    try {
      await adminService.approveDeleteRequest(id);
      setRequests(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      alert("Failed to approve request: " + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await adminService.rejectDeleteRequest(id);
      setRequests(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      alert("Failed to reject request: " + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <Trash2 className="text-red-500" size={24} /> Delete Requests
          </h2>
          <p className="text-slate-500 text-sm mt-1">Review items users want to delete.</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-700">
          <CheckCircle2 className="mx-auto text-green-500 mb-3" size={32} />
          <p className="text-slate-500 font-medium">No pending delete requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req._id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                    {req.itemType}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={12} /> {new Date(req.requestedAt).toLocaleString()}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white truncate">{req.itemName}</h3>
                <p className="text-xs text-slate-500">Requested by: <span className="font-semibold text-slate-700 dark:text-slate-300">{req.userName}</span></p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleReject(req._id)}
                  disabled={actionLoading === req._id}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition disabled:opacity-50"
                >
                  <XCircle size={16} /> Reject
                </button>
                <button
                  onClick={() => handleApprove(req._id)}
                  disabled={actionLoading === req._id}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition shadow-sm disabled:opacity-50"
                >
                  {actionLoading === req._id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Approve Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

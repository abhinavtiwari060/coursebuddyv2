import { useState, useEffect } from 'react';
import {
  Compass,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Check,
  X,
  User,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { categoryRequestService } from '../api/api';

const CATEGORY_NAMES = {
  'government-exams': 'Government Exams',
  'iit-neet': 'IIT / NEET',
  'skills': 'Skills & Career',
  'other': 'General / Other',
};

export default function AdminCategoryRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await categoryRequestService.adminGetAll();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load category requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reqItem) => {
    const studentName = reqItem.userId?.name || 'this student';
    const newCat = CATEGORY_NAMES[reqItem.requestedCategory] || reqItem.requestedCategory;
    if (
      !window.confirm(
        `Approve category change for ${studentName}?\n\nThey will be moved to "${newCat}". Their old chat room access will be revoked immediately and they will join the "${newCat}" room.`
      )
    ) {
      return;
    }

    setProcessingId(reqItem._id);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await categoryRequestService.adminApprove(reqItem._id);
      setRequests((prev) =>
        prev.map((r) =>
          r._id === reqItem._id
            ? { ...r, status: 'approved', reviewedAt: new Date() }
            : r
        )
      );
      setActionSuccess(res.message || 'Category change approved successfully!');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reqItem) => {
    const studentName = reqItem.userId?.name || 'this student';
    if (!window.confirm(`Reject category change request for ${studentName}?`)) {
      return;
    }

    setProcessingId(reqItem._id);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await categoryRequestService.adminReject(reqItem._id);
      setRequests((prev) =>
        prev.map((r) =>
          r._id === reqItem._id
            ? { ...r, status: 'rejected', reviewedAt: new Date() }
            : r
        )
      );
      setActionSuccess(res.message || 'Category change request rejected.');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = requests.filter((r) => {
    const studentName = r.userId?.name || '';
    const studentEmail = r.userId?.email || '';
    const matchSearch =
      studentName.toLowerCase().includes(search.toLowerCase()) ||
      studentEmail.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-5">
      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Control bar */}
      <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-1 items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name or email..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-[#431407] focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-[#78716C]" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs font-bold bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-[#431407] focus:outline-none"
            >
              <option value="all">All Requests ({requests.length})</option>
              <option value="pending">Pending Review ({pendingCount})</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-xs font-bold text-[#EA580C] flex items-center gap-1.5 self-start sm:self-auto">
          <Clock size={14} />
          <span>{pendingCount} Pending Requests</span>
        </div>
      </div>

      {/* Table / List */}
      {loading ? (
        <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-12 text-center text-[#78716C] flex items-center justify-center gap-2">
          <Loader2 size={20} className="animate-spin text-[#EA580C]" /> Loading category requests...
        </div>
      ) : filtered.length === 0 ? (
        <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl p-12 text-center">
          <Compass size={40} className="mx-auto text-[#FED7AA] mb-2" />
          <h3 className="text-base font-black text-[#431407]">No category change requests</h3>
          <p className="text-xs text-[#78716C] mt-1 max-w-sm mx-auto">
            {search || filterStatus !== 'all'
              ? 'No requests match your current filters.'
              : 'Students can request category changes from their profile, which will appear here for admin review.'}
          </p>
        </div>
      ) : (
        <div className="clay-card bg-white border border-[#FED7AA] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FFF7ED] border-b border-[#FED7AA] text-[#78716C] font-black uppercase tracking-wider text-[11px]">
                  <th className="p-4">Student</th>
                  <th className="p-4">Current Category</th>
                  <th className="p-4">Requested Category</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FED7AA]/50">
                {filtered.map((item) => {
                  const isProcessing = processingId === item._id;
                  const isPending = item.status === 'pending';

                  return (
                    <tr key={item._id} className="hover:bg-[#FFF7ED]/40 transition">
                      {/* Student */}
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-[#EA580C] font-black flex items-center justify-center flex-shrink-0">
                            {item.userId?.name?.slice(0, 2).toUpperCase() || 'ST'}
                          </div>
                          <div>
                            <p className="font-black text-[#431407]">
                              {item.userId?.name || 'Unknown Student'}
                            </p>
                            <p className="text-[11px] text-[#78716C]">{item.userId?.email || '—'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Current Category */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]">
                          {CATEGORY_NAMES[item.currentCategory] || item.currentCategory}
                        </span>
                      </td>

                      {/* Requested Category */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                          {CATEGORY_NAMES[item.requestedCategory] || item.requestedCategory}
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="p-4 max-w-xs">
                        <p className="text-[#431407] line-clamp-2 italic" title={item.reason}>
                          {item.reason ? `"${item.reason}"` : <span className="text-[#A8A29E]">No reason specified</span>}
                        </p>
                      </td>

                      {/* Date */}
                      <td className="p-4 text-[#78716C] whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            item.status === 'approved'
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : item.status === 'rejected'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleApprove(item)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center gap-1 transition shadow-xs disabled:opacity-50"
                              title="Approve category change and migrate chat room"
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              onClick={() => handleReject(item)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold flex items-center gap-1 transition disabled:opacity-50"
                              title="Reject request"
                            >
                              <X size={13} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#A8A29E]">
                            Processed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

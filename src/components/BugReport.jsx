import { useState } from 'react';
import api from '../api/api';
import Modal from './Modal';
import { Bug, AlertTriangle, CheckCircle, Send, Loader2 } from 'lucide-react';

const SEVERITIES = [
  { value: 'low', label: '🟢 Low – Minor issue', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'medium', label: '🟡 Medium – Affects workflow', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'high', label: '🟠 High – Blocks a feature', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'critical', label: '🔴 Critical – App is broken', color: 'bg-red-100 text-red-700 border-red-300' },
];

export default function BugReport({ onClose }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: 'medium',
    steps: '',
    browser: navigator.userAgent.split(' ').slice(-2).join(' '),
  });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const isFormDirty = Boolean(form.title.trim() || form.description.trim() || form.steps.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setStatus('loading');
    try {
      await api.post('/api/bug-report', form).then(r => r.data);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit. Try again.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Report Sent! 🎉"
        subtitle="Thank you for helping make StudyMate better"
        icon={<CheckCircle size={20} className="text-green-500" />}
        maxWidth="max-w-md"
      >
        <div className="text-center py-4 space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
            <CheckCircle size={36} />
          </div>
          <p className="text-xs text-[#78716C] leading-relaxed max-w-sm mx-auto">
            Your bug report has been forwarded directly to the dev team. We will review and patch this promptly!
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="clay-btn-primary px-8 py-2.5 text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Report a Bug"
      subtitle="Sent directly to the StudyMate developer team"
      icon={<Bug size={20} className="text-[#EA580C]" />}
      isDirty={isFormDirty}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#431407] mb-1">
            Bug Title <span className="text-red-500">*</span>
          </label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Mark Complete button doesn't work"
            required
            className="w-full px-3.5 py-2.5 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-xs text-[#431407] focus:outline-none focus:ring-2 focus:ring-[#EA580C] transition"
          />
        </div>

        {/* Severity */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#431407] mb-1.5">
            Severity <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SEVERITIES.map(s => (
              <label
                key={s.value}
                className={`flex items-center gap-2 p-2.5 border-2 rounded-xl cursor-pointer text-xs font-bold transition ${
                  form.severity === s.value
                    ? s.color + ' border-current'
                    : 'border-[#FED7AA]/60 bg-white text-[#78716C] hover:bg-[#FFF7ED]/50'
                }`}
              >
                <input
                  type="radio"
                  name="severity"
                  value={s.value}
                  checked={form.severity === s.value}
                  onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                  className="hidden"
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#431407] mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            required
            placeholder="Describe what happened and what you expected..."
            rows={3}
            className="w-full px-3.5 py-2.5 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-xs text-[#431407] focus:outline-none focus:ring-2 focus:ring-[#EA580C] transition resize-none"
          />
        </div>

        {/* Steps */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#431407] mb-1">
            Steps to Reproduce <span className="normal-case font-normal text-[#78716C]">(optional)</span>
          </label>
          <textarea
            value={form.steps}
            onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
            placeholder="1. Go to Videos tab&#10;2. Click Mark as Done&#10;3. Nothing happens"
            rows={2}
            className="w-full px-3.5 py-2.5 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-xs text-[#431407] focus:outline-none focus:ring-2 focus:ring-[#EA580C] transition resize-none"
          />
        </div>

        {/* Browser info */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#78716C] mb-1">
            Browser / Device
          </label>
          <input
            value={form.browser}
            onChange={e => setForm(f => ({ ...f, browser: e.target.value }))}
            className="w-full px-3.5 py-2 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-xs text-[#78716C] focus:outline-none"
          />
        </div>

        {status === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
            <AlertTriangle size={15} /> {errorMsg}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#FED7AA]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#78716C] hover:bg-[#FFF7ED] rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={status === 'loading' || !form.title.trim() || !form.description.trim()}
            className="clay-btn-primary px-5 py-2 text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {status === 'loading' ? (
              <><Loader2 size={14} className="animate-spin" /> Sending...</>
            ) : (
              <><Send size={14} /> Submit Report</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}


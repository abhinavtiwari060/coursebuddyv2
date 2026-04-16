import { useState } from 'react';
import api from '../api/api';
import { Bug, AlertTriangle, CheckCircle, Send, ChevronDown, Loader2 } from 'lucide-react';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setStatus('loading');
    try {
      const data = await api.post('/api/bug-report', form).then(r => r.data);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit. Try again.');
      setStatus('error');
    }
  };

  if (status === 'success') return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-black dark:text-white mb-2">Report Sent! 🎉</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          Your bug report has been sent to the admin. Thank you for helping make Course Buddy better!
        </p>
        <button
          onClick={onClose}
          className="btn-primary px-8 py-3 rounded-xl font-bold"
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg my-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Bug size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Report a Bug</h2>
              <p className="text-white/70 text-xs">Sent directly to the dev team</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white transition"
          >✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Bug Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Mark Complete button doesn't work"
              required
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Severity *</label>
            <div className="grid grid-cols-2 gap-2">
              {SEVERITIES.map(s => (
                <label
                  key={s.value}
                  className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer text-xs font-bold transition ${
                    form.severity === s.value ? s.color + ' border-current' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Description *</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              required
              placeholder="Describe what happened and what you expected..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition resize-none"
            />
          </div>

          {/* Steps */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Steps to Reproduce <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={form.steps}
              onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
              placeholder="1. Go to Videos tab&#10;2. Click Mark as Done&#10;3. Nothing happens"
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition resize-none"
            />
          </div>

          {/* Browser info */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Browser / Device</label>
            <input
              value={form.browser}
              onChange={e => setForm(f => ({ ...f, browser: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
            />
          </div>

          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 text-sm">
              <AlertTriangle size={16} /> {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading' || !form.title || !form.description}
            className="w-full py-3 btn-primary rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? (
              <><Loader2 size={18} className="animate-spin" /> Sending...</>
            ) : (
              <><Send size={18} /> Submit Bug Report</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

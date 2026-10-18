import { useState, useEffect } from 'react';
import { detectPlatform } from '../utils/helpers';
import { Video, Plus } from 'lucide-react';

export default function AddVideoForm({
  courses = [],
  onAddVideo,
  onAdd,
  onClose,
  onDirtyChange,
  standalone = false,
}) {
  const [formData, setFormData] = useState({
    title: '',
    link: '',
    hours: '0',
    minutes: '0',
    seconds: '0',
    course: '',
    tag: '',
  });

  const addHandler = onAddVideo || onAdd;

  // Report dirty state to parent / modal
  useEffect(() => {
    const isDirty = Boolean(
      formData.title.trim() ||
      formData.link.trim() ||
      formData.tag.trim() ||
      formData.course
    );
    if (onDirtyChange) {
      onDirtyChange(isDirty);
    }
  }, [formData, onDirtyChange]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.link || !formData.course) return;

    const totalSeconds =
      (parseInt(formData.hours || 0, 10) * 3600) +
      (parseInt(formData.minutes || 0, 10) * 60) +
      parseInt(formData.seconds || 0, 10);

    if (totalSeconds <= 0) {
      alert('Please enter a valid duration greater than 0 seconds.');
      return;
    }

    if (addHandler) {
      addHandler({
        id: Date.now().toString(),
        title: formData.title.trim(),
        link: formData.link.trim(),
        platform: detectPlatform(formData.link.trim()),
        duration: totalSeconds,
        course: formData.course,
        tag: formData.tag.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
        notes: '',
        order: Date.now(),
        thumbnail:
          detectPlatform(formData.link.trim()) === 'YouTube'
            ? `https://i.ytimg.com/vi/${extractVideoId(formData.link.trim())}/mqdefault.jpg`
            : null,
      });
    }

    setFormData({
      title: '',
      link: '',
      hours: '0',
      minutes: '0',
      seconds: '0',
      course: formData.course,
      tag: '',
    });
    if (onDirtyChange) onDirtyChange(false);
  };

  function extractVideoId(url) {
    try {
      const u = new URL(url);
      if (u.hostname === 'youtu.be') return u.pathname.slice(1);
      return u.searchParams.get('v') || null;
    } catch {
      return null;
    }
  }

  const inputCls =
    'w-full text-xs sm:text-sm bg-[#FFF7ED] border border-[#FED7AA] rounded-xl px-3.5 py-2.5 text-[#431407] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#EA580C] transition';
  const numCls =
    'w-full text-xs sm:text-sm bg-[#FFF7ED] border border-[#FED7AA] rounded-xl px-2 py-2 text-center text-[#431407] focus:outline-none focus:ring-2 focus:ring-[#EA580C] transition font-bold';

  const content = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Title */}
      <div>
        <label className="block text-xs font-bold text-[#431407] uppercase tracking-wider mb-1">
          Video Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Chapter 1: Introduction to Mechanics"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={inputCls}
        />
      </div>

      {/* Link */}
      <div>
        <label className="block text-xs font-bold text-[#431407] uppercase tracking-wider mb-1">
          Video URL (YouTube or Telegram) <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          required
          value={formData.link}
          onChange={(e) => setFormData({ ...formData, link: e.target.value })}
          className={inputCls}
        />
      </div>

      {/* Course & Tag */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-[#431407] uppercase tracking-wider mb-1">
            Target Course <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.course}
            onChange={(e) => setFormData({ ...formData, course: e.target.value })}
            className={`${inputCls} appearance-none font-medium cursor-pointer`}
          >
            <option value="" disabled>Select Course Track</option>
            {courses.map((c) => (
              <option key={c.id || c._id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#431407] uppercase tracking-wider mb-1">
            Topic Tag (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Physics, Arrays, Calculus"
            value={formData.tag}
            onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-xs font-bold text-[#431407] uppercase tracking-wider mb-1">
          Duration (HH:MM:SS) <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <input
              type="number"
              min="0"
              placeholder="HH"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              className={numCls}
            />
            <span className="block text-[10px] text-center text-[#78716C] mt-0.5">Hours</span>
          </div>
          <span className="text-[#EA580C] font-bold text-lg mb-3">:</span>
          <div className="flex-1">
            <input
              type="number"
              min="0"
              max="59"
              placeholder="MM"
              value={formData.minutes}
              onChange={(e) => setFormData({ ...formData, minutes: e.target.value })}
              className={numCls}
            />
            <span className="block text-[10px] text-center text-[#78716C] mt-0.5">Mins</span>
          </div>
          <span className="text-[#EA580C] font-bold text-lg mb-3">:</span>
          <div className="flex-1">
            <input
              type="number"
              min="0"
              max="59"
              placeholder="SS"
              value={formData.seconds}
              onChange={(e) => setFormData({ ...formData, seconds: e.target.value })}
              className={numCls}
            />
            <span className="block text-[10px] text-center text-[#78716C] mt-0.5">Secs</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#FED7AA] mt-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#78716C] hover:text-[#431407] hover:bg-[#FFF7ED] rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="clay-btn-primary px-5 py-2.5 text-xs font-black flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Plus size={14} /> Add Video
        </button>
      </div>
    </form>
  );

  if (standalone) {
    return (
      <div className="clay-card bg-white border border-[#FED7AA] p-6 rounded-2xl relative">
        <h3 className="text-lg font-black text-[#431407] mb-4 flex items-center gap-2">
          <Video size={20} className="text-[#EA580C]" />
          Add Educational Video
        </h3>
        {content}
      </div>
    );
  }

  return content;
}


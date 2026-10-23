import { useState, useEffect } from 'react';
import { PlusCircle, Plus } from 'lucide-react';

export default function AddCourseForm({
  onAddCourse,
  onAdd,
  onClose,
  onDirtyChange,
  standalone = false,
}) {
  const [name, setName] = useState('');
  const addHandler = onAddCourse || onAdd;

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(Boolean(name.trim()));
    }
  }, [name, onDirtyChange]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalized = name.trim().replace(/\s+/g, ' ');
    if (!normalized) return;
    if (addHandler) {
      addHandler({ name: normalized });
    }
    setName('');
    if (onDirtyChange) onDirtyChange(false);
  };

  const content = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-bold text-[#431407] uppercase tracking-wider mb-1">
          Course Track Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Data Structures & Algorithms, Physics I"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full text-xs sm:text-sm bg-[#FFF7ED] border border-[#FED7AA] rounded-xl px-3.5 py-2.5 text-[#431407] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#EA580C] transition"
          required
          autoFocus
        />
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#FED7AA]">
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
          <Plus size={14} /> Create Course
        </button>
      </div>
    </form>
  );

  if (standalone) {
    return (
      <div className="clay-card bg-white border border-[#FED7AA] p-6 rounded-2xl relative">
        <h3 className="text-lg font-black text-[#431407] mb-4 flex items-center gap-2">
          <PlusCircle size={20} className="text-[#EA580C]" />
          Create New Course
        </h3>
        {content}
      </div>
    );
  }

  return content;
}


import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Atom, Code, Compass, CheckCircle2, Loader2, Sparkles, X } from 'lucide-react';

export const CATEGORIES = [
  {
    id: 'government-exams',
    title: 'Government Exam Preparation',
    description: 'Prepare for government jobs and competitive examinations.',
    examples: ['SSC', 'UPSC', 'Banking', 'Railway', 'State Govt Exams', 'Recruitment'],
    icon: GraduationCap,
  },
  {
    id: 'iit-neet',
    title: 'IIT / NEET Preparation',
    description: 'Prepare for engineering and medical entrance examinations.',
    examples: ['JEE Main', 'JEE Advanced', 'NEET UG', 'Physics', 'Chemistry', 'Maths', 'Biology'],
    icon: Atom,
  },
  {
    id: 'skills',
    title: 'Skills & Career Development',
    description: 'Learn technical skills, programming, and job-ready concepts.',
    examples: ['Web Dev', 'Full Stack', 'DSA', 'Programming', 'AI/ML', 'Data Science', 'DBMS', 'Aptitude'],
    icon: Code,
  },
  {
    id: 'other',
    title: 'Other',
    description: 'Explore other subjects, foundational learning, and specialized interests.',
    examples: ['General Learning', 'Languages', 'Productivity', 'Self-paced exploration'],
    icon: Compass,
  },
];

export default function CategoryOnboarding({ onComplete, onClose }) {
  const { user, updateUserCategory } = useAuth();
  const [selectedId, setSelectedId] = useState(user?.category || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const backdropRef = useRef(null);

  // Keyboard navigation: Escape key handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleContinue = async () => {
    if (!selectedId) {
      setError('Please choose a learning path to continue.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateUserCategory(selectedId);
      if (onComplete) {
        onComplete(selectedId);
      }
    } catch (err) {
      console.error('Failed to save category:', err);
      setError(err.response?.data?.error || 'Could not save category. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={backdropRef}
      onClick={(e) => {
        if (onClose && e.target === backdropRef.current) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#431407]/40 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl clay-card bg-white p-6 sm:p-10 my-8 relative"
      >
        {/* Top-right close button if dismissible */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-5 right-5 w-8 h-8 rounded-xl flex items-center justify-center text-[#78716C] hover:text-[#431407] hover:bg-[#FFF7ED] border border-transparent hover:border-[#FED7AA] transition cursor-pointer"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        )}

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles size={14} className="text-[#EA580C]" /> Personalize Your Study
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#431407] tracking-tight">
            What are you preparing for?
          </h2>
          <p className="text-[#78716C] mt-2 text-sm sm:text-base">
            Choose your learning path to personalize your StudyMate experience. You can always explore other categories anytime.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium text-center">
            {error}
          </div>
        )}

        {/* 4 Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedId === cat.id;

            return (
              <div
                key={cat.id}
                onClick={() => {
                  setSelectedId(cat.id);
                  setError('');
                }}
                className={`relative p-5 sm:p-6 rounded-2xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#FFF7ED] border-2 border-[#EA580C] shadow-[0_0_0_1px_#EA580C,4px_4px_12px_rgba(234,88,12,0.12)]'
                    : 'bg-white border border-[#FED7AA] hover:border-[#FB923C] hover:bg-[#FFF7ED]/40 shadow-[2px_2px_8px_rgba(154,52,18,0.06)]'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#EA580C] text-white shadow-[2px_2px_6px_rgba(154,52,18,0.3)]'
                        : 'bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]'
                    }`}
                  >
                    <Icon size={24} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-bold text-[#431407] truncate">
                        {cat.title}
                      </h3>
                      {isSelected && (
                        <CheckCircle2 size={20} className="text-[#EA580C] flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-[#78716C] mt-1 leading-relaxed">
                      {cat.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {cat.examples.slice(0, 5).map((ex, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-white border border-[#FED7AA] text-[11px] font-medium text-[#C2410C]"
                        >
                          {ex}
                        </span>
                      ))}
                      {cat.examples.length > 5 && (
                        <span className="px-1.5 py-0.5 text-[11px] text-[#78716C]">
                          +{cat.examples.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-[#FED7AA]">
          <p className="text-xs text-[#78716C] order-2 sm:order-1">
            You can modify this anytime in Profile settings.
          </p>
          <button
            onClick={handleContinue}
            disabled={saving || !selectedId}
            className="w-full sm:w-auto clay-btn-primary px-8 py-3 text-sm sm:text-base order-1 sm:order-2 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving Learning Path...
              </>
            ) : (
              'Continue to StudyMate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

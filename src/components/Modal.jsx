import { useEffect, useRef, useState, useCallback } from 'react';
import { X, AlertTriangle } from 'lucide-react';

/**
 * Reusable StudyMate Modal Component
 * 
 * Supports:
 * - Top-right (×) Close button with aria-label="Close dialog"
 * - Escape key dismissal
 * - Click outside (backdrop) dismissal without triggering on inside clicks
 * - Safe unsaved changes confirmation ("Discard Changes" / "Keep Editing")
 * - Sticky header so close button stays visible when content scrolls
 * - Mobile responsive max-h-[90vh] overflow handling
 * - Zero gradients, orange-and-white StudyMate theme
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  isDirty = false,
  maxWidth = 'max-w-lg',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className = '',
}) {
  const backdropRef = useRef(null);
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);

  // Check whether form is dirty
  const checkIsDirty = useCallback(() => {
    if (typeof isDirty === 'function') {
      try {
        return Boolean(isDirty());
      } catch {
        return false;
      }
    }
    return Boolean(isDirty);
  }, [isDirty]);

  // Handle safe close request
  const handleAttemptClose = useCallback(() => {
    if (showConfirmDiscard) {
      // If discard confirmation is already open, cancel it and stay in form
      setShowConfirmDiscard(false);
      return;
    }

    if (checkIsDirty()) {
      setShowConfirmDiscard(true);
    } else {
      if (onClose) onClose();
    }
  }, [checkIsDirty, onClose, showConfirmDiscard]);

  // Confirm discard of changes
  const handleConfirmDiscard = () => {
    setShowConfirmDiscard(false);
    if (onClose) onClose();
  };

  // Cancel discard and keep editing
  const handleCancelDiscard = () => {
    setShowConfirmDiscard(false);
  };

  // Keyboard navigation: Escape key handling
  useEffect(() => {
    if (!isOpen) {
      setShowConfirmDiscard(false);
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault();
        e.stopPropagation();
        if (showConfirmDiscard) {
          setShowConfirmDiscard(false);
        } else {
          handleAttemptClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, showConfirmDiscard, handleAttemptClose]);

  // Lock document body scroll while modal is active
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === backdropRef.current) {
          handleAttemptClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#431407]/40 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`clay-card bg-white border-2 border-[#FED7AA] rounded-2xl sm:rounded-3xl shadow-2xl w-full ${maxWidth} relative flex flex-col max-h-[90vh] overflow-hidden animate-scaleUp ${className}`}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-[#FED7AA]/60 bg-white sticky top-0 z-20 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center flex-shrink-0 text-[#EA580C]">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3
                  id="modal-title"
                  className="text-base sm:text-lg font-black text-[#431407] truncate"
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[11px] sm:text-xs text-[#78716C] truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={handleAttemptClose}
              aria-label="Close dialog"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[#78716C] hover:text-[#431407] hover:bg-[#FFF7ED] border border-transparent hover:border-[#FED7AA] transition-colors cursor-pointer flex-shrink-0 ml-auto"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Nested Confirmation Overlay for Unsaved Changes */}
        {showConfirmDiscard && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 z-30 bg-white/95 backdrop-blur-xs flex items-center justify-center p-6 animate-fadeIn rounded-2xl sm:rounded-3xl"
          >
            <div className="text-center max-w-sm w-full space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="text-base font-black text-[#431407]">
                  Discard unsaved changes?
                </h4>
                <p className="text-xs text-[#78716C] mt-1.5 leading-relaxed">
                  You have entered unsaved information in this form. If you close now, your progress will be lost.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelDiscard}
                  className="flex-1 px-4 py-2 text-xs font-bold text-[#431407] bg-white border border-[#FED7AA] hover:bg-[#FFF7ED] rounded-xl transition cursor-pointer"
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDiscard}
                  className="flex-1 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition cursor-pointer shadow-sm"
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Tailwind max-width Klasse, z.B. "max-w-lg". Standard: max-w-lg. */
  maxWidth?: string;
}

/**
 * Schlichtes, zugängliches Modal. Schließt bei Klick auf den Backdrop und
 * mit Escape. Body-Scroll wird gesperrt, solange das Modal offen ist.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/40 px-3 py-4 sm:px-4 sm:py-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidth} rounded-xl bg-white shadow-xl my-auto`}
        role="dialog"
        aria-modal="true"
        style={{ marginBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="text-base font-semibold text-gray-900 min-w-0 truncate">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 -mr-1.5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-2xl leading-none"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>
        <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
      </div>
    </div>
  );
}

/**
 * src/components/ui/Modal.tsx — reusable, themed dialog.
 *
 * Structure mirrors the app's design language (6px button radii, no pill
 * corners). Opens with a fade + zoom entrance and plays the reverse on close
 * before unmounting. Handles Escape, backdrop click, and body scroll lock.
 * Content is portaled to <body> so it always layers above the app.
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg';

const sizeClass: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional sub-header shown under the title. */
  description?: string;
  size?: ModalSize;
  /** Right-aligned action bar rendered below the body, above a top border. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const EXIT_MS = 180; // must match the panel/backdrop transition duration

export function Modal({ open, onClose, title, description, size = 'md', footer, children }: ModalProps) {
  // Keep the node mounted during the exit animation, then drop it.
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${sizeClass[size]} rounded-xl overflow-hidden bg-[rgb(var(--bg-elevated))] border border-[rgb(var(--border))] shadow-2xl transition-all duration-200 ease-out ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-[rgb(var(--border-subtle))]">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[rgb(var(--text-primary))]">{title}</h2>
            {description && <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 shrink-0 rounded-full border border-[rgb(var(--border))] bg-[var(--hover-bg)] text-[rgb(var(--text-muted))] flex items-center justify-center transition-all duration-150 hover:text-[rgb(var(--text-primary))] hover:bg-[var(--hover-bg-strong)] hover:border-[rgb(var(--text-secondary))]"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pt-5 pb-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[rgb(var(--border-subtle))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
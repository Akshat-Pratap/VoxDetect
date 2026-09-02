/**
 * src/components/alerts/AlertToast.tsx
 * Sonner-style toast (neutral card, colored icon + title, circle close button).
 * No countdown bar, no accent bars — compact, quiet, matches app tokens.
 */
import React from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import type { ToastAlert } from '@/types';

interface Props {
  toast: ToastAlert;
  leaving?: boolean;
  onDismiss: (id: string) => void;
}

type SeverityStyle = {
  icon: React.ReactNode;
  fg: string;
};

const STYLES: Record<ToastAlert['type'], SeverityStyle> = {
  critical_risk: {
    icon: <AlertOctagon className="w-4 h-4" strokeWidth={2} />,
    fg: 'rgb(var(--risk-critical))',
  },
  high_risk: {
    icon: <AlertTriangle className="w-4 h-4" strokeWidth={2} />,
    fg: 'rgb(var(--risk-high))',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4" strokeWidth={2} />,
    fg: 'rgb(var(--risk-critical))',
  },
  success: {
    icon: <CheckCircle2 className="w-4 h-4" strokeWidth={2} />,
    fg: 'rgb(var(--accent))',
  },
  info: {
    icon: <Info className="w-4 h-4" strokeWidth={2} />,
    fg: 'rgb(var(--accent-soft))',
  },
};

export function AlertToast({ toast, leaving = false, onDismiss }: Props) {
  const s = STYLES[toast.type];

  return (
    <div
      role="status"
      aria-live="assertive"
      className={`${leaving ? 'alert-exit' : 'alert-enter'} relative flex items-center gap-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] px-4 py-4 text-[13px] text-[rgb(var(--text-primary))]`}
      style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}
    >
      {/* Icon (16px, accent colored) */}
      <div className="h-4 w-4 shrink-0 flex items-center" style={{ color: s.fg }}>
        {s.icon}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="font-medium leading-[1.5] break-words" style={{ color: s.fg }}>
          {toast.title}
        </div>
        <div className="text-[12.5px] leading-[1.4] text-[rgb(var(--text-secondary))] break-words">
          {toast.message}
        </div>
        {toast.detail && (
          <div className="text-[11px] leading-[1.4] text-[rgb(var(--text-muted))] break-words">
            {toast.detail}
          </div>
        )}
        {toast.action && (
          <button
            className="mt-1.5 ml-auto h-6 rounded px-2 text-[12px] font-medium text-[rgb(var(--accent))] bg-[rgb(var(--accent))/0.12] hover:bg-[rgb(var(--accent))/0.2] transition-colors"
            onClick={() => onDismiss(toast.id)}
          >
            {toast.action}
          </button>
        )}
      </div>

      {/* Close button — circle, half outside the card, like sonner */}
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="absolute -top-1 -right-1 z-10 h-5 w-5 flex items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[var(--hover-bg-strong)] transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
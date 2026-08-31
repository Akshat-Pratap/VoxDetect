/**
 * src/components/alerts/AlertToast.tsx
 */
import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import type { ToastAlert } from '@/types';

interface Props {
  toast: ToastAlert;
  onDismiss: (id: string) => void;
}

export function AlertToast({ toast, onDismiss }: Props) {
  const isHighOrCrit = toast.type === 'high_risk' || toast.type === 'critical_risk';

  return (
    <div
      className={`alert-enter w-96 p-4 rounded-xl shadow-lg border backdrop-blur-md flex gap-3 transition-all ${
        toast.type === 'critical_risk'
          ? 'bg-red-950/90 border-red-500/50 text-red-200'
          : toast.type === 'high_risk'
          ? 'bg-red-900/80 border-red-500/40 text-red-100'
          : toast.type === 'error'
          ? 'bg-red-950/80 border-red-800 text-red-200'
          : toast.type === 'success'
          ? 'bg-green-950/80 border-green-700 text-green-200'
          : 'bg-bg-elevated/95 border-bg-border text-text-primary'
      }`}
    >
      <div className="mt-0.5 shrink-0">
        {toast.type === 'critical_risk' || toast.type === 'high_risk' ? (
          <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
        ) : toast.type === 'error' ? (
          <AlertCircle className="w-5 h-5 text-red-400" />
        ) : toast.type === 'success' ? (
          <CheckCircle className="w-5 h-5 text-green-400" />
        ) : (
          <Info className="w-5 h-5 text-accent" />
        )}
      </div>
      <div className="flex-1 text-sm">
        <div className="font-bold flex items-center justify-between">
          <span>{toast.title}</span>
          {toast.score !== undefined && (
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/40 border border-white/10">
              Score: {toast.score}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs opacity-90">{toast.message}</p>
        {toast.action && (
          <div className="mt-2 text-xs font-semibold p-2 bg-black/30 rounded border border-white/10 text-white">
            Action: {toast.action}
          </div>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-text-muted hover:text-text-primary p-1 shrink-0 h-fit"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

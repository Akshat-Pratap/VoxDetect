/**
 * src/components/ui/ErrorState.tsx
 */
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  title?: string;
  message: string;
  details?: string[];
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, details, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <div className="w-10 h-10 rounded-md bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center">
        <AlertTriangle className="w-4 h-4 text-[rgb(var(--risk-critical))]" />
      </div>
      <div>
        <h3 className="text-xs font-semibold text-[rgb(var(--text-primary))] mb-1">{title}</h3>
        <p className="text-[11px] text-[rgb(var(--text-muted))] max-w-sm">{message}</p>
        {details && (
          <ul className="mt-2 text-left text-[11px] text-[rgb(var(--text-muted))] space-y-1">
            {details.map((d, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                {d}
              </li>
            ))}
          </ul>
        )}
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-ghost btn-sm gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
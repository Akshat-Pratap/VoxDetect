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
    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-red-400" />
      </div>
      <div>
        <h3 className="text-text-primary font-semibold mb-1">{title}</h3>
        <p className="text-text-secondary text-sm max-w-sm">{message}</p>
        {details && (
          <ul className="mt-3 text-left text-sm text-text-muted space-y-1">
            {details.map((d, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-text-muted mt-0.5">•</span>
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

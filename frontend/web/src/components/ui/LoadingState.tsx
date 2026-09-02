/**
 * src/components/ui/LoadingState.tsx
 */
import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2 className="w-6 h-6 text-[rgb(var(--accent))] animate-spin" />
      <p className="text-xs text-[rgb(var(--text-muted))] font-mono">{message}</p>
    </div>
  );
}
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
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <Loader2 className="w-8 h-8 text-accent animate-spin" />
      <p className="text-text-secondary text-sm">{message}</p>
    </div>
  );
}

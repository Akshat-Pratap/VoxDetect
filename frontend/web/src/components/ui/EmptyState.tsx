/**
 * src/components/ui/EmptyState.tsx
 */
import React from 'react';
import { Inbox } from 'lucide-react';

interface Props {
  icon?: React.ReactNode;
  title?: string;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title = 'No data yet', message, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-12 h-12 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center text-text-muted">
        {icon ?? <Inbox className="w-6 h-6" />}
      </div>
      <div>
        <h3 className="text-text-secondary font-medium mb-1">{title}</h3>
        <p className="text-text-muted text-sm max-w-xs">{message}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

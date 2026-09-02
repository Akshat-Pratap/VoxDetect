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
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <div className="w-10 h-10 rounded-md bg-[var(--hover-bg)] border border-[rgb(var(--border-subtle))] flex items-center justify-center text-[rgb(var(--text-muted))]">
        {icon ?? <Inbox className="w-4 h-4" />}
      </div>
      <div>
        <h3 className="text-xs font-semibold text-[rgb(var(--text-primary))] mb-1">{title}</h3>
        <p className="text-[11px] text-[rgb(var(--text-muted))] max-w-xs">{message}</p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
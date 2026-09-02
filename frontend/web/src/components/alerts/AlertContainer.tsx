/**
 * src/components/alerts/AlertContainer.tsx
 * Fixed toast stack in the bottom-right corner (sonner-style position).
 * Newest toast sits lowest (nearest the corner); older ones stack above.
 */
import React from 'react';
import { useAlertContext } from '@/context/AlertContext';
import { AlertToast } from './AlertToast';

export function AlertContainer() {
  const { toasts, leavingIds, removeToast } = useAlertContext();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col-reverse items-end gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <AlertToast toast={t} leaving={leavingIds.includes(t.id)} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  );
}
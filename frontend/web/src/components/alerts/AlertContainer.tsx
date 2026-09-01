/**
 * src/components/alerts/AlertContainer.tsx
 */
import React from 'react';
import { useAlertContext } from '@/context/AlertContext';
import { AlertToast } from './AlertToast';

export function AlertContainer() {
  const { toasts, leavingIds, removeToast } = useAlertContext();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <AlertToast toast={t} leaving={leavingIds.includes(t.id)} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  );
}

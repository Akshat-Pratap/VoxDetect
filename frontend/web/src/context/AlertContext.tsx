/**
 * src/context/AlertContext.tsx
 * Global toast alert management.
 */
import React, { createContext, useCallback, useContext, useState } from 'react';
import type { ToastAlert } from '@/types';

interface AlertContextValue {
  toasts: ToastAlert[];
  leavingIds: string[];
  addToast: (toast: Omit<ToastAlert, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const AlertContext = createContext<AlertContextValue>({
  toasts: [],
  leavingIds: [],
  addToast: () => {},
  removeToast: () => {},
  clearAll: () => {},
});

const EXIT_ANIM_MS = 300; // must match the .alert-exit animation duration

// Auto-dismiss delay by type. Risk alerts stay long enough to assess; info and
// success linger a little so users can read the added detail line.
export const AUTO_CLOSE_MS: Record<ToastAlert['type'], number> = {
  critical_risk: 9000,
  high_risk: 8000,
  error: 6000,
  success: 5500,
  info: 6000,
};

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastAlert[]>([]);
  const [leavingIds, setLeavingIds] = useState<string[]>([]);

  // Mark a toast as "leaving" (play exit animation), then remove it after the
  // animation finishes. Used by both the manual dismiss (X) and auto-close.
  const removeToast = useCallback((id: string) => {
    setLeavingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setLeavingIds((prev) => prev.filter((x) => x !== id));
    }, EXIT_ANIM_MS);
  }, []);

  const addToast = useCallback((toast: Omit<ToastAlert, 'id' | 'timestamp'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newToast: ToastAlert = { ...toast, id, timestamp: Date.now() };
    setToasts((prev) => {
      // Keep max 5 toasts
      const next = [newToast, ...prev].slice(0, 5);
      return next;
    });

    // Auto-dismiss after a type-specific delay unless autoClose is false
    if (toast.autoClose !== false) {
      setTimeout(() => {
        removeToast(id);
      }, AUTO_CLOSE_MS[toast.type] ?? 4500);
    }
  }, [removeToast]);

  const clearAll = useCallback(() => {
    const allIds = toasts.map((t) => t.id);
    allIds.forEach(removeToast);
  }, [toasts, removeToast]);

  return (
    <AlertContext.Provider value={{ toasts, leavingIds, addToast, removeToast, clearAll }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlertContext() {
  return useContext(AlertContext);
}

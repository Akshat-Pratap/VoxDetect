/**
 * src/context/AlertContext.tsx
 * Global toast alert management.
 */
import React, { createContext, useCallback, useContext, useState } from 'react';
import type { ToastAlert } from '@/types';

interface AlertContextValue {
  toasts: ToastAlert[];
  addToast: (toast: Omit<ToastAlert, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const AlertContext = createContext<AlertContextValue>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
  clearAll: () => {},
});

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastAlert[]>([]);

  const addToast = useCallback((toast: Omit<ToastAlert, 'id' | 'timestamp'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newToast: ToastAlert = { ...toast, id, timestamp: Date.now() };
    setToasts((prev) => {
      // Keep max 5 toasts
      const next = [newToast, ...prev].slice(0, 5);
      return next;
    });

    // Auto-dismiss after 8 seconds unless autoClose is false
    if (toast.autoClose !== false) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 8000);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => setToasts([]), []);

  return (
    <AlertContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlertContext() {
  return useContext(AlertContext);
}

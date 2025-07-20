'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number; // in ms
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 3000) => {
      const id = crypto.randomUUID();
      setToasts((prev) => {
        const newToasts = [...prev, { id, message, type, duration }];
        // Limit max toasts to 5
        return newToasts.length > 5 ? newToasts.slice(1) : newToasts;
      });
    },
    []
  );

  // Handle auto-remove for each toast with cleanup
  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts.map(({ id, duration }) =>
      setTimeout(() => removeToast(id), duration)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [toasts, removeToast]);

  const value = useMemo(() => ({ toasts, addToast, removeToast }), [toasts, addToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-5 right-5 flex flex-col gap-2 z-[9999]">
        {toasts.map(({ id, message, type }) => (
          <div
            key={id}
            role="alert"
            aria-live="assertive"
            className={`rounded-md px-4 py-2 shadow-md text-white flex items-center justify-between gap-4 ${
              type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'
            }`}
          >
            <span>{message}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => removeToast(id)}
              className="text-white font-bold focus:outline-none focus:ring-2 focus:ring-white rounded"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';

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

  // One timer per toast, owned here so it can be cancelled on unmount.
  //
  // The previous version ran a single effect keyed on the whole `toasts` array,
  // which cleared and recreated **every** timer each time any toast was added
  // or removed. So a toast already 2.9s into its 3s life got a fresh 3s the
  // moment the next one appeared -- and the listing flow emits four in a row
  // ("Checking...", "Confirm the fee...", "Payment sent...", "listed"), so the
  // first one lived roughly twice its duration and the stack drifted further
  // out of sync the more there were.
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const removeToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 3000) => {
      const id = crypto.randomUUID();

      setToasts((prev) => {
        const next = [...prev, { id, message, type, duration }];
        // At most five on screen; the oldest goes first.
        return next.length > 5 ? next.slice(next.length - 5) : next;
      });

      // Scheduled once, when the toast is created, so its lifetime is its own.
      timers.current.set(
        id,
        setTimeout(() => removeToast(id), duration)
      );
    },
    [removeToast]
  );

  // Cancel anything still pending when the provider goes away.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ toasts, addToast, removeToast }), [toasts, addToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-5 right-5 flex flex-col gap-2 z-[9999]">
        {toasts.map(({ id, message, type }) => (
          <div
            key={id}
            // Only errors interrupt. Announcing every "Payment sent..." with
            // assertive talks over whatever the user is actually reading.
            role={type === 'error' ? 'alert' : 'status'}
            aria-live={type === 'error' ? 'assertive' : 'polite'}
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

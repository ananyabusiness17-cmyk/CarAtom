'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Toast = { id: number; message: string; tone: 'ok' | 'danger' };

type ToastContextValue = {
  push: (message: string, tone?: Toast['tone']) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-4), { id, message, tone }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 4200);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((item) => (
          <p
            key={item.id}
            role="status"
            className={`pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-sm ${
              item.tone === 'danger'
                ? 'border-danger bg-danger-soft text-danger'
                : 'border-border bg-surface text-strong'
            }`}
          >
            {item.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

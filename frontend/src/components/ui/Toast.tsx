import * as ToastPrimitive from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

type ToastInput = {
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error';
};

type ToastContextValue = {
  toast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

type ActiveToast = ToastInput & { id: number };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  const toast = (input: ToastInput) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...input, id }]);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            onOpenChange={(open) => {
              if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id));
            }}
            className={cn(
              'flex items-start gap-3 rounded-lg border bg-card p-4 pr-8 shadow-elevated',
              'data-[state=open]:animate-slide-up',
              'data-[state=closed]:animate-fade-in',
              t.variant === 'success' && 'border-[hsl(var(--success)/0.4)]',
              t.variant === 'error' && 'border-[hsl(var(--danger)/0.4)]',
              !t.variant && 'border-default',
            )}
          >
            <div className="flex-1">
              <ToastPrimitive.Title className="text-sm font-medium text-fg">
                {t.title}
              </ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="mt-1 text-xs text-fg-muted">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close className="absolute right-2 top-2 rounded-md p-1 text-fg-muted transition hover:bg-surface-hover hover:text-fg">
              <X className="h-3.5 w-3.5" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

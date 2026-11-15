import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ToastMessage } from '../types/finance';

interface ToastContainerProps {
  toasts: ToastMessage[];
}

export function ToastContainer({ toasts }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-50 flex flex-col-reverse gap-2 sm:bottom-5 sm:left-auto sm:right-5"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const styles =
          toast.type === 'success'
            ? 'bg-emerald-600 text-white'
            : toast.type === 'error'
            ? 'bg-rose-600 text-white'
            : 'bg-slate-900 text-white';

        const Icon =
          toast.type === 'success'
            ? CheckCircle2
            : toast.type === 'error'
            ? AlertCircle
            : Info;

        return (
          <div
            key={toast.id}
            className={`flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg sm:min-w-[260px] sm:max-w-sm ${styles}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}

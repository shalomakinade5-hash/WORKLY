import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import type { ToastMessage } from '../../types/index.ts';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg shadow-lg border text-sm transition-all duration-200 animate-in slide-in-from-bottom-2 ${
              isSuccess
                ? 'bg-[#202C39] text-[#F7F7F4] border-[#2A3A4B]'
                : isError
                ? 'bg-red-900 text-white border-red-700'
                : 'bg-[#202C39] text-[#F7F7F4] border-[#8293A5]'
            }`}
          >
            {isSuccess && <CheckCircle2 className="w-5 h-5 text-[#D5A34B] shrink-0 mt-0.5" />}
            {isError && <AlertCircle className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />}
            {!isSuccess && !isError && <Info className="w-5 h-5 text-[#8293A5] shrink-0 mt-0.5" />}

            <div className="flex-1 font-medium leading-relaxed">{toast.message}</div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-[#8293A5] hover:text-[#F7F7F4] p-0.5 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

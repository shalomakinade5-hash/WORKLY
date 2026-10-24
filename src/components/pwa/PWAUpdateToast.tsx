import React from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PWAUpdateToast: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Check for updates periodically (e.g. every hour)
        setInterval(() => {
          r.update().catch(() => {});
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('Workly Service Worker registration error:', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#202C39] text-[#F7F7F4] p-4 rounded-xl shadow-2xl border border-[#D5A34B]/40 animate-in slide-in-from-bottom-4 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#D5A34B]/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[#D5A34B]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-tight">Workly Update Available</h4>
            <span className="text-[10px] text-[#8293A5] block">A new version has been downloaded</span>
          </div>
        </div>
        <button
          onClick={() => setNeedRefresh(false)}
          className="text-[#8293A5] hover:text-[#F7F7F4] p-1 rounded transition-colors"
          aria-label="Dismiss update alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="mt-2.5 text-xs text-[#DCE1E5] leading-relaxed">
        Update to get the latest features and scheduling improvements. Your current unsaved progress will stay intact.
      </p>

      <div className="mt-3.5 flex items-center gap-2.5">
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D5A34B] hover:bg-[#c4923b] text-[#202C39] font-bold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Update Now</span>
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="px-3 py-1.5 rounded-lg bg-[#2A3A4B] hover:bg-[#35485E] text-[#DCE1E5] text-xs font-medium transition-colors cursor-pointer"
        >
          Later
        </button>
      </div>
    </div>
  );
};

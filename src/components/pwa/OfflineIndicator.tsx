import React, { useEffect, useState } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnectedBanner, setShowReconnectedBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedBanner(true);
      const timer = setTimeout(() => {
        setShowReconnectedBanner(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedBanner(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnectedBanner) {
    return null;
  }

  if (showReconnectedBanner) {
    return (
      <div
        role="status"
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#202C39] text-[#F7F7F4] text-xs font-semibold shadow-xl border border-green-500/40 animate-in fade-in slide-in-from-bottom-2 transition-all"
      >
        <CheckCircle2 className="w-4 h-4 text-green-400" />
        <span>Connected — Cloud sync active</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#202C39] text-[#F7F7F4] text-xs font-medium shadow-xl border border-[#D5A34B]/50 animate-in fade-in slide-in-from-bottom-2 transition-all"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D5A34B] opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D5A34B]"></span>
      </span>
      <div className="flex items-center gap-1.5">
        <WifiOff className="w-3.5 h-3.5 text-[#D5A34B]" />
        <span>Offline — Cached shell active. Cloud sync &amp; AI resume when reconnected.</span>
      </div>
    </div>
  );
};

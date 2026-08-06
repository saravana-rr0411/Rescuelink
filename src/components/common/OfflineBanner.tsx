import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [retrying, setRetrying] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualCheck = () => {
    setRetrying(true);
    setTimeout(() => {
      setIsOnline(navigator.onLine);
      setRetrying(false);
    }, 800);
  };

  if (isOnline) return null;

  return (
    <div className="sticky top-0 z-[2000] w-full bg-rose-900 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs font-bold animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <WifiOff className="w-4 h-4 text-rose-300 shrink-0" />
        <div className="truncate">
          <p className="font-extrabold text-white truncate">No Internet Connection</p>
          <p className="text-[10px] text-rose-200 font-medium truncate">
            Please check your network and try again.
          </p>
        </div>
      </div>

      <button
        onClick={handleManualCheck}
        disabled={retrying}
        className="px-3 py-1 bg-rose-700 hover:bg-rose-600 text-white text-[11px] font-extrabold rounded-lg shadow-xs flex items-center gap-1 shrink-0 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
        <span>Retry</span>
      </button>
    </div>
  );
};
